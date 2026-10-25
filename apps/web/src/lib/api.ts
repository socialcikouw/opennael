import type { App } from "@opennael/api/tipe";
import type { Galat } from "@opennael/contracts";
import { hc } from "hono/client";
import { sesi } from "./sesi";

/** API di asal yang sama (`/api`, diteruskan Vite saat pengembangan / Nginx di produksi). */
const ALAMAT_API = `${window.location.origin}/api`;

/**
 * Token akses kedaluwarsa → tukar token segar sekali lalu ulangi permintaan.
 * Beberapa permintaan yang gagal bersamaan berbagi satu refresh.
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
        sesi.hapus();
        return false;
      }
      if (!res.ok) return false;
      sesi.gantiToken((await res.json()) as { tokenAkses: string; tokenSegar: string });
      return true;
    } catch {
      return false;
    } finally {
      refreshBerjalan = null;
    }
  })();
  return refreshBerjalan;
}

async function ambilDenganSesi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
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

type Jawaban = { status: number; json(): Promise<unknown> };

export const PESAN_JARINGAN = "Server tidak terjangkau — periksa koneksi";

/**
 * Panggil API; jawaban di luar `diharapkan` menjadi `Error` berisi pesan
 * server (beserta rincian validasi per field), gangguan jaringan menjadi
 * `PESAN_JARINGAN`.
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
  if (!diharapkan.includes(res.status)) {
    const galat = (await res.json().catch(() => null)) as Galat | null;
    const rincian = galat?.rincian?.map((r) => r.pesan).join("; ");
    throw new Error(
      galat ? `${galat.pesan}${rincian ? ` (${rincian})` : ""}` : `Gagal (${res.status})`,
    );
  }
  return res;
}

/** Isi jawaban berhasil (200/201) dari union jawaban klien `hc`. */
type IsiBerhasil<R> = R extends { status: 200 | 201; json(): Promise<infer T> } ? T : never;

/** `panggil` lalu baca isi jawaban berhasilnya — untuk `useQuery` & `useMutation`. */
export async function ambil<R extends Jawaban>(kirim: () => Promise<R>): Promise<IsiBerhasil<R>> {
  const res = await panggil(kirim);
  return (await res.json()) as IsiBerhasil<R>;
}
