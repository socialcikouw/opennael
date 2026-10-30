/**
 * PEMERIKSA ARSITEKTUR (docs/arsitektur/pedoman-struktur.md §10) — aturan batas
 * yang tak bisa dinyatakan dengan pola impor Biome:
 *
 *  1. `apps/api/src/platform/**` tidak mengimpor `modul/`, `app.ts`, `server.ts`, `jadwal.ts`;
 *  2. impor antar-konteks API hanya ke `modul/<konteks>/index.ts`, dan hanya
 *     panah yang tercatat (IMPOR_KONTEKS_BOLEH);
 *  3. tidak ada siklus antar-konteks API maupun antar-fitur web/HP;
 *  4. `.insert/.update/.delete(<tabel>)` hanya di konteks pemilik tabelnya;
 *  5. setiap tabel di skema punya pemilik, dan sebaliknya;
 *  6. tidak ada `../` yang menyeberang batas paket.
 *
 * Jalankan: `bun run cek:arsitektur` (dari akar). Keluar dengan kode 1 bila ada pelanggaran.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { IMPOR_KONTEKS_BOLEH, PEMILIK_TABEL, PENGECUALIAN_TULIS } from "./kepemilikan-tabel";

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

// ---- pembacaan berkas ---------------------------------------------------------------

const akar = resolve(import.meta.dirname, "..");
// biome-ignore lint/suspicious/noExplicitAny: API TypeScript dipakai tanpa tipe di skrip
const ts: any = createRequire(join(akar, "package.json"))("typescript");

function semuaBerkas(dir: string, hasil: string[] = []): string[] {
  if (!existsSync(dir)) return hasil;
  for (const nama of readdirSync(dir)) {
    if (["node_modules", "tipe", "dist", ".expo", ".berkas"].includes(nama)) continue;
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) semuaBerkas(p, hasil);
    else if (/\.tsx?$/.test(nama) && !nama.endsWith(".d.ts")) hasil.push(p);
  }
  return hasil;
}

interface Impor {
  spec: string;
  baris: number;
}
function bacaBerkas(jalur: string): {
  impor: Impor[];
  tulis: { tabelId: string; baris: number }[];
} {
  const teks = readFileSync(jalur, "utf8");
  const sf = ts.createSourceFile(
    jalur,
    teks,
    ts.ScriptTarget.Latest,
    true,
    jalur.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const impor: Impor[] = [];
  const tulis: { tabelId: string; baris: number }[] = [];
  const baris = (n: { getStart(): number }) =>
    sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  // biome-ignore lint/suspicious/noExplicitAny: simpul AST tanpa tipe
  const kunjungi = (n: any) => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      impor.push({ spec: n.moduleSpecifier.text, baris: baris(n) });
    } else if (ts.isCallExpression(n)) {
      if (
        n.expression.kind === ts.SyntaxKind.ImportKeyword &&
        n.arguments[0] &&
        ts.isStringLiteral(n.arguments[0])
      ) {
        impor.push({ spec: n.arguments[0].text, baris: baris(n) });
      }
      const e = n.expression;
      if (
        ts.isPropertyAccessExpression(e) &&
        ["insert", "update", "delete"].includes(e.name.text)
      ) {
        const a = n.arguments[0];
        if (a && ts.isIdentifier(a)) tulis.push({ tabelId: a.text, baris: baris(n) });
      }
    }
    ts.forEachChild(n, kunjungi);
  };
  kunjungi(sf);
  return { impor, tulis };
}

/** Peta pengenal skema Drizzle → nama tabel database. */
function bacaSkema(): Map<string, string> {
  const peta = new Map<string, string>();
  for (const f of semuaBerkas(join(akar, "apps/api/src/platform/db/skema"))) {
    if (f.endsWith(".test.ts")) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/export const (\w+) = pgTable\(\s*"(\w+)"/g)) {
      peta.set(m[1] as string, m[2] as string);
    }
  }
  return peta;
}

function selesaikan(dari: string, spec: string): string | null {
  const dasar = resolve(dirname(dari), spec);
  for (const kandidat of [
    dasar,
    `${dasar}.ts`,
    `${dasar}.tsx`,
    join(dasar, "index.ts"),
    join(dasar, "index.tsx"),
  ]) {
    if (existsSync(kandidat) && statSync(kandidat).isFile()) return kandidat;
  }
  return existsSync(dasar) ? dasar : null;
}

function paketTerdekat(berkas: string): string | null {
  let d = dirname(berkas);
  while (d !== akar && d !== dirname(d)) {
    if (existsSync(join(d, "package.json"))) return d;
    d = dirname(d);
  }
  return null; // di akar repo (mis. scripts/) — tidak diperiksa batas paketnya
}

// ---- pemeriksaan --------------------------------------------------------------------

export function periksaSemua(): Pelanggaran[] {
  const salah: Pelanggaran[] = [];
  const catat = (aturan: string, berkas: string, baris: number, pesan: string) =>
    salah.push({ aturan, berkas: relative(akar, berkas).split(sep).join("/"), baris, pesan });

  // 1–2 + 4. API
  const srcApi = join(akar, "apps/api/src");
  const tabelId = bacaSkema();
  const grafKonteks = new Map<string, Set<string>>();
  for (const f of semuaBerkas(srcApi)) {
    const rel = relative(srcApi, f).split(sep).join("/");
    const uji = /\.test\.tsx?$/.test(rel) || rel.startsWith("uji/");
    const { impor, tulis } = bacaBerkas(f);
    for (const im of impor) {
      if (!im.spec.startsWith(".")) continue;
      const tujuan = selesaikan(f, im.spec);
      if (!tujuan) continue;
      const relTujuan = relative(srcApi, tujuan).split(sep).join("/");
      if (relTujuan.startsWith("..")) continue; // paket lain / di luar src
      const ke = relTujuan.replace(/\.(ts|tsx)$/, "");
      const dari = rel.replace(/\.(ts|tsx)$/, "");
      const pesan = periksaImporApi(dari, ke, uji);
      if (pesan) catat("batas-api", f, im.baris, pesan);
      const a = klasifikasiApi(dari).konteks;
      const b = klasifikasiApi(ke).konteks;
      if (a !== b && a in IMPOR_KONTEKS_BOLEH && b in IMPOR_KONTEKS_BOLEH && !uji) {
        const set = grafKonteks.get(a) ?? new Set<string>();
        set.add(b);
        grafKonteks.set(a, set);
      }
    }
    if (!uji) {
      for (const t of tulis) {
        const nama = tabelId.get(t.tabelId);
        if (!nama) continue;
        const pesan = periksaTulis(rel, nama);
        if (pesan) catat("kepemilikan-tabel", f, t.baris, pesan);
      }
    }
  }
  for (const s of temukanSiklus(grafKonteks)) {
    catat("siklus-konteks", srcApi, 0, `siklus antar-konteks API: ${[...s, s[0]].join(" → ")}`);
  }

  // 5. kelengkapan peta kepemilikan
  const adaDiSkema = new Set(tabelId.values());
  for (const t of adaDiSkema) {
    if (!(t in PEMILIK_TABEL))
      catat(
        "kepemilikan-tabel",
        join(akar, "scripts/kepemilikan-tabel.ts"),
        0,
        `tabel "${t}" ada di skema tetapi belum punya pemilik`,
      );
  }
  for (const t of Object.keys(PEMILIK_TABEL)) {
    if (!adaDiSkema.has(t))
      catat(
        "kepemilikan-tabel",
        join(akar, "scripts/kepemilikan-tabel.ts"),
        0,
        `pemilik "${t}" terdaftar tetapi tabelnya tidak ada di skema`,
      );
  }

  // 3. siklus antar-fitur web / HP
  for (const app of ["web", "mobile"]) {
    const fiturDir = join(akar, `apps/${app}/src/fitur`);
    const graf = new Map<string, Set<string>>();
    for (const f of semuaBerkas(fiturDir)) {
      const dari = relative(fiturDir, f).split(sep)[0] as string;
      for (const im of bacaBerkas(f).impor) {
        const m = im.spec.match(/^@\/fitur\/([^/]+)/);
        if (!m || m[1] === dari) continue;
        const set = graf.get(dari) ?? new Set<string>();
        set.add(m[1] as string);
        graf.set(dari, set);
      }
    }
    for (const s of temukanSiklus(graf)) {
      catat("siklus-fitur", fiturDir, 0, `siklus antar-fitur ${app}: ${[...s, s[0]].join(" → ")}`);
    }
  }

  // 6. batas paket
  const dirPaket = ["apps", "packages"].flatMap((g) =>
    readdirSync(join(akar, g)).map((n) => join(akar, g, n)),
  );
  for (const paket of dirPaket) {
    if (!existsSync(join(paket, "package.json"))) continue;
    for (const f of semuaBerkas(paket)) {
      if (paketTerdekat(f) !== paket) continue;
      for (const im of bacaBerkas(f).impor) {
        if (!im.spec.startsWith(".")) continue;
        const tujuan = resolve(dirname(f), im.spec);
        const rel = relative(paket, tujuan);
        if (rel.startsWith(".."))
          catat(
            "batas-paket",
            f,
            im.baris,
            `impor relatif "${im.spec}" menyeberang batas paket — pakai nama paket`,
          );
      }
    }
  }
  return salah;
}

if (import.meta.main) {
  const salah = periksaSemua();
  if (salah.length === 0) {
    console.log("Arsitektur: tidak ada pelanggaran.");
  } else {
    for (const s of salah)
      console.error(`[${s.aturan}] ${s.berkas}${s.baris ? `:${s.baris}` : ""} — ${s.pesan}`);
    console.error(`\n${salah.length} pelanggaran arsitektur.`);
    process.exit(1);
  }
}
