import { and, eq, sql } from "drizzle-orm";
import type { buatApp } from "../app";
import { buatDb, type Db } from "../platform/db/klien";
import { pastikanDatabasePengembangan } from "../platform/db/penjaga";
import { hariKolektor, kantor, pengguna } from "../platform/db/skema";
import type { Aktor } from "../platform/http/aktor";
import { siapkanKantor, URL_DB } from "./bantu";

/**
 * PEMBANTU UJI operasi lapangan kolektor. `siapkanLapangan` berjalan di SATU
 * transaksi yang dibatalkan; `siapkanDuaKoneksi` memakai dua koneksi nyata dan
 * data yang di-commit (dibersihkan di `bersihkan`).
 */

/** Pengirim `/lapangan/*`: POST bila ada badan (atau `/laporan`), GET bila tidak. */
export function pengirimLapangan(app: ReturnType<typeof buatApp>) {
  return async (jalur: string, isi?: unknown, token?: string) => {
    const res = await app.request(jalur, {
      method: isi === undefined && !jalur.endsWith("/laporan") ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(isi === undefined ? {} : { body: JSON.stringify(isi) }),
    });
    const teks = await res.text();
    // biome-ignore lint/suspicious/noExplicitAny: isi jawaban di uji dibaca bebas lalu diperiksa expect
    return { status: res.status, isi: (teks ? JSON.parse(teks) : null) as Record<string, any> };
  };
}

export const kode = (r: { isi: Record<string, unknown> }) => r.isi.kode;

/** Kantor siap uji + kolektor "Andi" + pembantu foto, akad, dan absen. */
export async function siapkanLapangan(tx: Db, deps: Parameters<typeof siapkanKantor>[1] = {}) {
  const { app, bos, kolektor: andi, kantorId } = await siapkanKantor(tx, deps);
  const kirim = pengirimLapangan(app);
  const k = andi.tokenAkses;

  let nomorFoto = 0;
  const fotoBaru = async (oleh = andi.pengguna.id, umurMenit = 0) => {
    const r = await tx.execute(sql`
      insert into foto (kantor_id, jenis, kunci_berkas, sha256, ukuran_byte, tipe_mime, diunggah_oleh, dibuat_at)
      values (${kantorId}, 'serah_terima', 'f', ${String(++nomorFoto).padStart(64, "0")}, 1000, 'image/webp',
              ${oleh}, now() - make_interval(mins => ${umurMenit}))
      returning id`);
    return (r as unknown as { id: string }[])[0]?.id as string;
  };
  const akadBaru = async (nama: string, isi: Record<string, unknown> = {}) =>
    kirim(
      "/lapangan/akad",
      {
        nasabah: { nama, kampung: { nama: " Pule  Barat " } },
        jenis: "harian",
        pokok: 1_000_000,
        tenor: 24,
        fotoSerahTerimaId: await fotoBaru(),
        ...isi,
      },
      k,
    );
  const absen = () =>
    kirim(
      "/lapangan/absen",
      { absensi: "masuk_kerja", kasLapangan: 1_000_000, uangJalan: 50_000 },
      k,
    );

  return { app, kirim, bos, andi, k, kantorId, fotoBaru, akadBaru, absen };
}

/**
 * Dua koneksi ke database pengembangan dan satu kolektor dengan baris
 * `hari_kolektor` di-commit untuk tiap tanggal: koneksi A (`tahan`) mengunci
 * baris sebuah hari, koneksi B (`db`) menjalankan operasi yang diuji.
 */
export async function siapkanDuaKoneksi(namaKantor: string, tanggalHari: readonly string[]) {
  pastikanDatabasePengembangan(URL_DB);
  const a = buatDb(URL_DB as string);
  const b = buatDb(URL_DB as string);
  const kantorId = crypto.randomUUID();
  const kolektorId = crypto.randomUUID();
  const aktor: Aktor = {
    kantorId,
    penggunaId: kolektorId,
    peran: "kolektor",
    perangkatId: crypto.randomUUID(),
  };
  const milik = (tanggal: string) =>
    and(eq(hariKolektor.kolektorId, kolektorId), eq(hariKolektor.tanggal, tanggal));
  const penahan: { lepas: () => void; selesai: Promise<void> }[] = [];

  await a.db.insert(kantor).values({ id: kantorId, nama: namaKantor });
  await a.db.insert(pengguna).values({ id: kolektorId, kantorId, peran: "kolektor", nama: "Uji" });
  await a.db.insert(hariKolektor).values(
    tanggalHari.map((tanggal) => ({
      kantorId,
      kolektorId,
      tanggal,
      absensi: "masuk_kerja" as const,
    })),
  );

  /** Koneksi A mengunci baris hari itu, mengubahnya, dan baru commit setelah `lepas()`. */
  async function tahan(tanggal: string, ubah: (tx: Db) => Promise<unknown>) {
    let terkunci!: () => void;
    let lepas!: () => void;
    const sudahTerkunci = new Promise<void>((resolve) => {
      terkunci = resolve;
    });
    const bolehLepas = new Promise<void>((resolve) => {
      lepas = resolve;
    });
    const selesai = a.db.transaction(async (tx) => {
      await tx
        .select({ id: hariKolektor.id })
        .from(hariKolektor)
        .where(milik(tanggal))
        .for("update");
      terkunci();
      await bolehLepas;
      await ubah(tx);
    });
    penahan.push({ lepas, selesai });
    await sudahTerkunci;
    return { lepas, selesai };
  }

  /** Hanya fixture UUID milik pengujian ini; tidak menyentuh kantor lain. */
  async function bersihkan() {
    for (const p of penahan) p.lepas();
    await Promise.allSettled(penahan.map((p) => p.selesai));
    await a.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('nael.hapus_data_uji', 'ya', true)`);
      await tx.delete(hariKolektor).where(eq(hariKolektor.kantorId, kantorId));
      await tx.delete(pengguna).where(eq(pengguna.kantorId, kantorId));
      await tx.delete(kantor).where(eq(kantor.id, kantorId));
    });
    await Promise.all([a.sql.end(), b.sql.end()]);
  }

  const tunggu = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  return { db: b.db, aktor, milik, tahan, tunggu, bersihkan };
}
