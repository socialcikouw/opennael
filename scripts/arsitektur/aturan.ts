import { IMPOR_KONTEKS_BOLEH, PEMILIK_TABEL, PENGECUALIAN_TULIS } from "../kepemilikan-tabel";

/** Aturan murni PEMERIKSA ARSITEKTUR (tanpa I/O): siklus, klasifikasi impor API, kepemilikan tabel. */

export interface Pelanggaran {
  aturan: string;
  berkas: string;
  baris: number;
  pesan: string;
}

// ---- logika murni (diuji di cek-arsitektur.test.ts) --------------------------------

/** Siklus pada graf berarah (setiap siklus sekali, dimulai dari simpul terkecil). */
export function temukanSiklus(graf: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
  const hasil: string[][] = [];
  const tampak = new Set<string>();
  const kunci = new Set<string>();
  const jejak: string[] = [];
  const jelajah = (n: string) => {
    jejak.push(n);
    for (const t of graf.get(n) ?? []) {
      const i = jejak.indexOf(t);
      if (i >= 0) {
        const siklus = jejak.slice(i);
        const mulai = siklus.indexOf([...siklus].sort()[0] as string);
        const rapi = [...siklus.slice(mulai), ...siklus.slice(0, mulai)];
        const k = rapi.join(">");
        if (!kunci.has(k)) {
          kunci.add(k);
          hasil.push(rapi);
        }
      } else if (!tampak.has(t)) jelajah(t);
    }
    jejak.pop();
    tampak.add(n);
  };
  for (const n of [...graf.keys()].sort()) if (!tampak.has(n)) jelajah(n);
  return hasil;
}

export interface TujuanApi {
  /** `platform` | `akar` (app/server/jadwal/env/uji) | nama konteks. */
  konteks: string;
  /** Berkas di akar `src` (app.ts, server.ts, jadwal.ts) — bukan folder. */
  berkasAkar?: string;
  /** Jalur impor tepat ke `index.ts` konteks (atau folder konteks). */
  indeks: boolean;
}

/** Klasifikasikan jalur relatif terhadap `apps/api/src` (tanpa ekstensi). */
export function klasifikasiApi(jalur: string): TujuanApi {
  const bagian = jalur.split("/");
  if (bagian[0] === "modul" && bagian[1]) {
    const sisa = bagian.slice(2);
    return {
      konteks: bagian[1],
      indeks: sisa.length === 0 || (sisa.length === 1 && sisa[0] === "index"),
    };
  }
  if (bagian[0] === "platform") return { konteks: "platform", indeks: false };
  const akarApp = ["app", "server", "jadwal", "env"];
  if (bagian.length === 1 && akarApp.includes(bagian[0] as string)) {
    return { konteks: "akar", berkasAkar: bagian[0] as string, indeks: false };
  }
  return { konteks: "akar", indeks: false };
}

/** Periksa satu impor di API; `dari` dan `ke` relatif terhadap `apps/api/src` tanpa ekstensi. */
export function periksaImporApi(dari: string, ke: string, ujiBerkas: boolean): string | null {
  const asal = klasifikasiApi(dari);
  const tujuan = klasifikasiApi(ke);
  if (asal.konteks === "platform") {
    if (tujuan.konteks !== "platform" && tujuan.konteks !== "akar") {
      return "platform/ tidak boleh mengimpor modul/";
    }
    if (tujuan.berkasAkar) return `platform/ tidak boleh mengimpor ${tujuan.berkasAkar}.ts`;
    return null;
  }
  if (tujuan.konteks === "platform" || tujuan.konteks === asal.konteks) return null;
  if (tujuan.konteks === "akar") {
    if (tujuan.berkasAkar && asal.konteks !== "akar" && !ujiBerkas) {
      return `modul/ tidak boleh mengimpor ${tujuan.berkasAkar}.ts (lapis di atasnya)`;
    }
    return null;
  }
  // tujuan: konteks lain
  if (!tujuan.indeks)
    return `impor ke dalam konteks "${tujuan.konteks}" harus lewat modul/${tujuan.konteks}/index.ts`;
  if (asal.konteks === "akar") return null; // app.ts / jadwal.ts / server.ts / uji memasang semua konteks
  const boleh = IMPOR_KONTEKS_BOLEH[asal.konteks] ?? [];
  if (!boleh.includes(tujuan.konteks)) {
    return `konteks "${asal.konteks}" belum boleh mengimpor "${tujuan.konteks}" (catat panahnya di scripts/kepemilikan-tabel.ts dan struktur.md §4.1 bila disengaja)`;
  }
  return null;
}

/** Penulisan tabel `tabel` dari berkas `berkas` (relatif `apps/api/src`) — pesan pelanggaran atau null. */
export function periksaTulis(berkas: string, tabel: string): string | null {
  const pemilik = PEMILIK_TABEL[tabel];
  if (!pemilik) return `tabel "${tabel}" belum punya pemilik di scripts/kepemilikan-tabel.ts`;
  const konteks = klasifikasiApi(berkas.replace(/\.tsx?$/, "")).konteks;
  if (konteks === pemilik) return null;
  const kecuali = PENGECUALIAN_TULIS.find((p) => p.berkas === berkas && p.tabel.includes(tabel));
  if (kecuali) return null;
  return `menulis tabel "${tabel}" milik "${pemilik}" dari "${konteks}" — panggil operasi publik pemiliknya (tx yang sama)`;
}
