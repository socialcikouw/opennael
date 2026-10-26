import type { JenisPinjaman } from "@opennael/domain";
import { hariPekanDari } from "@opennael/domain";
import type { KartuVM } from "../tagihan/inti/kartu";

/**
 * DIREKTORI MODE SEMUA — seluruh pinjaman aktif ketiga jenis, hanya-baca
 * (tanpa transaksi; menagih dari mode jenisnya). Satu baris per pinjaman:
 * kemajuan, saldo, dan keadaan HARI INI. Disusun dari kartu Tagihan yang
 * sama, jadi tanpa tarikan data baru. PURE.
 */

/**
 * Keadaan hari ini, dilihat dari mode Semua:
 * baru (cair hari ini) · sudah (bayar) · libur · macet · belum (wajib, belum
 * ditagih) · hariini (tempoan jatuh tempo hari ini) · lewat (tempoan lewat
 * jatuh tempo) · nanti (tak ada kewajiban hari ini).
 */
export type KeadaanSemua =
  | "baru"
  | "sudah"
  | "libur"
  | "macet"
  | "belum"
  | "hariini"
  | "lewat"
  | "nanti";

export interface BarisSemua {
  id: string;
  jenis: JenisPinjaman;
  nama: string;
  /** "pule barat · ke-3" */
  subjudul: string;
  cari: string;
  /** "Angsuran 12 dari 24" / "Minggu 3 dari 10 · tiap Sen" / "Jatuh tempo 21 Okt". */
  kemajuan: string;
  /** 0–1: angsuran ke- ÷ tenor, atau hari berjalan ÷ jangka (tempoan). */
  progres: number;
  /** Hari lewat jatuh tempo (tempoan); 0 bila tidak lewat — bahan urutan mendesak. */
  hariLewat: number;
  saldo: number;
  keadaan: KeadaanSemua;
  keadaanTeks: string;
}

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function susunBarisSemua(vm: KartuVM): BarisSemua {
  const p = vm.p;
  let kemajuan: string;
  let progres = Math.min(p.angsuranKe / Math.max(p.tenor, 1), 1);
  if (p.jenis === "tempoan") {
    const t = vm.tempo;
    kemajuan = t ? `Jatuh tempo ${t.jatuhTempoTeks}` : "Sekali bayar";
    progres = t?.jalan ?? 0;
  } else if (p.jenis === "mingguan") {
    kemajuan = `Minggu ${Math.min(p.angsuranKe, p.tenor)} dari ${p.tenor} · tiap ${NAMA_HARI[hariPekanDari(p.tanggalAkad)]}`;
  } else {
    kemajuan = `Angsuran ${Math.min(p.angsuranKe, p.tenor)} dari ${p.tenor}`;
  }

  let keadaan: KeadaanSemua;
  let keadaanTeks: string;
  const sisa = vm.tempo?.sisaHari ?? null;
  if (vm.ember === "droping") {
    keadaan = "baru";
    keadaanTeks = "Baru cair";
  } else if (vm.ember === "sudah") {
    const libur = p.hariIni?.jenis === "libur";
    keadaan = libur ? "libur" : "sudah";
    keadaanTeks = libur ? "Diliburkan" : "Sudah ditagih";
  } else if (p.status === "macet") {
    keadaan = "macet";
    keadaanTeks = "Macet";
  } else if (sisa !== null) {
    keadaan = sisa < 0 ? "lewat" : sisa === 0 ? "hariini" : "nanti";
    keadaanTeks =
      sisa < 0 ? `Lewat ${-sisa} hari` : sisa === 0 ? "Jatuh tempo hari ini" : `H-${sisa}`;
  } else if (vm.wajib) {
    keadaan = "belum";
    keadaanTeks = "Belum ditagih";
  } else {
    keadaan = "nanti";
    keadaanTeks =
      p.jenis === "mingguan"
        ? `Tagih ${NAMA_HARI[hariPekanDari(p.tanggalAkad)]}`
        : "Tak wajib hari ini";
  }

  return {
    id: vm.id,
    jenis: p.jenis,
    nama: vm.nama,
    subjudul: `${p.nasabah.kampung.toLowerCase()} · ke-${p.pinjamanKe}`,
    cari: vm.cari,
    kemajuan,
    progres,
    hariLewat: sisa !== null && sisa < 0 ? -sisa : 0,
    saldo: p.saldo,
    keadaan,
    keadaanTeks,
  };
}

export type SaringanSemua = "semua" | "tagih" | JenisPinjaman | "macet" | "baru";

export const SARINGAN: readonly { nilai: SaringanSemua; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "tagih", label: "Perlu ditagih" },
  { nilai: "harian", label: "Harian" },
  { nilai: "mingguan", label: "Mingguan" },
  { nilai: "tempoan", label: "Tempoan" },
  { nilai: "macet", label: "Macet" },
  { nilai: "baru", label: "Baru cair" },
];

/** Perlu didatangi hari ini dan belum: wajib harian/mingguan + tempoan jatuh tempo/lewat. */
export const perluDitagih = (b: BarisSemua) =>
  b.keadaan === "belum" || b.keadaan === "hariini" || b.keadaan === "lewat";

function lolos(b: BarisSemua, s: SaringanSemua): boolean {
  switch (s) {
    case "semua":
      return true;
    case "tagih":
      return perluDitagih(b);
    case "macet":
    case "baru":
      return b.keadaan === s;
    default:
      return b.jenis === s;
  }
}

export type UrutanSemua = "rute" | "mendesak" | "saldo" | "nama";

export const URUTAN_SEMUA: readonly UrutanSemua[] = ["rute", "mendesak", "saldo", "nama"];

export const LABEL_URUTAN: Record<UrutanSemua, string> = {
  rute: "Rute",
  mendesak: "Paling mendesak",
  saldo: "Saldo terbesar",
  nama: "Nama A–Z",
};

/** Lewat jatuh tempo > macet > belum > jatuh tempo hari ini > lainnya. */
const BOBOT_MENDESAK: Record<KeadaanSemua, number> = {
  lewat: 0,
  macet: 1,
  belum: 2,
  hariini: 3,
  nanti: 4,
  baru: 5,
  libur: 6,
  sudah: 7,
};

/** Saring pil & kata kunci, lalu urutkan. "rute" = urutan masukan (rute → kampung → nama). */
export function saringSemua(
  baris: readonly BarisSemua[],
  saringan: SaringanSemua,
  kunci: string,
  urutan: UrutanSemua,
): BarisSemua[] {
  const hasil = baris.filter((b) => lolos(b, saringan) && (!kunci || b.cari.includes(kunci)));
  if (urutan === "saldo") hasil.sort((a, b) => b.saldo - a.saldo);
  else if (urutan === "nama") hasil.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  else if (urutan === "mendesak") {
    hasil.sort(
      (a, b) =>
        BOBOT_MENDESAK[a.keadaan] - BOBOT_MENDESAK[b.keadaan] ||
        b.hariLewat - a.hariLewat ||
        b.saldo - a.saldo,
    );
  }
  return hasil;
}

/** Angka per pil — tanpa kata kunci, supaya angka pil tak berkedip saat mengetik. */
export function jumlahSaringan(baris: readonly BarisSemua[]): Record<SaringanSemua, number> {
  const hasil: Record<SaringanSemua, number> = {
    semua: baris.length,
    tagih: 0,
    harian: 0,
    mingguan: 0,
    tempoan: 0,
    macet: 0,
    baru: 0,
  };
  for (const b of baris) {
    hasil[b.jenis]++;
    if (perluDitagih(b)) hasil.tagih++;
    if (b.keadaan === "macet") hasil.macet++;
    if (b.keadaan === "baru") hasil.baru++;
  }
  return hasil;
}
