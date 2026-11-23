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
 *  6. tidak ada `../` yang menyeberang batas paket;
 *  7. kunci kueri web/HP dari katalog api-client, bukan array literal;
 *  8. judul kolom tabel web Kapital Tiap Kata;
 *  9. warna HP hanya dari token tema: tak ada nilai warna literal di luar `apps/mobile/src/tema/`
 *     (juga `app.config.ts` & `app.json`), dan layar tak mengimpor palet mentah (`tema/palet`).
 *
 * Jalankan: `bun run cek:arsitektur` (dari akar). Keluar dengan kode 1 bila ada pelanggaran.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
  klasifikasiApi,
  type Pelanggaran,
  periksaImporApi,
  periksaTulis,
  temukanSiklus,
} from "./arsitektur/aturan";
import {
  akar,
  bacaBerkas,
  bacaSkema,
  paketTerdekat,
  selesaikan,
  semuaBerkas,
} from "./arsitektur/baca";
import { IMPOR_KONTEKS_BOLEH, PEMILIK_TABEL } from "./kepemilikan-tabel";

// Aturan murni & pembacaan berkas ada di arsitektur/; diekspor ulang di sini supaya uji dan pemanggil lama tetap sama.
export {
  klasifikasiApi,
  type Pelanggaran,
  periksaImporApi,
  periksaTulis,
  type TujuanApi,
  temukanSiklus,
} from "./arsitektur/aturan";
export { bacaTeks } from "./arsitektur/baca";

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

  // 7. kunci kueri web / HP: dari api-client (`kueri.*`, `kunci.*`), bukan array literal di layar
  for (const app of ["web", "mobile"]) {
    for (const f of semuaBerkas(join(akar, `apps/${app}/src`))) {
      for (const baris of bacaBerkas(f).kunciLiteral) {
        catat(
          "kunci-kueri",
          f,
          baris,
          "queryKey berupa array literal — pakai kueri.* atau kunci.* dari @opennael/api-client",
        );
      }
    }
  }
  // 8. judul kolom tabel web: Kapital Tiap Kata (docs/tampilan.md)
  for (const f of semuaBerkas(join(akar, "apps/web/src"))) {
    for (const h of bacaBerkas(f).headerKalimat) {
      catat(
        "huruf-judul-kolom",
        f,
        h.baris,
        `judul kolom "${h.teks}" masih kalimat biasa — tulis Kapital Tiap Kata (docs/tampilan.md)`,
      );
    }
  }
  // 9. tema HP: satu sumber token (docs/tema.md)
  const mobile = join(akar, "apps/mobile");
  const dirTema = join(mobile, "src/tema") + sep;
  for (const f of [...semuaBerkas(join(mobile, "src")), join(mobile, "app.config.ts")]) {
    if (!existsSync(f)) continue;
    const dalamTema = f.startsWith(dirTema);
    const baca = bacaBerkas(f);
    if (!dalamTema) {
      for (const w of baca.warnaLiteral) {
        catat(
          "warna-literal",
          f,
          w.baris,
          `warna "${w.teks}" ditulis langsung — pakai token dari @/tema (nilai mentah hanya di src/tema/palet.ts)`,
        );
      }
      for (const im of baca.impor) {
        if (/\/palet$/.test(im.spec))
          catat(
            "palet-mentah",
            f,
            im.baris,
            "palet mentah hanya untuk src/tema/ — layar memakai token (@/tema)",
          );
      }
    }
  }
  // 10. tombol HP selalu bergetar: Pressable hanya lewat `Tekan` (komponen/ui/tekan.tsx)
  const tekan = join(mobile, "src/komponen/ui/tekan.tsx");
  for (const f of semuaBerkas(join(mobile, "src"))) {
    if (f === tekan) continue;
    for (const b of bacaBerkas(f).pressableLangsung) {
      catat(
        "pressable-langsung",
        f,
        b,
        "Pressable langsung dari react-native — pakai Tekan (@/komponen/ui/tekan) supaya tombol bergetar",
      );
    }
  }
  const appJson = join(mobile, "app.json");
  if (existsSync(appJson)) {
    readFileSync(appJson, "utf8")
      .split("\n")
      .forEach((isi, i) => {
        if (/"#[0-9a-fA-F]{3,8}"/.test(isi))
          catat(
            "warna-literal",
            appJson,
            i + 1,
            "warna di app.json — turunkan dari token lewat tema-native.json (src/tema/native.ts)",
          );
      });
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
