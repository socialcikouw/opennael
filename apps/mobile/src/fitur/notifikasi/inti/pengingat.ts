import type { KartuTagih } from "@opennael/contracts";
import {
  geserTanggal,
  type JenisPinjaman,
  selisihHari,
  sudahJatuhTempo,
  wajibDitagihHariIni,
} from "@opennael/domain";
import { rupiah } from "@opennael/format";
import type { GerbangMutasi } from "../../lapangan/inti/gerbang-mutasi";

/**
 * PENGINGAT KOLEKTOR — pemberitahuan rinci yang SAMA di ketiga mode kerja
 * (Harian · Mingguan · Tempoan), begitu pula angka di lonceng: laporan kas
 * menunggu semua jenis, jadi kolektor di mode mana pun perlu tahu siapa saja
 * yang masih menahannya. Diturunkan dari gerbang lapangan (C4), daftar tagih,
 * dan hari kas kolektor; bukan notifikasi dari server (belum ada). PURE.
 *
 * Urutan: absen → kabar gerbang → yang belum ditagih per jenis (harian,
 * mingguan, tempoan jatuh tempo sekarang, tempoan lewat jatuh tempo) → kabar
 * tempoan jatuh tempo besok → Mutasi kas terbuka / laporan / kas diterima.
 */

export type JenisPengingat =
  | "absen"
  | "gerbang"
  | "belum"
  | "tempo-besok"
  | "tanpa-nasabah"
  | "mutasi-siap"
  | "laporan"
  | "kas-diterima";

export interface NasabahPengingat {
  id: string;
  nama: string;
  kampung: string;
  /** Mis. "Rp 50.000", "Macet · Rp 50.000", "Lewat 3 hari · Rp 1.250.000". */
  keterangan: string;
}

export interface Pengingat {
  /** Unik dalam satu daftar — kunci render. */
  kunci: string;
  jenis: JenisPengingat;
  nada: "kuning" | "merah" | "hijau";
  judul: string;
  isi: string | null;
  /** Jenis pinjaman yang dituju tombol "Tagih di mode …"; null = tanpa tombol mode. */
  jenisPinjaman: JenisPinjaman | null;
  nasabah: NasabahPengingat[];
  /** Menunggu tindakan kolektor (dihitung di lonceng); false = hanya kabar. */
  tindakan: boolean;
}

export interface BahanPengingat {
  /** Gerbang lapangan (hasil `bacaGerbang`). */
  gerbang: {
    buka: boolean;
    perluAbsen: boolean;
    judul?: string | undefined;
    isi?: string | undefined;
  };
  tanggal: string;
  /** Daftar tagih; null = belum dimuat. */
  pinjaman: readonly KartuTagih[] | null;
  gerbangMutasi: GerbangMutasi;
  /** Jam laporan dibuka (sudah diformat, mis. "15.20"); null = belum dibuka. */
  laporanJam: string | null;
  /** Tunai yang harus disetor (aturan-usaha I1); null = belum diketahui. */
  tunaiSeharusnya: number | null;
  /** Hasil serah terima; null = kas belum diterima kasir. */
  serahTerima: { tunaiDiterima: number; selisihSetor: number } | null;
}

const MUTASI_TERKUNCI = "Mutasi kas terkunci sampai semuanya dicatat.";

function keterangan(p: KartuTagih, tanggal: string): string {
  if (p.jenis === "tempoan") {
    const lewat = p.jatuhTempo ? selisihHari(p.jatuhTempo, tanggal) : 0;
    return lewat > 0 ? `Lewat ${lewat} hari · ${rupiah(p.saldo)}` : rupiah(p.saldo);
  }
  return p.status === "macet" ? `Macet · ${rupiah(p.angsuran)}` : rupiah(p.angsuran);
}

const nasabahDari = (daftar: readonly KartuTagih[], tanggal: string): NasabahPengingat[] =>
  daftar.map((p) => ({
    id: p.id,
    nama: p.nasabah.nama,
    kampung: p.nasabah.kampung,
    keterangan: keterangan(p, tanggal),
  }));

/** Yang belum ditagih per kelompok, urut daftar tagih (rute). */
function belumPerKelompok(daftar: readonly KartuTagih[], tanggal: string) {
  const belum = daftar.filter((p) => !p.hariIni && wajibDitagihHariIni(p, tanggal));
  const tempoan = belum.filter((p) => p.jenis === "tempoan");
  return {
    harian: belum.filter((p) => p.jenis === "harian"),
    mingguan: belum.filter((p) => p.jenis === "mingguan"),
    tempoSekarang: tempoan.filter((p) => p.jatuhTempo === tanggal),
    tempoLewat: tempoan.filter((p) => p.jatuhTempo !== tanggal),
  };
}

export function susunPengingat(b: BahanPengingat): Pengingat[] {
  const hasil: Pengingat[] = [];
  const kabar = (
    jenis: JenisPengingat,
    nada: Pengingat["nada"],
    judul: string,
    isi: string | null,
    tindakan: boolean,
  ) =>
    hasil.push({
      kunci: jenis,
      jenis,
      nada,
      judul,
      isi,
      jenisPinjaman: null,
      nasabah: [],
      tindakan,
    });

  if (b.gerbang.perluAbsen) {
    kabar(
      "absen",
      "kuning",
      "Belum absen",
      "Absen pagi dulu supaya transaksi hari ini bisa dicatat.",
      true,
    );
  } else if (b.gerbang.judul && !b.laporanJam) {
    kabar("gerbang", "kuning", b.gerbang.judul, b.gerbang.isi ?? null, false);
  }

  // Daftar tagihan hanya selagi lapangan terbuka (libur kantor, di luar jam: tak diributkan).
  if (b.gerbang.buka && b.pinjaman) {
    const k = belumPerKelompok(b.pinjaman, b.tanggal);
    const kelompok: [string, JenisPinjaman, KartuTagih[], string][] = [
      ["harian", "harian", k.harian, "Nasabah harian yang belum ditagih"],
      ["mingguan", "mingguan", k.mingguan, "Nasabah mingguan yang belum ditagih"],
      ["tempo-sekarang", "tempoan", k.tempoSekarang, "Nasabah tempoan jatuh tempo sekarang"],
      ["tempo-lewat", "tempoan", k.tempoLewat, "Nasabah tempoan lewat jatuh tempo"],
    ];
    for (const [kunci, jenis, daftar, judul] of kelompok) {
      if (daftar.length === 0) continue;
      const isi =
        jenis === "tempoan"
          ? `Tagih pelunasannya, atau liburkan dengan alasan bila belum ada uang. ${MUTASI_TERKUNCI}`
          : jenis === "mingguan"
            ? `Hari ini hari tagih mereka — bayar atau libur. ${MUTASI_TERKUNCI}`
            : `Bayar atau libur. ${MUTASI_TERKUNCI}`;
      hasil.push({
        kunci: `belum-${kunci}`,
        jenis: "belum",
        nada: kunci === "tempo-lewat" ? "merah" : "kuning",
        judul: `${judul}: ${daftar.length}`,
        isi,
        jenisPinjaman: jenis,
        nasabah: nasabahDari(daftar, b.tanggal),
        tindakan: true,
      });
    }

    // Kabar sehari lebih awal: tempoan yang jatuh tempo besok (belum wajib hari ini).
    const besok = geserTanggal(b.tanggal, 1);
    const tempoBesok = b.pinjaman.filter(
      (p) => p.jenis === "tempoan" && p.jatuhTempo === besok && !sudahJatuhTempo(p, b.tanggal),
    );
    if (tempoBesok.length > 0) {
      hasil.push({
        kunci: "tempo-besok",
        jenis: "tempo-besok",
        nada: "kuning",
        judul: `Nasabah tempoan jatuh tempo besok: ${tempoBesok.length}`,
        isi: "Ingatkan mereka hari ini supaya pelunasannya siap besok.",
        jenisPinjaman: "tempoan",
        nasabah: nasabahDari(tempoBesok, b.tanggal),
        tindakan: false,
      });
    }

    if (b.gerbangMutasi === "belum-ada-nasabah") {
      kabar(
        "tanpa-nasabah",
        "kuning",
        "Belum ada nasabah untuk ditagih",
        "Catat akad baru dengan tombol +. Mutasi kas terbuka sesudah ada catatan hari ini.",
        false,
      );
    } else if (b.gerbangMutasi === "siap") {
      kabar(
        "mutasi-siap",
        "hijau",
        "Semua nasabah sudah ditagih — Mutasi kas terbuka",
        "Periksa arus kas hari ini di Mutasi, lalu buka laporan dan serahkan tunai ke kasir.",
        true,
      );
    }
  }

  if (b.laporanJam && !b.serahTerima) {
    kabar(
      "laporan",
      "hijau",
      `Laporan dibuka pukul ${b.laporanJam}`,
      b.tunaiSeharusnya !== null
        ? `Serahkan tunai ${rupiah(b.tunaiSeharusnya)} ke kasir.`
        : "Serahkan tunai hari ini ke kasir.",
      true,
    );
  }
  if (b.serahTerima) {
    const s = b.serahTerima.selisihSetor;
    kabar(
      "kas-diterima",
      s < 0 ? "merah" : "hijau",
      s < 0
        ? `Kas diterima — tekor ${rupiah(-s)}`
        : s > 0
          ? `Kas diterima — lebih setor ${rupiah(s)}`
          : "Kas diterima — pas",
      `Kasir menerima ${rupiah(b.serahTerima.tunaiDiterima)}. Hari ini selesai.`,
      false,
    );
  }
  return hasil;
}

/** Banyaknya pengingat yang menunggu tindakan — angka di lonceng, sama di semua mode kerja. */
export const jumlahTindakan = (pengingat: readonly Pengingat[]): number =>
  pengingat.filter((p) => p.tindakan).length;
