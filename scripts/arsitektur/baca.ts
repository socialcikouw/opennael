import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

/** Pembacaan berkas PEMERIKSA ARSITEKTUR: daftar berkas, AST TypeScript, peta skema, dan jalur impor. */

export const akar = resolve(import.meta.dirname, "../..");
// biome-ignore lint/suspicious/noExplicitAny: API TypeScript dipakai tanpa tipe di skrip
const ts: any = createRequire(join(akar, "package.json"))("typescript");

export function semuaBerkas(dir: string, hasil: string[] = []): string[] {
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
/**
 * Isi satu berkas TS/TSX: impor, penulisan tabel, kunci kueri berupa array
 * literal, dan judul kolom (`header: "…"`) yang masih kalimat biasa.
 */
export function bacaTeks(
  jalur: string,
  teks: string,
): {
  impor: Impor[];
  tulis: { tabelId: string; baris: number }[];
  kunciLiteral: number[];
  headerKalimat: { baris: number; teks: string }[];
} {
  const sf = ts.createSourceFile(
    jalur,
    teks,
    ts.ScriptTarget.Latest,
    true,
    jalur.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const impor: Impor[] = [];
  const tulis: { tabelId: string; baris: number }[] = [];
  const kunciLiteral: number[] = [];
  const headerKalimat: { baris: number; teks: string }[] = [];
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
    if (
      ts.isPropertyAssignment(n) &&
      (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
      n.name.text === "queryKey" &&
      ts.isArrayLiteralExpression(n.initializer)
    ) {
      kunciLiteral.push(baris(n));
    }
    if (
      ts.isPropertyAssignment(n) &&
      (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
      n.name.text === "header" &&
      ts.isStringLiteral(n.initializer) &&
      /\s\p{Ll}/u.test(n.initializer.text)
    ) {
      headerKalimat.push({ baris: baris(n), teks: n.initializer.text });
    }
    ts.forEachChild(n, kunjungi);
  };
  kunjungi(sf);
  return { impor, tulis, kunciLiteral, headerKalimat };
}

export function bacaBerkas(jalur: string) {
  return bacaTeks(jalur, readFileSync(jalur, "utf8"));
}

/** Peta pengenal skema Drizzle → nama tabel database. */
export function bacaSkema(): Map<string, string> {
  const peta = new Map<string, string>();
  for (const f of semuaBerkas(join(akar, "apps/api/src/platform/db/skema"))) {
    if (f.endsWith(".test.ts")) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/export const (\w+) = pgTable\(\s*"(\w+)"/g)) {
      peta.set(m[1] as string, m[2] as string);
    }
  }
  return peta;
}

export function selesaikan(dari: string, spec: string): string | null {
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

export function paketTerdekat(berkas: string): string | null {
  let d = dirname(berkas);
  while (d !== akar && d !== dirname(d)) {
    if (existsSync(join(d, "package.json"))) return d;
    d = dirname(d);
  }
  return null; // di akar repo (mis. scripts/) — tidak diperiksa batas paketnya
}
