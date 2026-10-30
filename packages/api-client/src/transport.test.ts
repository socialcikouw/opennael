import { describe, expect, test } from "bun:test";
import { buatSesi, type PenyimpanSesi, type Sesi } from "./sesi";
import { buatTransport } from "./transport";

const profil = { id: "u1" } as unknown as Sesi["pengguna"];
const awal: Sesi = { tokenAkses: "akses-1", tokenSegar: "segar-1", pengguna: profil };

function penyimpanTiruan(isi: Sesi | null) {
  const catatan: (Sesi | null)[] = [];
  const penyimpan: PenyimpanSesi = {
    bacaSinkron: () => isi,
    tulis: (s) => {
      catatan.push(s);
    },
  };
  return { penyimpan, catatan };
}

const json = (isi: unknown, status = 200) =>
  new Response(JSON.stringify(isi), { status, headers: { "Content-Type": "application/json" } });

describe("transport bersesi", () => {
  test("menyisipkan token akses; tanpa sesi tidak ada header", async () => {
    const dilihat: (string | null)[] = [];
    const fetchTiruan = (async (_: unknown, init?: RequestInit) => {
      dilihat.push(new Headers(init?.headers).get("Authorization"));
      return json({ ok: true });
    }) as unknown as typeof fetch;

    const masuk = buatSesi(penyimpanTiruan(awal).penyimpan);
    await buatTransport({ alamat: "http://x", sesi: masuk, fetch: fetchTiruan })("http://x/a");
    const keluar = buatSesi(penyimpanTiruan(null).penyimpan);
    await buatTransport({ alamat: "http://x", sesi: keluar, fetch: fetchTiruan })("http://x/a");

    expect(dilihat).toEqual(["Bearer akses-1", null]);
  });

  test("token kedaluwarsa: satu refresh dibagi permintaan bersamaan, lalu diulang", async () => {
    let refresh = 0;
    const dilihat: string[] = [];
    const fetchTiruan = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refresh++;
        return json({ tokenAkses: "akses-2", tokenSegar: "segar-2" });
      }
      const token = new Headers(init?.headers).get("Authorization") ?? "";
      dilihat.push(token);
      return token === "Bearer akses-2"
        ? json({ ok: true })
        : json({ kode: "TOKEN_AKSES_TIDAK_SAH", pesan: "kedaluwarsa" }, 401);
    }) as unknown as typeof fetch;

    const { penyimpan, catatan } = penyimpanTiruan(awal);
    const sesi = buatSesi(penyimpan);
    const kirim = buatTransport({ alamat: "http://x", sesi, fetch: fetchTiruan });

    const [a, b] = await Promise.all([kirim("http://x/a"), kirim("http://x/b")]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(refresh).toBe(1);
    expect(sesi.ambil()?.tokenAkses).toBe("akses-2");
    expect(catatan.at(-1)?.tokenSegar).toBe("segar-2");
    expect(dilihat.filter((t) => t === "Bearer akses-2")).toHaveLength(2);
  });

  test("refresh ditolak 401: sesi dihapus dan jawaban 401 asli dikembalikan", async () => {
    const fetchTiruan = (async (input: Parameters<typeof fetch>[0]) =>
      String(input).endsWith("/auth/refresh")
        ? json({ kode: "SESI_DICABUT", pesan: "dicabut" }, 401)
        : json(
            { kode: "TOKEN_AKSES_TIDAK_SAH", pesan: "kedaluwarsa" },
            401,
          )) as unknown as typeof fetch;

    const { penyimpan, catatan } = penyimpanTiruan(awal);
    const sesi = buatSesi(penyimpan);
    const res = await buatTransport({ alamat: "http://x", sesi, fetch: fetchTiruan })("http://x/a");

    expect(res.status).toBe(401);
    expect(sesi.ambil()).toBeNull();
    expect(catatan.at(-1)).toBeNull();
  });

  test("401 selain token akses tidak memicu refresh", async () => {
    let refresh = 0;
    const fetchTiruan = (async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith("/auth/refresh")) refresh++;
      return json({ kode: "BELUM_MASUK", pesan: "masuk dulu" }, 401);
    }) as unknown as typeof fetch;

    const sesi = buatSesi(penyimpanTiruan(awal).penyimpan);
    const res = await buatTransport({ alamat: "http://x", sesi, fetch: fetchTiruan })("http://x/a");

    expect(res.status).toBe(401);
    expect(refresh).toBe(0);
    expect(sesi.ambil()?.tokenAkses).toBe("akses-1");
  });
});
