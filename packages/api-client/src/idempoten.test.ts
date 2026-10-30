import { describe, expect, test } from "bun:test";
import { buatPenyimpanKunci, type MediumKunci } from "./kunci-tertunda";
import { buatSesi, type Sesi } from "./sesi";
import { buatTransport, type OpsiIdempoten } from "./transport";

const ALAMAT = "http://x";
const profil = { id: "pengguna-1" } as unknown as Sesi["pengguna"];
const awal: Sesi = { tokenAkses: "akses-1", tokenSegar: "segar-1", pengguna: profil };

const json = (isi: unknown, status = 200) =>
  new Response(JSON.stringify(isi), { status, headers: { "Content-Type": "application/json" } });

type Langkah = Response | Error | ((init: RequestInit) => Promise<Response>);

/** `fetch` tiruan: menjalankan langkah berurutan dan mencatat kunci/isi tiap panggilan. */
function jaringan(...langkah: Langkah[]) {
  const panggilan: { url: string; kunci: string | null; badan: unknown; auth: string | null }[] =
    [];
  const fetchTiruan = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const h = new Headers(init?.headers);
    panggilan.push({
      url: String(input),
      kunci: h.get("Idempotency-Key"),
      badan: init?.body,
      auth: h.get("Authorization"),
    });
    const l = langkah[Math.min(panggilan.length - 1, langkah.length - 1)];
    if (l instanceof Error) throw l;
    if (typeof l === "function") return l(init ?? {});
    return (l as Response).clone();
  }) as unknown as typeof fetch;
  return { fetchTiruan, panggilan };
}

function pasang(langkah: Langkah[], opsi: OpsiIdempoten = {}, sesiAwal: Sesi | null = awal) {
  const { fetchTiruan, panggilan } = jaringan(...langkah);
  const tidur: number[] = [];
  let n = 0;
  const penyimpan = opsi.penyimpan ?? buatPenyimpanKunci();
  const sesi = buatSesi({ bacaSinkron: () => sesiAwal, tulis: () => {} });
  const kirim = buatTransport({
    alamat: ALAMAT,
    sesi,
    fetch: fetchTiruan,
    idempoten: {
      buatKunci: () => `kunci-${++n}`,
      tidur: async (ms) => {
        tidur.push(ms);
      },
      penyimpan,
      ...opsi,
    },
  });
  return { kirim, panggilan, tidur, penyimpan, sesi };
}

const bayar = (kirim: ReturnType<typeof pasang>["kirim"], isi: unknown = { jumlah: 50000 }) =>
  kirim(`${ALAMAT}/lapangan/bayar`, { method: "POST", body: JSON.stringify(isi) });

/** Seperti `fetch` asli: menolak saat sinyal dibatalkan — juga bila sudah dibatalkan sebelumnya. */
const tolakBilaDibatalkan = (init: RequestInit) =>
  new Promise<Response>((_, tolak) => {
    const batal = () => tolak(new DOMException("dibatalkan", "AbortError"));
    if (init.signal?.aborted) batal();
    else init.signal?.addEventListener("abort", batal);
  });

const GALAT_JARINGAN = new TypeError("Network request failed");

describe("transport idempoten — kapan kunci dipakai", () => {
  test("operasi di daftar diberi Idempotency-Key; bacaan, operasi lain, dan tanpa sesi tidak", async () => {
    const t = pasang([json({ ok: true })]);
    await bayar(t.kirim);
    await t.kirim(`${ALAMAT}/lapangan/hari-ini`);
    await t.kirim(`${ALAMAT}/foto`, { method: "POST", body: "x" });
    await t.kirim(`${ALAMAT}/auth/login`, { method: "POST", body: "{}" });
    expect(t.panggilan.map((p) => p.kunci)).toEqual(["kunci-1", null, null, null]);

    const tanpaSesi = pasang([json({ ok: true })], {}, null);
    await bayar(tanpaSesi.kirim);
    expect(tanpaSesi.panggilan[0]?.kunci).toBeNull();
  });

  test("alamat dengan awalan (/api) dan query dikenali; alamat lain tidak", async () => {
    const t = buatTransport({
      alamat: "http://x/api",
      sesi: buatSesi({ bacaSinkron: () => awal, tulis: () => {} }),
      fetch: ((_: unknown, init?: RequestInit) => {
        kunci.push(new Headers(init?.headers).get("Idempotency-Key"));
        return Promise.resolve(json({}));
      }) as unknown as typeof fetch,
    });
    const kunci: (string | null)[] = [];
    await t("http://x/api/nasabah/ab12/penarikan-tabungan?x=1", { method: "POST", body: "{}" });
    await t("http://x.jahat/api/lapangan/bayar", { method: "POST", body: "{}" });
    await t(new URL("http://x/api/lapangan/bayar"), { method: "POST", body: "{}" });
    expect(kunci.map((k) => k !== null)).toEqual([true, false, true]);
  });

  test("isi bukan teks (FormData) dan kunci buatan pemanggil dibiarkan, tanpa pengulangan", async () => {
    const t = pasang([GALAT_JARINGAN]);
    await expect(
      t.kirim(`${ALAMAT}/lapangan/bayar`, { method: "POST", body: new FormData() }),
    ).rejects.toBe(GALAT_JARINGAN);
    await expect(
      t.kirim(`${ALAMAT}/lapangan/bayar`, {
        method: "POST",
        body: "{}",
        headers: { "Idempotency-Key": "milik-pemanggil" },
      }),
    ).rejects.toBe(GALAT_JARINGAN);
    expect(t.panggilan).toHaveLength(2);
    expect(t.panggilan[1]?.kunci).toBe("milik-pemanggil");
    expect(t.tidur).toEqual([]);
  });

  test("idempoten: false mematikan semuanya", async () => {
    const { fetchTiruan, panggilan } = jaringan(GALAT_JARINGAN);
    const kirim = buatTransport({
      alamat: ALAMAT,
      sesi: buatSesi({ bacaSinkron: () => awal, tulis: () => {} }),
      fetch: fetchTiruan,
      idempoten: false,
    });
    await expect(bayar(kirim)).rejects.toBe(GALAT_JARINGAN);
    expect(panggilan).toHaveLength(1);
    expect(panggilan[0]?.kunci).toBeNull();
  });
});

describe("transport idempoten — pengulangan otomatis", () => {
  test("jaringan putus lalu pulih: kunci yang sama, jeda 1 dtk, kunci dibuang sesudah sukses", async () => {
    const t = pasang([GALAT_JARINGAN, json({ id: "t1" }, 200)]);
    const res = await bayar(t.kirim);
    expect(res.status).toBe(200);
    expect(t.panggilan.map((p) => p.kunci)).toEqual(["kunci-1", "kunci-1"]);
    expect(t.tidur).toEqual([1000]);
    // Ketukan serupa berikutnya = kejadian baru → kunci baru.
    await bayar(t.kirim);
    expect(t.panggilan.at(-1)?.kunci).toBe("kunci-2");
  });

  test("gerbang 502/503/504 diulang dengan kunci yang sama; jeda berlipat", async () => {
    const t = pasang([json({}, 502), json({}, 503), json({}, 504), json({ ok: 1 })]);
    const res = await bayar(t.kirim);
    expect(res.status).toBe(200);
    expect(new Set(t.panggilan.map((p) => p.kunci))).toEqual(new Set(["kunci-1"]));
    expect(t.panggilan).toHaveLength(4);
    expect(t.tidur).toEqual([1000, 2000, 4000]);
  });

  test("jawaban pasti tidak diulang: 400/401/403/404/409/422/500", async () => {
    for (const status of [400, 403, 404, 409, 422, 500]) {
      const t = pasang([json({ kode: "X", pesan: "y" }, status)]);
      const res = await bayar(t.kirim);
      expect(res.status).toBe(status);
      expect(t.panggilan).toHaveLength(1);
      expect(t.tidur).toEqual([]);
      // Galat pasti → kunci dibuang; ketukan ulang memakai kunci baru.
      await bayar(t.kirim);
      expect(t.panggilan[1]?.kunci).toBe("kunci-2");
    }
  });

  test("menyerah sesudah batas: galat jaringan dilempar, kunci tetap tertunda untuk ketukan ulang", async () => {
    const t = pasang([GALAT_JARINGAN]);
    await expect(bayar(t.kirim)).rejects.toBe(GALAT_JARINGAN);
    expect(t.panggilan).toHaveLength(4); // 1 + 3 ulangan
    expect(t.tidur).toEqual([1000, 2000, 4000]);
    // Pengguna mengetuk lagi isi yang sama → kunci yang sama (server tak mencatat dua kali).
    await expect(bayar(t.kirim)).rejects.toBe(GALAT_JARINGAN);
    expect(new Set(t.panggilan.map((p) => p.kunci))).toEqual(new Set(["kunci-1"]));
    // Isi berbeda = permintaan lain → kunci lain.
    await expect(bayar(t.kirim, { jumlah: 75000 })).rejects.toBe(GALAT_JARINGAN);
    expect(t.panggilan.at(-1)?.kunci).toBe("kunci-2");
  });

  test("menyerah pada 503: jawaban terakhir dikembalikan apa adanya", async () => {
    const t = pasang([json({}, 503)], { ulang: { maks: 1 } });
    const res = await bayar(t.kirim);
    expect(res.status).toBe(503);
    expect(t.panggilan).toHaveLength(2);
  });

  test("urutan properti isi tidak mengubah identitas permintaan", async () => {
    const t = pasang([GALAT_JARINGAN], { ulang: { maks: 0 } });
    await expect(bayar(t.kirim, { a: 1, b: 2 })).rejects.toBeDefined();
    await expect(bayar(t.kirim, { b: 2, a: 1 })).rejects.toBeDefined();
    expect(t.panggilan.map((p) => p.kunci)).toEqual(["kunci-1", "kunci-1"]);
  });

  test("dua ketukan bersamaan atas isi yang sama berbagi satu kunci", async () => {
    const t = pasang([json({ ok: 1 })]);
    await Promise.all([bayar(t.kirim), bayar(t.kirim)]);
    expect(t.panggilan.map((p) => p.kunci)).toEqual(["kunci-1", "kunci-1"]);
  });

  test("kunci lewat umur dianggap kejadian baru", async () => {
    let waktu = 0;
    const t = pasang([GALAT_JARINGAN], {
      ulang: { maks: 0 },
      sekarang: () => waktu,
      umurKunciMs: 1000,
    });
    await expect(bayar(t.kirim)).rejects.toBeDefined();
    waktu = 999;
    await expect(bayar(t.kirim)).rejects.toBeDefined();
    waktu = 1001;
    await expect(bayar(t.kirim)).rejects.toBeDefined();
    expect(t.panggilan.map((p) => p.kunci)).toEqual(["kunci-1", "kunci-1", "kunci-2"]);
  });

  test("pengguna lain di perangkat yang sama tidak memakai kunci tertunda orang lain", async () => {
    const penyimpan = buatPenyimpanKunci();
    let n = 0;
    const buatKunci = () => `kunci-${++n}`; // satu pembangkit untuk kedua pengguna
    const a = pasang([GALAT_JARINGAN], { ulang: { maks: 0 }, penyimpan, buatKunci });
    await expect(bayar(a.kirim)).rejects.toBeDefined();
    const lain: Sesi = { ...awal, pengguna: { id: "pengguna-2" } as unknown as Sesi["pengguna"] };
    const b = pasang([GALAT_JARINGAN], { ulang: { maks: 0 }, penyimpan, buatKunci }, lain);
    await expect(bayar(b.kirim)).rejects.toBeDefined();
    expect(a.panggilan[0]?.kunci).toBe("kunci-1");
    expect(b.panggilan[0]?.kunci).toBe("kunci-2"); // isi sama, pengguna lain → kunci lain
    // Pengguna pertama kembali: kunci tertunda miliknya masih yang lama.
    await expect(bayar(a.kirim)).rejects.toBeDefined();
    expect(a.panggilan[1]?.kunci).toBe("kunci-1");
  });

  test("token kedaluwarsa di tengah: refresh lalu kirim ulang dengan kunci yang sama", async () => {
    let refresh = 0;
    const lihat: (string | null)[] = [];
    const fetchTiruan = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (String(input).endsWith("/auth/refresh")) {
        refresh++;
        return json({ tokenAkses: "akses-2", tokenSegar: "segar-2" });
      }
      const h = new Headers(init?.headers);
      lihat.push(h.get("Idempotency-Key"));
      return h.get("Authorization") === "Bearer akses-2"
        ? json({ ok: true })
        : json({ kode: "TOKEN_AKSES_TIDAK_SAH", pesan: "kedaluwarsa" }, 401);
    }) as unknown as typeof fetch;
    const kirim = buatTransport({
      alamat: ALAMAT,
      sesi: buatSesi({ bacaSinkron: () => awal, tulis: () => {} }),
      fetch: fetchTiruan,
      idempoten: { buatKunci: () => "kunci-tetap" },
    });
    const res = await bayar(kirim);
    expect(res.status).toBe(200);
    expect(refresh).toBe(1);
    expect(lihat).toEqual(["kunci-tetap", "kunci-tetap"]);
  });
});

describe("transport idempoten — batas waktu dan pembatalan", () => {
  test("percobaan yang menggantung dibatalkan lalu diulang dengan kunci yang sama", async () => {
    const t = pasang([tolakBilaDibatalkan, json({ ok: 1 })], { batasWaktuMs: 10 });
    const res = await bayar(t.kirim);
    expect(res.status).toBe(200);
    expect(t.panggilan.map((p) => p.kunci)).toEqual(["kunci-1", "kunci-1"]);
  });

  test("dibatalkan pemanggil: tidak diulang", async () => {
    const pengendali = new AbortController();
    const t = pasang([tolakBilaDibatalkan], { batasWaktuMs: 10_000 });
    const kerja = t.kirim(`${ALAMAT}/lapangan/bayar`, {
      method: "POST",
      body: "{}",
      signal: pengendali.signal,
    });
    setTimeout(() => pengendali.abort(), 5); // dibatalkan saat permintaan sedang berjalan
    await expect(kerja).rejects.toBeDefined();
    expect(t.panggilan).toHaveLength(1);
    expect(t.tidur).toEqual([]);
  });
});

describe("transport idempoten — penyimpan", () => {
  test("kunci disimpan sebelum dikirim dan bertahan di medium selama tertunda", async () => {
    const isi = { teks: null as string | null };
    const medium: MediumKunci = {
      baca: () => isi.teks,
      tulis: (x) => {
        isi.teks = x;
      },
    };
    const t = pasang([GALAT_JARINGAN], {
      ulang: { maks: 0 },
      penyimpan: buatPenyimpanKunci(medium),
    });
    await expect(bayar(t.kirim)).rejects.toBeDefined();
    const tersimpan = Object.values(
      JSON.parse(isi.teks as string) as Record<string, { kunci: string }>,
    );
    expect(tersimpan.map((x) => x.kunci)).toEqual(["kunci-1"]);

    // Aplikasi dibuka ulang: penyimpan baru dari medium yang sama → kunci yang sama dipakai lagi.
    const sesudah = pasang([json({ ok: 1 })], { penyimpan: buatPenyimpanKunci(medium) });
    await bayar(sesudah.kirim);
    expect(sesudah.panggilan[0]?.kunci).toBe("kunci-1");
  });

  test("penyimpan yang rusak tidak menggagalkan permintaan", async () => {
    const rusak = {
      ambil: () => Promise.reject(new Error("ambil")),
      simpan: () => Promise.reject(new Error("simpan")),
      hapus: () => Promise.reject(new Error("hapus")),
    };
    const t = pasang([json({ ok: 1 })], { penyimpan: rusak });
    const res = await bayar(t.kirim);
    expect(res.status).toBe(200);
    expect(t.panggilan[0]?.kunci).toBe("kunci-1");
  });
});
