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
  | { jenis: "judul"; id: string; label: string; ringkas: string; rute: string; sudah: boolean }
  | { jenis: "kartu"; id: string; vm: KartuVM; rute: string }
  | { jenis: "sudah"; id: string; vm: KartuVM; rute: string };

/** 500000 → "500K" — total angsuran kelompok (target tagih kampung itu). */
const ribuanK = (n: number) => `${Math.round(n / 1000).toLocaleString("id-ID")}K`;

/**
 * Kartu segmen (urut rute) → baris berjudul kampung: "Rute 1 - PULE BARAT"
 * · "10 = 500K" (jumlah nasabah = total angsurannya). Kampung yang belum
 * masuk rute: "Belum diatur - <KAMPUNG>". Kelompok "Sudah ditagih" di dasar —
 * SENGAJA hanya jumlah nasabah, tanpa uang hari ini.
 */
export function susunBaris(kartu: readonly KartuVM[], sudah: readonly KartuVM[]): Baris[] {
  const hasil: Baris[] = [];
  let awal = 0;
  while (awal < kartu.length) {
    const kampung = kartu[awal]?.p.nasabah.kampung ?? "";
    const ruteKe = kartu[awal]?.p.ruteKe ?? null;
    let akhir = awal;
    let total = 0;
    while (akhir < kartu.length && kartu[akhir]?.p.nasabah.kampung === kampung) {
      total += kartu[akhir]?.p.angsuran ?? 0;
      akhir++;
    }
    const label = `${ruteKe !== null ? `Rute ${ruteKe}` : "Belum diatur"} - ${kampung.toUpperCase()}`;
    const ringkas = `${akhir - awal} = ${ribuanK(total)}`;
    const rute = `${label} : ${ringkas}`;
    hasil.push({ jenis: "judul", id: `judul:${kampung}`, label, ringkas, rute, sudah: false });
    for (let i = awal; i < akhir; i++) {
      const vm = kartu[i];
      if (vm) hasil.push({ jenis: "kartu", id: vm.id, vm, rute });
    }
    awal = akhir;
  }
  if (sudah.length > 0) {
    const label = "Sudah ditagih";
    const ringkas = `${sudah.length} nasabah`;
    const rute = `${label} : ${ringkas}`;
    hasil.push({ jenis: "judul", id: "judul:sudah", label, ringkas, rute, sudah: true });
    for (const vm of sudah) hasil.push({ jenis: "sudah", id: `sudah:${vm.id}`, vm, rute });
  }
  return hasil;
}

/**
 * Kemajuan hari ini (tanpa saringan cari): yang dibayar, yang diliburkan, dan
 * sisa wajib. Hanya jumlah nasabah — uang hari ini sengaja tak dicetak.
 */
export function kemajuan(semua: readonly KartuVM[]): {
  bayar: number;
  libur: number;
  sisa: number;
} {
  let bayar = 0;
  let libur = 0;
  let sisa = 0;
  for (const vm of semua) {
    if (vm.p.hariIni?.jenis === "angsuran") bayar++;
    else if (vm.p.hariIni?.jenis === "libur") libur++;
    else if (vm.wajib) sisa++;
  }
  return { bayar, libur, sisa };
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

export interface LompatRute {
  id: string;
  label: string;
  jumlah: number;
  /** Indeks baris judul — sasaran gulungan. */
  indeks: number;
  rute: string;
  sudah: boolean;
}

/** Judul-judul kelompok di daftar yang sedang tampil — isi lembar "Lompat ke rute". */
export function daftarLompat(baris: readonly Baris[]): LompatRute[] {
  const hasil: LompatRute[] = [];
  baris.forEach((b, indeks) => {
    if (b.jenis === "judul") {
      hasil.push({ id: b.id, label: b.label, jumlah: 0, indeks, rute: b.rute, sudah: b.sudah });
    } else {
      const terakhir = hasil[hasil.length - 1];
      if (terakhir) terakhir.jumlah++;
    }
  });
  return hasil;
}
