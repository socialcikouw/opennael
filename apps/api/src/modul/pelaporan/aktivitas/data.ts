import type { Aktivitas, Peran } from "@opennael/contracts";
import { and, eq, inArray } from "drizzle-orm";
import { type AnyPgColumn, alias } from "drizzle-orm/pg-core";
import type { Db } from "../../../platform/db/klien";
import { pengguna } from "../../../platform/db/skema";

/** Pembantu privat AKTIVITAS: bentuk kejadian, label ringkasan, dan nama karyawan. */

export type Kejadian = Omit<Aktivitas, "waktu" | "pelaku" | "peran"> & {
  waktu: Date;
  pelakuId: string;
};

/** Kolom pencatatan & pembatalan baris uang. */
export type BarisUang = {
  id: string;
  dibuatAt: Date;
  dibuatOleh: string;
  dibatalkanAt: Date | null;
  dibatalkanOleh: string | null;
  alasanBatal: string | null;
};

const kecilAwal = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Satu baris uang → kejadian pencatatannya, ditambah pembatalannya bila ada. */
export function catatDanBatal(
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
export const batalnya = <
  T extends Record<"dibatalkanAt" | "dibatalkanOleh" | "alasanBatal", AnyPgColumn>,
>(
  t: T,
) => ({
  dibatalkanAt: t.dibatalkanAt,
  dibatalkanOleh: t.dibatalkanOleh,
  alasanBatal: t.alasanBatal,
});

export const LABEL_AKSI: Record<string, string> = {
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

export const LABEL_MUTASI: Record<string, string> = {
  setor_modal: "Setor modal",
  tarik_modal: "Tarik modal",
  biaya_kantor: "Biaya kantor",
  pindah_akun: "Pindah akun",
  lain_masuk: "Pemasukan lain",
  lain_keluar: "Pengeluaran lain",
};

export const LABEL_PEMUTIHAN: Record<string, string> = {
  macet_lama: "Macet lama",
  meninggal: "Meninggal",
  lainnya: "Lainnya",
};

/** Tabel jejak yang `baris_id`-nya menunjuk orang (karyawan) atau nasabah/pinjaman. */
export const SASARAN_PENGGUNA = new Set(["pengguna", "rute_kolektor"]);

export const sasaran = alias(pengguna, "sasaran");

/** Nama & peran untuk sekumpulan id karyawan kantor. */
export async function bacaOrang(db: Db, kantorId: string, ids: string[]) {
  if (ids.length === 0) return new Map<string, { nama: string; peran: Peran }>();
  const baris = await db
    .select({ id: pengguna.id, nama: pengguna.nama, peran: pengguna.peran })
    .from(pengguna)
    .where(and(eq(pengguna.kantorId, kantorId), inArray(pengguna.id, ids)));
  return new Map(baris.map((b) => [b.id, { nama: b.nama, peran: b.peran }]));
}
