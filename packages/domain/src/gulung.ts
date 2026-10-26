import { type JenisPinjaman, type SyaratAkad, syaratAkad } from "./akad";
import { GalatAturan, wajib } from "./galat";

export type JenisGulung = "naik" | "tetap" | "turun";

export interface PinjamanAsal {
  jenis: JenisPinjaman;
  status: "berjalan" | "macet" | "lunas" | "digulung" | "batal" | "diputihkan";
  pokok: number;
  saldo: number;
  pinjamanKe: number;
  /** Angsuran yang sudah lunas (kolom turunan `angsuran_ke`). */
  angsuranKe: number;
}

/** Rem bos yang berlaku untuk gulung ini — gabungan lapis kantor, kolektor, nasabah. */
export interface RemGulung {
  gulungDikunci: boolean;
  naikDikunci: boolean;
  /** Alasan lapis paling spesifik yang mengunci, bila ada. */
  alasan?: string | null;
}

export interface RencanaGulung {
  jenisGulung: JenisGulung;
  /** Syarat akad pinjaman penerus (jenisnya sama dengan asal — E1). */
  syarat: SyaratAkad;
  saldoLama: number;
  /** Tunai bersih ke nasabah (E6). */
  pencairan: number;
  dropBaru: number;
  dropGulung: number;
  pokokBerkurang: number;
}

/** E4. Pinjaman ke-1 s/d ke-3 mulai angsuran 12; ke-4 dst mulai angsuran 10. */
export const AMBANG_GULUNG_HARIAN = { pinjamanAwalMaks: 3, awal: 12, lanjutan: 10 } as const;

/** E4. Angsuran ke- terendah yang boleh digulung untuk pinjaman harian ke-`pinjamanKe`. */
export function nomorGulungMinimal(pinjamanKe: number): number {
  return pinjamanKe <= AMBANG_GULUNG_HARIAN.pinjamanAwalMaks
    ? AMBANG_GULUNG_HARIAN.awal
    : AMBANG_GULUNG_HARIAN.lanjutan;
}

/**
 * Sinyal gulung di kartu kolektor: boleh · belum (harian di bawah ambang E4)
 * · terkunci (selesai, atau harian macet). Tanpa rem bos (E3) dan tanpa syarat
 * yang bergantung pokok baru (naik pertama, E6) — itu dinilai `hitungGulung`
 * saat pokoknya diketik.
 */
export type StatusGulung = "boleh" | "belum" | "terkunci";

export function statusGulung(p: {
  jenis: PinjamanAsal["jenis"];
  status: PinjamanAsal["status"];
  pinjamanKe: number;
  angsuranKe: number;
}): StatusGulung {
  const aktif = p.status === "berjalan" || p.status === "macet";
  if (p.jenis !== "harian") return aktif ? "boleh" : "terkunci"; // E5
  if (p.status !== "berjalan") return "terkunci";
  return p.angsuranKe >= nomorGulungMinimal(p.pinjamanKe) ? "boleh" : "belum";
}

const pesanRem = (dasar: string, alasan?: string | null) =>
  alasan ? `${dasar} dikunci bos: ${alasan}` : `${dasar} sedang dikunci bos`;

/** GULUNG — docs/aturan-usaha.md bagian E. */
export function hitungGulung(
  asal: PinjamanAsal,
  pokokBaru: number,
  tenorBaru: number,
  rem: RemGulung,
): RencanaGulung {
  wajib(
    asal.status === "berjalan" || asal.status === "macet",
    "PINJAMAN_SUDAH_SELESAI",
    "Pinjaman ini sudah selesai, tidak bisa digulung",
  );
  // E3: rem diperiksa sebelum aturan lain — kolektor membaca sebab yang benar.
  if (rem.gulungDikunci)
    throw new GalatAturan("GULUNG_PINJAMAN_DIKUNCI", pesanRem("Gulung", rem.alasan));
  const jenisGulung: JenisGulung =
    pokokBaru > asal.pokok ? "naik" : pokokBaru < asal.pokok ? "turun" : "tetap";
  if (jenisGulung === "naik" && rem.naikDikunci) {
    throw new GalatAturan("NAIK_PINJAMAN_DIKUNCI", pesanRem("Gulung naik", rem.alasan));
  }

  if (asal.jenis === "harian") {
    wajib(
      asal.status === "berjalan",
      "GULUNG_PINJAMAN_MACET",
      "Pinjaman macet tidak bisa digulung",
    );
    wajib(
      asal.pinjamanKe !== 1 || jenisGulung !== "naik",
      "GULUNG_PERTAMA_TIDAK_BOLEH_NAIK",
      "Pinjaman pertama belum bisa naik",
    );
    const ambang = nomorGulungMinimal(asal.pinjamanKe);
    wajib(
      asal.angsuranKe >= ambang,
      "GULUNG_ANGSURAN_BELUM_CUKUP",
      `Baru bisa digulung mulai angsuran ke-${ambang}`,
    );
  }

  const syarat = syaratAkad(asal.jenis, pokokBaru, tenorBaru);
  const pencairan = syarat.pencairan - asal.saldo;
  wajib(pencairan > 0, "GULUNG_PENCAIRAN_TIDAK_CUKUP", "Pencairan tidak mencukupi");

  // E7.
  const droping =
    jenisGulung === "naik"
      ? { dropBaru: pokokBaru - asal.pokok, dropGulung: asal.pokok, pokokBerkurang: 0 }
      : jenisGulung === "tetap"
        ? { dropBaru: 0, dropGulung: asal.pokok, pokokBerkurang: 0 }
        : { dropBaru: 0, dropGulung: pokokBaru, pokokBerkurang: asal.pokok - pokokBaru };

  return { jenisGulung, syarat, saldoLama: asal.saldo, pencairan, ...droping };
}
