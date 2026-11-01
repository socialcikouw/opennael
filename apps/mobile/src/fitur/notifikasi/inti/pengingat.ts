/**
 * PENGINGAT KOLEKTOR — apa yang perlu diketahui atau dikerjakan sekarang,
 * diturunkan dari gerbang lapangan (C4) dan daftar tagih hari ini; bukan
 * notifikasi dari server (belum ada). Murni tanpa React: diuji `bun test`.
 */

export interface BahanPengingat {
  /** Gerbang lapangan (hasil `bacaGerbang`): penjelasan mengapa lapangan tutup / perlu absen. */
  gerbang: {
    buka: boolean;
    perluAbsen: boolean;
    judul?: string | undefined;
    isi?: string | undefined;
  };
  /** Nama nasabah wajib tagih yang belum dicatat; null = daftar tagih belum dimuat. */
  belum: readonly string[] | null;
}

export type JenisPengingat = "absen" | "gerbang" | "belum" | "laporan";

export interface Pengingat {
  jenis: JenisPengingat;
  judul: string;
  isi: string | null;
  /** Menunggu tindakan kolektor (dihitung di penanda tab); false = hanya kabar. */
  tindakan: boolean;
}

/** Berapa nama disebut di teks "belum dicatat" sebelum diringkas "…". */
const NAMA_DISEBUT = 3;

/**
 * Urut dari yang paling mendesak. Belum absen = formulir absen; gerbang tertutup
 * (libur, di luar jam kerja, …) = kabar saja; lapangan terbuka = sisa tagihan
 * wajib, atau laporan yang sudah boleh dibuka.
 */
export function susunPengingat({ gerbang, belum }: BahanPengingat): Pengingat[] {
  const hasil: Pengingat[] = [];
  if (gerbang.perluAbsen) {
    hasil.push({
      jenis: "absen",
      judul: "Belum absen",
      isi: "Absen pagi dulu supaya transaksi hari ini bisa dicatat.",
      tindakan: true,
    });
  } else if (gerbang.judul) {
    hasil.push({
      jenis: "gerbang",
      judul: gerbang.judul,
      isi: gerbang.isi ?? null,
      tindakan: false,
    });
  }
  if (gerbang.buka && belum) {
    if (belum.length > 0) {
      const nama = `${belum.slice(0, NAMA_DISEBUT).join(", ")}${belum.length > NAMA_DISEBUT ? ", …" : ""}`;
      hasil.push({
        jenis: "belum",
        judul: `Masih ${belum.length} nasabah belum dicatat`,
        isi: `${nama} — catat setoran atau libur dulu, baru laporan bisa dibuka.`,
        tindakan: true,
      });
    } else {
      hasil.push({
        jenis: "laporan",
        judul: "Semua tagihan wajib sudah dicatat",
        isi: "Laporan hari ini sudah bisa dibuka.",
        tindakan: true,
      });
    }
  }
  return hasil;
}

/** Banyaknya pengingat yang menunggu tindakan — angka di tab Notifikasi. */
export const jumlahTindakan = (pengingat: readonly Pengingat[]): number =>
  pengingat.filter((p) => p.tindakan).length;
