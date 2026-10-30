import type { Galat } from "@opennael/contracts";
import type { TokoSesi } from "./sesi";

/** Masukan `fetch` — didefinisikan sendiri karena `RequestInfo` milik DOM tak ada di semua lingkungan. */
type Masukan = string | URL | Request;
type Ambil = (input: Masukan, init?: RequestInit) => Promise<Response>;

/**
 * TRANSPORT — `fetch` bersesi: menyisipkan token akses, dan bila token akses
 * kedaluwarsa menukar token segar SEKALI lalu mengulang permintaan. Beberapa
 * permintaan yang gagal bersamaan berbagi satu refresh (refresh ganda membuat
 * token putaran lama dianggap dipakai ulang).
 */
export function buatTransport(opsi: {
  /** Alamat dasar API (tanpa garis miring akhir). */
  alamat: string;
  sesi: TokoSesi;
  /** Bawaan: `fetch` global. */
  fetch?: typeof globalThis.fetch;
}) {
  const { alamat, sesi } = opsi;
  const ambilJaringan: Ambil =
    (opsi.fetch as unknown as Ambil | undefined) ??
    ((input, init) => fetch(input as Parameters<typeof fetch>[0], init));
  let refreshBerjalan: Promise<boolean> | null = null;

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

  return async function ambilDenganSesi(input: Masukan, init?: RequestInit): Promise<Response> {
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
  };
}
