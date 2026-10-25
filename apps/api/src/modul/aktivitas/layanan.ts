import type { Aktivitas, JejakRiwayat, Peran } from "@opennael/contracts";
import { rentangTanggalKantor } from "@opennael/domain";
import { and, desc, eq, gte, inArray, isNotNull, lt, ne, or } from "drizzle-orm";
import { type AnyPgColumn, alias } from "drizzle-orm/pg-core";
import type { Db } from "../../db/klien";
import {
  biayaTakTerduga,
  hariKolektor,
  kantor,
  koreksiTabungan,
  mutasiKasKantor,
  nasabah,
  pembayaranGaji,
  penarikanTabungan,
  pencocokanKas,
  pengguna,
  pinjaman,
  riwayatPerubahan,
  serahTerimaKas,
  type tabelBerjejakEnum,
  transaksi,
  transferSetoran,
} from "../../db/skema";
import { wajibPeran } from "../../peran";
import type { Aktor } from "../auth/token";
import { bacaKalender } from "../lapangan/gerbang";

/**
 * AKTIVITAS — siapa melakukan apa pada satu tanggal kantor. Menggabungkan
 * `riwayat_perubahan` (data ditimpa/dihapus) dengan baris tabel uang yang
 * dicatat atau dibatalkan hari itu. Pembatalan uang hanya di hari yang sama,
 * jadi saringan `tanggal` tiap tabel menangkap keduanya. Pengawas tidak
 * melihat kas kantor (mutasi & buku kas) — bacaannya milik bos.
 */
export interface AktivitasDeps {
  db: Db;
  sekarang?: () => Date;
}

type Kejadian = Omit<Aktivitas, "waktu" | "pelaku" | "peran"> & {
  waktu: Date;
  pelakuId: string;
};

/** Kolom pencatatan & pembatalan baris uang. */
type BarisUang = {
  id: string;
  dibuatAt: Date;
  dibuatOleh: string;
  dibatalkanAt: Date | null;
  dibatalkanOleh: string | null;
  alasanBatal: string | null;
};

const kecilAwal = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Satu baris uang → kejadian pencatatannya, ditambah pembatalannya bila ada. */
function catatDanBatal(
  b: BarisUang,
  tabel: string,
  kejadian: string,
  isi: { ringkasan: string; nominal: number; alasan?: string | null },
): Kejadian[] {
  const rujukan = { tabel, id: b.id };
  const hasil: Kejadian[] = [
    {
      waktu: b.dibuatAt,
      pelakuId: b.dibuatOleh,
      kejadian,
      ringkasan: isi.ringkasan,
      nominal: isi.nominal,
      alasan: isi.alasan ?? null,
      rujukan,
    },
  ];
  if (b.dibatalkanAt && b.dibatalkanOleh) {
    hasil.push({
      waktu: b.dibatalkanAt,
      pelakuId: b.dibatalkanOleh,
      kejadian: `batal_${kejadian}`,
      ringkasan: `Batal ${kecilAwal(isi.ringkasan)}`,
      nominal: isi.nominal,
      alasan: b.alasanBatal,
      rujukan,
    });
  }
  return hasil;
}

/** Tiga kolom batal sebuah tabel uang untuk `select`. */
const batalnya = <T extends Record<"dibatalkanAt" | "dibatalkanOleh" | "alasanBatal", AnyPgColumn>>(
  t: T,
) => ({
  dibatalkanAt: t.dibatalkanAt,
  dibatalkanOleh: t.dibatalkanOleh,
  alasanBatal: t.alasanBatal,
});

const LABEL_AKSI: Record<string, string> = {
  ubah_kas_awal: "Ubah kas awal",
  perbaiki_nasabah: "Perbaiki data nasabah",
  pindah_pemegang: "Pindah pemegang nasabah",
  rekam_lokasi: "Rekam titik rumah",
  blokir: "Blokir nasabah",
  batal_pemutihan: "Batal pemutihan pinjaman",
  atur_rem: "Pasang rem pinjaman",
  lepas_rem: "Lepas rem pinjaman",
  ubah_kantor: "Ubah profil kantor",
  timpa_pekan_kerja: "Ubah pekan kerja",
  deklarasi_libur_kantor: "Tetapkan libur kantor",
  batal_libur_kantor: "Batal libur kantor",
  timpa_tarif_gaji: "Ubah tarif gaji",
  ubah_pengguna: "Ubah data karyawan",
  nonaktifkan: "Nonaktifkan karyawan",
  aktifkan: "Aktifkan karyawan",
  simpan_rute: "Simpan rute",
  buat_pengguna: "Tambah karyawan",
  setujui_tautan: "Setujui tautan HP",
};

const LABEL_MUTASI: Record<string, string> = {
  setor_modal: "Setor modal",
  tarik_modal: "Tarik modal",
  biaya_kantor: "Biaya kantor",
  pindah_akun: "Pindah akun",
  lain_masuk: "Pemasukan lain",
  lain_keluar: "Pengeluaran lain",
};

const LABEL_PEMUTIHAN: Record<string, string> = {
  macet_lama: "Macet lama",
  meninggal: "Meninggal",
  lainnya: "Lainnya",
};

/** Tabel jejak yang `baris_id`-nya menunjuk orang (karyawan) atau nasabah/pinjaman. */
const SASARAN_PENGGUNA = new Set(["pengguna", "rute_kolektor"]);

const sasaran = alias(pengguna, "sasaran");

export function buatLayananAktivitas(deps: AktivitasDeps) {
  const sekarang = deps.sekarang ?? (() => new Date());

  /** Nama & peran untuk sekumpulan id karyawan kantor. */
  async function bacaOrang(kantorId: string, ids: string[]) {
    if (ids.length === 0) return new Map<string, { nama: string; peran: Peran }>();
    const baris = await deps.db
      .select({ id: pengguna.id, nama: pengguna.nama, peran: pengguna.peran })
      .from(pengguna)
      .where(and(eq(pengguna.kantorId, kantorId), inArray(pengguna.id, ids)));
    return new Map(baris.map((b) => [b.id, { nama: b.nama, peran: b.peran }]));
  }

  /** Jejak riwayat dalam rentang waktu → kejadian, dengan nama sasaran bila dikenal. */
  async function dariRiwayat(kantorId: string, mulai: Date, selesai: Date, bos: boolean) {
    const db = deps.db;
    const jejak = await db
      .select({
        id: riwayatPerubahan.id,
        tabel: riwayatPerubahan.tabel,
        barisId: riwayatPerubahan.barisId,
        aksi: riwayatPerubahan.aksi,
        alasan: riwayatPerubahan.alasanPerubahan,
        pelakuId: riwayatPerubahan.pelakuId,
        waktu: riwayatPerubahan.dibuatAt,
      })
      .from(riwayatPerubahan)
      .where(
        and(
          eq(riwayatPerubahan.kantorId, kantorId),
          gte(riwayatPerubahan.dibuatAt, mulai),
          lt(riwayatPerubahan.dibuatAt, selesai),
          bos ? undefined : ne(riwayatPerubahan.tabel, "buku_kas"),
        ),
      );
    const idDari = (tabel: string) => [
      ...new Set(jejak.filter((j) => j.tabel === tabel).map((j) => j.barisId)),
    ];
    const idPengguna = [
      ...new Set(jejak.filter((j) => SASARAN_PENGGUNA.has(j.tabel)).map((j) => j.barisId)),
    ];
    const nama = new Map<string, string>();
    for (const [id, o] of await bacaOrang(kantorId, idPengguna)) nama.set(id, o.nama);
    const idNasabah = idDari("nasabah");
    if (idNasabah.length) {
      const baris = await db
        .select({ id: nasabah.id, nama: nasabah.nama })
        .from(nasabah)
        .where(and(eq(nasabah.kantorId, kantorId), inArray(nasabah.id, idNasabah)));
      for (const b of baris) nama.set(b.id, b.nama);
    }
    const idPinjaman = idDari("pinjaman");
    if (idPinjaman.length) {
      const baris = await db
        .select({ id: pinjaman.id, nama: nasabah.nama })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(and(eq(pinjaman.kantorId, kantorId), inArray(pinjaman.id, idPinjaman)));
      for (const b of baris) nama.set(b.id, b.nama);
    }
    return jejak.map(
      (j): Kejadian => ({
        waktu: j.waktu,
        pelakuId: j.pelakuId,
        kejadian: j.aksi,
        ringkasan: [LABEL_AKSI[j.aksi] ?? j.aksi.replaceAll("_", " "), nama.get(j.barisId)]
          .filter(Boolean)
          .join(" "),
        nominal: null,
        alasan: j.alasan,
        rujukan: { tabel: j.tabel, id: j.barisId },
      }),
    );
  }

  /** Baris tabel uang bertanggal `tanggal` (dicatat atau dibatalkan hari itu) → kejadian. */
  async function dariUang(
    kantorId: string,
    tanggal: string,
    mulai: Date,
    selesai: Date,
    bos: boolean,
  ) {
    const db = deps.db;
    const [
      akad,
      putih,
      batalSetoran,
      transfer,
      terima,
      biaya,
      mutasi,
      gaji,
      tarik,
      koreksi,
      cocok,
    ] = await Promise.all([
      db
        .select({
          id: pinjaman.id,
          dibuatAt: pinjaman.dibuatAt,
          dibuatOleh: pinjaman.dibuatOleh,
          ...batalnya(pinjaman),
          nasabah: nasabah.nama,
          asal: pinjaman.asal,
          jenis: pinjaman.jenis,
          pinjamanKe: pinjaman.pinjamanKe,
          pokok: pinjaman.pokok,
          saldoAwal: pinjaman.saldoAwal,
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(pinjaman.kantorId, kantorId),
            // Akad lapangan pada tanggal akadnya; salinan migrasi pada hari disalin.
            or(
              and(ne(pinjaman.asal, "migrasi"), eq(pinjaman.tanggalAkad, tanggal)),
              and(eq(pinjaman.asal, "migrasi"), eq(pinjaman.tanggalDisalin, tanggal)),
            ),
          ),
        ),
      db
        .select({
          id: pinjaman.id,
          waktu: pinjaman.diputihkanAt,
          pelakuId: pinjaman.diputihkanOleh,
          alasan: pinjaman.alasanPemutihan,
          keterangan: pinjaman.keteranganPemutihan,
          nasabah: nasabah.nama,
          saldo: pinjaman.saldo,
        })
        .from(pinjaman)
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(pinjaman.kantorId, kantorId),
            gte(pinjaman.diputihkanAt, mulai),
            lt(pinjaman.diputihkanAt, selesai),
          ),
        ),
      db
        .select({
          id: transaksi.id,
          waktu: transaksi.dibatalkanAt,
          pelakuId: transaksi.dibatalkanOleh,
          alasan: transaksi.alasanBatal,
          nasabah: nasabah.nama,
          setoranMurni: transaksi.setoranMurni,
          setoranPelunasan: transaksi.setoranPelunasan,
        })
        .from(transaksi)
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(
          and(
            eq(transaksi.kantorId, kantorId),
            eq(transaksi.tanggal, tanggal),
            isNotNull(transaksi.dibatalkanAt),
          ),
        ),
      db
        .select({
          id: transferSetoran.id,
          dibuatAt: transferSetoran.dibuatAt,
          dibuatOleh: transferSetoran.dibuatOleh,
          ...batalnya(transferSetoran),
          nominal: transferSetoran.nominal,
          nasabah: nasabah.nama,
        })
        .from(transferSetoran)
        .innerJoin(transaksi, eq(transaksi.id, transferSetoran.transaksiId))
        .innerJoin(pinjaman, eq(pinjaman.id, transaksi.pinjamanId))
        .innerJoin(nasabah, eq(nasabah.id, pinjaman.nasabahId))
        .where(and(eq(transferSetoran.kantorId, kantorId), eq(transaksi.tanggal, tanggal))),
      db
        .select({
          id: serahTerimaKas.id,
          dibuatAt: serahTerimaKas.dibuatAt,
          dibuatOleh: serahTerimaKas.diterimaOleh,
          ...batalnya(serahTerimaKas),
          tunaiDiterima: serahTerimaKas.tunaiDiterima,
          selisih: serahTerimaKas.selisihSetor,
          kolektor: sasaran.nama,
        })
        .from(serahTerimaKas)
        .innerJoin(hariKolektor, eq(hariKolektor.id, serahTerimaKas.hariKolektorId))
        .innerJoin(sasaran, eq(sasaran.id, hariKolektor.kolektorId))
        .where(and(eq(serahTerimaKas.kantorId, kantorId), eq(hariKolektor.tanggal, tanggal))),
      db
        .select({
          id: biayaTakTerduga.id,
          dibuatAt: biayaTakTerduga.dibuatAt,
          dibuatOleh: biayaTakTerduga.dibuatOleh,
          ...batalnya(biayaTakTerduga),
          nominal: biayaTakTerduga.nominal,
          keterangan: biayaTakTerduga.keterangan,
          kolektor: sasaran.nama,
        })
        .from(biayaTakTerduga)
        .innerJoin(sasaran, eq(sasaran.id, biayaTakTerduga.kolektorId))
        .where(and(eq(biayaTakTerduga.kantorId, kantorId), eq(biayaTakTerduga.tanggal, tanggal))),
      bos
        ? db
            .select({
              id: mutasiKasKantor.id,
              dibuatAt: mutasiKasKantor.dibuatAt,
              dibuatOleh: mutasiKasKantor.dibuatOleh,
              ...batalnya(mutasiKasKantor),
              jenis: mutasiKasKantor.jenis,
              nominal: mutasiKasKantor.nominal,
              keterangan: mutasiKasKantor.keterangan,
            })
            .from(mutasiKasKantor)
            .where(
              and(eq(mutasiKasKantor.kantorId, kantorId), eq(mutasiKasKantor.tanggal, tanggal)),
            )
        : Promise.resolve([]),
      db
        .select({
          id: pembayaranGaji.id,
          dibuatAt: pembayaranGaji.dibuatAt,
          dibuatOleh: pembayaranGaji.dibuatOleh,
          ...batalnya(pembayaranGaji),
          gajiBersih: pembayaranGaji.gajiBersih,
          periodeMulai: pembayaranGaji.periodeMulai,
          periodeSelesai: pembayaranGaji.periodeSelesai,
          kolektor: sasaran.nama,
        })
        .from(pembayaranGaji)
        .innerJoin(sasaran, eq(sasaran.id, pembayaranGaji.kolektorId))
        .where(
          and(eq(pembayaranGaji.kantorId, kantorId), eq(pembayaranGaji.tanggalBayar, tanggal)),
        ),
      db
        .select({
          id: penarikanTabungan.id,
          dibuatAt: penarikanTabungan.dibuatAt,
          dibuatOleh: penarikanTabungan.dibuatOleh,
          ...batalnya(penarikanTabungan),
          nominal: penarikanTabungan.nominal,
          alasan: penarikanTabungan.alasanPenarikan,
          nasabah: nasabah.nama,
        })
        .from(penarikanTabungan)
        .innerJoin(nasabah, eq(nasabah.id, penarikanTabungan.nasabahId))
        .where(
          and(eq(penarikanTabungan.kantorId, kantorId), eq(penarikanTabungan.tanggal, tanggal)),
        ),
      db
        .select({
          id: koreksiTabungan.id,
          waktu: koreksiTabungan.dibuatAt,
          pelakuId: koreksiTabungan.dibuatOleh,
          selisih: koreksiTabungan.selisih,
          alasan: koreksiTabungan.alasanKoreksi,
          nasabah: nasabah.nama,
        })
        .from(koreksiTabungan)
        .innerJoin(nasabah, eq(nasabah.id, koreksiTabungan.nasabahId))
        .where(and(eq(koreksiTabungan.kantorId, kantorId), eq(koreksiTabungan.tanggal, tanggal))),
      db
        .select({
          id: pencocokanKas.id,
          dibuatAt: pencocokanKas.dibuatAt,
          dibuatOleh: pencocokanKas.dicocokkanOleh,
          ...batalnya(pencocokanKas),
          akun: pencocokanKas.akun,
          selisih: pencocokanKas.selisih,
          keterangan: pencocokanKas.keterangan,
        })
        .from(pencocokanKas)
        .where(and(eq(pencocokanKas.kantorId, kantorId), eq(pencocokanKas.tanggal, tanggal))),
    ]);

    const hasil: Kejadian[] = [];
    for (const b of akad) {
      hasil.push(
        ...(b.asal === "migrasi"
          ? catatDanBatal(b, "pinjaman", "salin_pinjaman", {
              ringkasan: `Salin dari buku: ${b.jenis} ${b.nasabah} (pinjaman ke-${b.pinjamanKe})`,
              nominal: b.saldoAwal,
            })
          : catatDanBatal(b, "pinjaman", "akad", {
              ringkasan: `Akad ${b.asal} ${b.jenis} ${b.nasabah} (pinjaman ke-${b.pinjamanKe})`,
              nominal: b.pokok,
            })),
      );
    }
    for (const b of putih) {
      if (!b.waktu || !b.pelakuId) continue;
      hasil.push({
        waktu: b.waktu,
        pelakuId: b.pelakuId,
        kejadian: "pemutihan",
        ringkasan: `Putihkan pinjaman ${b.nasabah}`,
        nominal: b.saldo,
        alasan:
          [b.alasan && LABEL_PEMUTIHAN[b.alasan], b.keterangan].filter(Boolean).join(" — ") || null,
        rujukan: { tabel: "pinjaman", id: b.id },
      });
    }
    for (const b of batalSetoran) {
      if (!b.waktu || !b.pelakuId) continue;
      hasil.push({
        waktu: b.waktu,
        pelakuId: b.pelakuId,
        kejadian: "batal_setoran",
        ringkasan: `Batal setoran ${b.nasabah}`,
        nominal: b.setoranMurni + b.setoranPelunasan,
        alasan: b.alasan,
        rujukan: { tabel: "transaksi", id: b.id },
      });
    }
    for (const b of transfer) {
      hasil.push(
        ...catatDanBatal(b, "transfer_setoran", "transfer_setoran", {
          ringkasan: `Transfer setoran ${b.nasabah}`,
          nominal: b.nominal,
        }),
      );
    }
    for (const b of terima) {
      const selisih = b.selisih < 0 ? " — tekor" : b.selisih > 0 ? " — lebih setor" : "";
      hasil.push(
        ...catatDanBatal(b, "serah_terima_kas", "terima_kas", {
          ringkasan: `Terima setoran sore ${b.kolektor}${selisih}`,
          nominal: b.tunaiDiterima,
        }),
      );
    }
    for (const b of biaya) {
      hasil.push(
        ...catatDanBatal(b, "biaya_tak_terduga", "biaya_tak_terduga", {
          ringkasan: `Biaya tak terduga ${b.kolektor}: ${b.keterangan}`,
          nominal: b.nominal,
        }),
      );
    }
    for (const b of mutasi) {
      hasil.push(
        ...catatDanBatal(b, "mutasi_kas_kantor", "mutasi_kas", {
          ringkasan: `${LABEL_MUTASI[b.jenis] ?? b.jenis}: ${b.keterangan}`,
          nominal: b.nominal,
        }),
      );
    }
    for (const b of gaji) {
      hasil.push(
        ...catatDanBatal(b, "pembayaran_gaji", "bayar_gaji", {
          ringkasan: `Bayar gaji ${b.kolektor} ${b.periodeMulai} s.d. ${b.periodeSelesai}`,
          nominal: b.gajiBersih,
        }),
      );
    }
    for (const b of tarik) {
      hasil.push(
        ...catatDanBatal(b, "penarikan_tabungan", "tarik_tabungan", {
          ringkasan: `Tarik tabungan ${b.nasabah}`,
          nominal: b.nominal,
          alasan: b.alasan,
        }),
      );
    }
    for (const b of koreksi) {
      hasil.push({
        waktu: b.waktu,
        pelakuId: b.pelakuId,
        kejadian: "koreksi_tabungan",
        ringkasan: `Koreksi tabungan ${b.nasabah}`,
        nominal: b.selisih,
        alasan: b.alasan,
        rujukan: { tabel: "koreksi_tabungan", id: b.id },
      });
    }
    for (const b of cocok) {
      hasil.push(
        ...catatDanBatal(b, "pencocokan_kas", "cocokkan_kas", {
          ringkasan: `Cocokkan kas ${b.akun}`,
          nominal: b.selisih,
          alasan: b.keterangan,
        }),
      );
    }
    return hasil;
  }

  return {
    /** `GET /aktivitas` — terbaru dulu; bawaan hari ini. */
    async aktivitas(
      aktor: Aktor,
      saring: { tanggal?: string; pelakuId?: string },
    ): Promise<Aktivitas[]> {
      wajibPeran(aktor, "bos", "pengawas");
      const tanggal =
        saring.tanggal ?? (await bacaKalender(deps.db, aktor.kantorId, sekarang())).tanggal;
      const [k] = await deps.db
        .select({ zona: kantor.zonaWaktu })
        .from(kantor)
        .where(eq(kantor.id, aktor.kantorId))
        .limit(1);
      if (!k) throw new Error("kantor tidak ditemukan");
      const { mulai, selesai } = rentangTanggalKantor(tanggal, k.zona);
      const bos = aktor.peran === "bos";
      const semua = [
        ...(await dariRiwayat(aktor.kantorId, mulai, selesai, bos)),
        ...(await dariUang(aktor.kantorId, tanggal, mulai, selesai, bos)),
      ].filter((k) => !saring.pelakuId || k.pelakuId === saring.pelakuId);
      const orang = await bacaOrang(aktor.kantorId, [...new Set(semua.map((k) => k.pelakuId))]);
      return semua
        .sort((a, b) => b.waktu.getTime() - a.waktu.getTime())
        .map(({ waktu, pelakuId, ...isi }) => {
          const o = orang.get(pelakuId);
          return {
            waktu: waktu.toISOString(),
            pelaku: { id: pelakuId, nama: o?.nama ?? "?" },
            peran: o?.peran ?? "bos",
            ...isi,
          };
        });
    },

    /** `GET /riwayat` — jejak satu baris, terbaru dulu. */
    async riwayat(
      aktor: Aktor,
      saring: { tabel: (typeof tabelBerjejakEnum.enumValues)[number]; barisId: string },
    ): Promise<JejakRiwayat[]> {
      wajibPeran(aktor, "bos", "pengawas");
      const bos = aktor.peran === "bos";
      if (!bos && saring.tabel === "buku_kas") return [];
      const baris = await deps.db
        .select({
          waktu: riwayatPerubahan.dibuatAt,
          pelakuId: riwayatPerubahan.pelakuId,
          nama: pengguna.nama,
          peran: pengguna.peran,
          aksi: riwayatPerubahan.aksi,
          sebelum: riwayatPerubahan.sebelum,
          sesudah: riwayatPerubahan.sesudah,
          alasan: riwayatPerubahan.alasanPerubahan,
        })
        .from(riwayatPerubahan)
        .innerJoin(pengguna, eq(pengguna.id, riwayatPerubahan.pelakuId))
        .where(
          and(
            eq(riwayatPerubahan.kantorId, aktor.kantorId),
            eq(riwayatPerubahan.tabel, saring.tabel),
            eq(riwayatPerubahan.barisId, saring.barisId),
          ),
        )
        .orderBy(desc(riwayatPerubahan.dibuatAt));
      return baris.map((b) => ({
        waktu: b.waktu.toISOString(),
        pelaku: { id: b.pelakuId, nama: b.nama },
        peran: b.peran,
        aksi: b.aksi,
        sebelum: b.sebelum as Record<string, unknown> | null,
        sesudah: b.sesudah as Record<string, unknown> | null,
        alasan: b.alasan,
      }));
    },
  };
}

export type LayananAktivitas = ReturnType<typeof buatLayananAktivitas>;
