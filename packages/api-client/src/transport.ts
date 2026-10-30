import { type Galat, operasiIdempoten } from "@opennael/contracts";
import {
  buatPenyimpanKunci,
  type KunciTertunda,
  kanonikJson,
  type PenyimpanKunci,
  sidikRingkas,
} from "./kunci-tertunda";
import type { TokoSesi } from "./sesi";
import { buatUuid } from "./uuid";

/** Masukan `fetch` — didefinisikan sendiri karena `RequestInfo` milik DOM tak ada di semua lingkungan. */
type Masukan = string | URL | Request;
type Ambil = (input: Masukan, init?: RequestInit) => Promise<Response>;

/** Jawaban gerbang saat server di belakangnya mati/lambat: permintaan mungkin sampai, mungkin tidak. */
const STATUS_SEMENTARA = new Set([502, 503, 504]);

const NAMA_KUNCI = "Idempotency-Key";

/**
 * Pengulangan otomatis operasi tulis idempoten (`OPERASI_IDEMPOTEN`). Semuanya
 * punya bawaan; hanya uji yang mengganti `tidur`/`sekarang`/`buatKunci`.
 */
export interface OpsiIdempoten {
  /** Tempat kunci tertunda — bawaan hanya di memori; aplikasi menyuntik yang bertahan. */
  penyimpan?: PenyimpanKunci;
  buatKunci?: () => string;
  /** Percobaan ulang sesudah yang pertama (bawaan 3) dan jeda (ms) sebelum ulangan ke-`n` (mulai 0; bawaan 1 dtk, 2 dtk, 4 dtk). */
  ulang?: { maks?: number; jedaMs?: (n: number) => number };
  /** Batas waktu satu percobaan sampai jawaban datang (bawaan 30 dtk); lewat = dianggap jaringan putus. */
  batasWaktuMs?: number;
  /** Umur kunci tertunda (bawaan 10 menit); lewat itu permintaan serupa dianggap kejadian baru. */
  umurKunciMs?: number;
  tidur?: (ms: number) => Promise<void>;
  sekarang?: () => number;
}

/**
 * TRANSPORT — `fetch` bersesi: menyisipkan token akses, dan bila token akses
 * kedaluwarsa menukar token segar SEKALI lalu mengulang permintaan. Beberapa
 * permintaan yang gagal bersamaan berbagi satu refresh (refresh ganda membuat
 * token putaran lama dianggap dipakai ulang).
 *
 * Operasi tulis yang idempoten di server (`OPERASI_IDEMPOTEN`) juga diberi
 * `Idempotency-Key` dan diulang otomatis dengan kunci yang sama bila hasilnya
 * tak pasti (jaringan putus, batas waktu, 502–504) — lihat `kunci-tertunda.ts`.
 * Operasi lain tidak pernah diulang otomatis.
 */
export function buatTransport(opsi: {
  /** Alamat dasar API (tanpa garis miring akhir). */
  alamat: string;
  sesi: TokoSesi;
  /** Bawaan: `fetch` global. */
  fetch?: typeof globalThis.fetch;
  /** `false` mematikan kunci & pengulangan otomatis. */
  idempoten?: OpsiIdempoten | false;
}) {
  const { alamat, sesi } = opsi;
  const ambilJaringan: Ambil =
    (opsi.fetch as unknown as Ambil | undefined) ??
    ((input, init) => fetch(input as Parameters<typeof fetch>[0], init));
  let refreshBerjalan: Promise<boolean> | null = null;

  const idem = opsi.idempoten === false ? null : (opsi.idempoten ?? {});
  const penyimpan = idem?.penyimpan ?? buatPenyimpanKunci();
  const buatKunci = idem?.buatKunci ?? buatUuid;
  const maksUlang = idem?.ulang?.maks ?? 3;
  const jedaMs = idem?.ulang?.jedaMs ?? ((n: number) => 1000 * 2 ** n);
  const batasWaktuMs = idem?.batasWaktuMs ?? 30_000;
  const umurKunciMs = idem?.umurKunciMs ?? 10 * 60_000;
  const tidur = idem?.tidur ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const sekarang = idem?.sekarang ?? Date.now;

  async function segarkan(): Promise<boolean> {
    const s = sesi.ambil();
    if (!s) return false;
    refreshBerjalan ??= (async () => {
      try {
        const res = await ambilJaringan(`${alamat}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenSegar: s.tokenSegar }),
        });
        if (res.status === 401) {
          // Sesi dicabut (keluar, perangkat diputus, kedaluwarsa) → keluar dari sesi.
          await sesi.hapus();
          return false;
        }
        if (!res.ok) return false;
        await sesi.gantiToken((await res.json()) as { tokenAkses: string; tokenSegar: string });
        return true;
      } catch {
        return false;
      } finally {
        refreshBerjalan = null;
      }
    })();
    return refreshBerjalan;
  }

  /** Satu percobaan: token disisipkan; token akses kedaluwarsa → refresh sekali lalu ulangi. */
  async function ambilSekali(input: Masukan, init?: RequestInit): Promise<Response> {
    const kirim = () => {
      const headers = new Headers(init?.headers);
      const token = sesi.ambil()?.tokenAkses;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return ambilJaringan(input, { ...init, headers });
    };
    const res = await kirim();
    if (res.status !== 401 || !sesi.ambil()) return res;
    const galat = (await res
      .clone()
      .json()
      .catch(() => null)) as Galat | null;
    if (galat?.kode !== "TOKEN_AKSES_TIDAK_SAH") return res;
    return (await segarkan()) ? kirim() : res;
  }

  /** Metode, jalur (tanpa awalan alamat & query), dan isi — `null` bila bukan operasi idempoten. */
  function bacaOperasi(input: Masukan, init?: RequestInit) {
    if (typeof input !== "string" && !(input instanceof URL)) return null;
    const url = String(input);
    if (!url.startsWith(alamat)) return null;
    const sisa = url.slice(alamat.length);
    if (!sisa.startsWith("/")) return null;
    const jalur = sisa.split(/[?#]/)[0] ?? "";
    const metode = (init?.method ?? "GET").toUpperCase();
    const badan = init?.body ?? "";
    if (typeof badan !== "string" || !operasiIdempoten(metode, jalur)) return null;
    if (new Headers(init?.headers).has(NAMA_KUNCI)) return null; // pemanggil mengurus kuncinya sendiri
    return { metode, jalur, badan };
  }

  /** Penyimpan boleh rusak tanpa menggagalkan permintaan. */
  async function sebisanya<T>(kerja: () => T | Promise<T>): Promise<T | undefined> {
    try {
      return await kerja();
    } catch {
      return undefined;
    }
  }

  /**
   * Kunci untuk sebuah sidik: yang tertunda bila masih muda, selain itu yang
   * baru. Permintaan identik yang tiba bersamaan berbagi satu penentuan —
   * tanpa ini keduanya sama-sama melihat "belum ada" lalu membuat kunci sendiri.
   */
  const sedangMenentukan = new Map<string, Promise<KunciTertunda>>();
  function tentukanKunci(sidik: string): Promise<KunciTertunda> {
    const berjalan = sedangMenentukan.get(sidik);
    if (berjalan) return berjalan;
    const baru = (async () => {
      const ada = await sebisanya(() => penyimpan.ambil(sidik));
      if (ada && sekarang() - ada.dibuat <= umurKunciMs) return ada;
      const kunci = { kunci: buatKunci(), dibuat: sekarang() };
      // Disimpan SEBELUM dikirim: kalau aplikasi mati di tengah jalan, kunci tetap ada.
      await sebisanya(() => penyimpan.simpan(sidik, kunci));
      return kunci;
    })().finally(() => sedangMenentukan.delete(sidik));
    sedangMenentukan.set(sidik, baru);
    return baru;
  }

  /** Satu percobaan dengan batas waktu; menghormati pembatalan dari pemanggil. */
  async function percobaan(input: Masukan, init: RequestInit): Promise<Response> {
    const luar = init.signal;
    const pengendali = new AbortController();
    const hentikan = () => pengendali.abort();
    if (luar?.aborted) pengendali.abort();
    luar?.addEventListener("abort", hentikan, { once: true });
    const pewaktu = setTimeout(hentikan, batasWaktuMs);
    try {
      return await ambilSekali(input, { ...init, signal: pengendali.signal });
    } finally {
      clearTimeout(pewaktu);
      luar?.removeEventListener("abort", hentikan);
    }
  }

  async function ambilIdempoten(
    input: Masukan,
    init: RequestInit | undefined,
    operasi: { metode: string; jalur: string; badan: string },
    penggunaId: string,
  ): Promise<Response> {
    const sidik = sidikRingkas(
      `${penggunaId}|${operasi.metode}|${operasi.jalur}|${kanonikJson(operasi.badan)}`,
    );
    const tertunda = await tentukanKunci(sidik);
    const headers = new Headers(init?.headers);
    headers.set(NAMA_KUNCI, tertunda.kunci);

    for (let ke = 0; ; ke++) {
      let jawaban: Response | undefined;
      let galatJaringan: unknown;
      try {
        jawaban = await percobaan(input, { ...init, headers });
      } catch (e) {
        if (init?.signal?.aborted) throw e; // dibatalkan pemanggil, bukan jaringan
        galatJaringan = e;
      }
      const tidakPasti = jawaban ? STATUS_SEMENTARA.has(jawaban.status) : true;
      if (!tidakPasti) {
        // Jawaban pasti (sukses maupun galat): kunci selesai, kejadian berikutnya baru.
        await sebisanya(() => penyimpan.hapus(sidik));
        return jawaban as Response;
      }
      if (ke >= maksUlang) {
        // Menyerah, kunci tetap tertunda: ketukan ulang pengguna memakai kunci yang sama.
        if (jawaban) return jawaban;
        throw galatJaringan;
      }
      await sebisanya(() => jawaban?.body?.cancel()); // lepas jawaban gerbang yang tak dipakai
      await tidur(jedaMs(ke));
    }
  }

  return async function ambilDenganSesi(input: Masukan, init?: RequestInit): Promise<Response> {
    const penggunaId = sesi.ambil()?.pengguna.id;
    const operasi = idem && penggunaId ? bacaOperasi(input, init) : null;
    if (!operasi || !penggunaId) return ambilSekali(input, init);
    return ambilIdempoten(input, init, operasi, penggunaId);
  };
}
