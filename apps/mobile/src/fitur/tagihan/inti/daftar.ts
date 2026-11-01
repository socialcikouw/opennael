import { tampilKampung } from "@opennael/format";
import type { KartuVM } from "./kartu";

/**
 * DAFTAR TAGIHAN — pemilahan kartu ke segmen & baris daftar. PURE.
 *
 * Segmen tetap sepanjang hari: Aktif (berjalan) · Macet · Droping (akad hari
 * ini, tanpa tombol). Kartu yang sudah ditagih hari ini (bayar/libur) turun
 * ringkas ke dasar segmen asalnya di bawah judul "Sudah ditagih"; Droping tak
 * punya. Di atasnya kartu dikelompokkan per kampung, urut rute kolektor.
 */
export type TabKerja = "aktif" | "macet" | "droping";

export const TAB_KERJA: readonly { nilai: TabKerja; label: string }[] = [
  { nilai: "aktif", label: "Berjalan" },
  { nilai: "macet", label: "Macet" },
  { nilai: "droping", label: "Droping" },
];

export interface Partisi {
  aktif: KartuVM[];
  macet: KartuVM[];
  droping: KartuVM[];
  sudah: { aktif: KartuVM[]; macet: KartuVM[] };
}

/** Satu lintasan: saring kata kunci + bagi ke ember segmen. Urutan masukan (rute) dipertahankan. */
export function pilah(semua: readonly KartuVM[], kunci: string): Partisi {
  const hasil: Partisi = { aktif: [], macet: [], droping: [], sudah: { aktif: [], macet: [] } };
  for (const vm of semua) {
    if (kunci && !vm.cari.includes(kunci)) continue;
    const segmen = vm.p.status === "macet" ? "macet" : "aktif";
    if (vm.ember === "droping") hasil.droping.push(vm);
    else if (vm.ember === "sudah") hasil.sudah[segmen].push(vm);
    else hasil[segmen].push(vm);
  }
  return hasil;
}

/** Jumlah di lencana segmen: yang masih perlu ditagih (Aktif, Macet) & droping hari ini. */
export function jumlahSegmen(p: Partisi): Record<TabKerja, number> {
  return { aktif: p.aktif.length, macet: p.macet.length, droping: p.droping.length };
}

export type Baris =
  | {
      jenis: "judul";
      id: string;
      sudah: boolean;
      /** Nama kelompok di judul kartu: "PULE BARAT". */
      nama: string;
      /** Jumlah nasabah di kelompok. */
      jumlah: number;
      /** Total angsuran kelompok (target tagih); null = tanpa uang ("Sudah ditagih"). */
      total: number | null;
      /** Kartu kelompok ini sedang dilipat (lihat `lipatKelompok`). */
      terlipat: boolean;
    }
  | {
      jenis: "kartu";
      id: string;
      vm: KartuVM;
      /** Kartu terakhir kelompoknya: rel pohon berhenti di sini. */
      terakhir: boolean;
    }
  | { jenis: "sudah"; id: string; vm: KartuVM };

/**
 * Kartu segmen → baris berjudul kampung: nama, jumlah nasabah, dan total
 * angsurannya (target tagih kampung itu). Urutan kelompok & kartu mengikuti
 * masukan — yaitu urutan rute yang diatur di Pengaturan (kampung yang belum
 * masuk rute di belakang); judulnya tak mencetak nomor rute. Kelompok "Sudah
 * ditagih" di dasar — SENGAJA hanya jumlah nasabah, tanpa uang hari ini.
 */
export function susunBaris(kartu: readonly KartuVM[], sudah: readonly KartuVM[]): Baris[] {
  const hasil: Baris[] = [];
  let awal = 0;
  while (awal < kartu.length) {
    const kampung = kartu[awal]?.p.nasabah.kampung ?? "";
    let akhir = awal;
    let total = 0;
    while (akhir < kartu.length && kartu[akhir]?.p.nasabah.kampung === kampung) {
      total += kartu[akhir]?.p.angsuran ?? 0;
      akhir++;
    }
    hasil.push({
      jenis: "judul",
      id: `judul:${kampung}`,
      sudah: false,
      nama: tampilKampung(kampung),
      jumlah: akhir - awal,
      total,
      terlipat: false,
    });
    for (let i = awal; i < akhir; i++) {
      const vm = kartu[i];
      if (vm) hasil.push({ jenis: "kartu", id: vm.id, vm, terakhir: i === akhir - 1 });
    }
    awal = akhir;
  }
  if (sudah.length > 0) {
    hasil.push({
      jenis: "judul",
      id: "judul:sudah",
      sudah: true,
      nama: "SUDAH DITAGIH",
      jumlah: sudah.length,
      total: null,
      terlipat: false,
    });
    for (const vm of sudah) hasil.push({ jenis: "sudah", id: `sudah:${vm.id}`, vm });
  }
  return hasil;
}

/**
 * Lipat kelompok: judul yang id-nya ada di `terlipat` tetap tampil (bertanda
 * `terlipat`), kartu di bawahnya disembunyikan sampai judul berikutnya.
 */
export function lipatKelompok(baris: readonly Baris[], terlipat: ReadonlySet<string>): Baris[] {
  const hasil: Baris[] = [];
  let sembunyi = false;
  for (const b of baris) {
    if (b.jenis === "judul") {
      sembunyi = terlipat.has(b.id);
      hasil.push(sembunyi ? { ...b, terlipat: true } : b);
    } else if (!sembunyi) {
      hasil.push(b);
    }
  }
  return hasil;
}

/** Total droping hari ini (semua, bukan yang tersaring cari): uang baru & bagian gulung. */
export function ringkasDroping(droping: readonly KartuVM[]): { baru: number; gulung: number } {
  let baru = 0;
  let gulung = 0;
  for (const vm of droping) {
    baru += vm.p.dropBaru;
    gulung += vm.p.dropGulung;
  }
  return { baru, gulung };
}
