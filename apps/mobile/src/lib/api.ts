import type { App } from "@opennael/api/tipe";
import type { Galat } from "@opennael/contracts";
import { hc } from "hono/client";
import { sesi } from "./sesi";

/** Alamat API — `EXPO_PUBLIC_API_URL` di `apps/mobile/.env` (IP laptop, bukan localhost). */
export const ALAMAT_API = process.env.EXPO_PUBLIC_API_URL ?? "";

/**
 * Token akses kedaluwarsa (15 menit) → tukar token segar sekali, lalu ulangi
 * permintaan. Beberapa permintaan yang gagal bersamaan berbagi satu refresh
 * (refresh ganda membuat token putaran lama dianggap dipakai ulang).
 */
let refreshBerjalan: Promise<boolean> | null = null;

async function segarkan(): Promise<boolean> {
  const s = sesi.ambil();
  if (!s) return false;
  refreshBerjalan ??= (async () => {
    try {
      const res = await fetch(`${ALAMAT_API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenSegar: s.tokenSegar }),
      });
      if (res.status === 401) {
        // Sesi dicabut (keluar, HP diganti, kedaluwarsa) → kembali ke layar penautan.
        await sesi.hapus();
        return false;
      }
      if (!res.ok) return false;
      const token = (await res.json()) as { tokenAkses: string; tokenSegar: string };
      await sesi.gantiToken(token);
      return true;
    } catch {
      return false;
    } finally {
      refreshBerjalan = null;
    }
  })();
  return refreshBerjalan;
}

export async function ambilDenganSesi(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const kirim = () => {
    const headers = new Headers(init?.headers);
    const token = sesi.ambil()?.tokenAkses;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
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

/** Klien RPC bertipe — bentuk permintaan & jawaban mengikuti rute di `apps/api`. */
export const api = hc<App>(ALAMAT_API, { fetch: ambilDenganSesi });

/** Bentuk minimal jawaban (Response biasa maupun ClientResponse hc). */
type Jawaban = { status: number; json(): Promise<unknown> };

/** Galat API → pesan untuk orang. */
export async function bacaGalat(res: Jawaban): Promise<string> {
  const galat = (await res.json().catch(() => null)) as Galat | null;
  return galat?.pesan ?? `Gagal (${res.status})`;
}

export const PESAN_JARINGAN = "Server tidak terjangkau — periksa sinyal atau alamat API";

/**
 * Panggil API; jawaban di luar `diharapkan` menjadi `Error` berisi pesan
 * server, dan gangguan jaringan menjadi `PESAN_JARINGAN`.
 */
export async function panggil<R extends Jawaban>(
  kirim: () => Promise<R>,
  diharapkan = [200, 201],
): Promise<R> {
  let res: R;
  try {
    res = await kirim();
  } catch {
    throw new Error(PESAN_JARINGAN);
  }
  if (!diharapkan.includes(res.status)) throw new Error(await bacaGalat(res));
  return res;
}
