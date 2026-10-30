import { describe, expect, test } from "bun:test";
import { kunciIdempotenSchema } from "@opennael/contracts";
import { buatPenyimpanKunci, kanonikJson, type MediumKunci, sidikRingkas } from "./kunci-tertunda";
import { buatUuid } from "./uuid";

function mediumTiruan(awal: string | null = null) {
  const isi = { teks: awal, tulis: 0 };
  const medium: MediumKunci = {
    baca: () => isi.teks,
    tulis: (t) => {
      isi.teks = t;
      isi.tulis++;
    },
  };
  return { medium, isi };
}

describe("buatPenyimpanKunci", () => {
  test("tanpa medium: simpan, ambil, hapus di memori", async () => {
    const p = buatPenyimpanKunci();
    expect(await p.ambil("a")).toBeUndefined();
    await p.simpan("a", { kunci: "k1", dibuat: 1 });
    expect(await p.ambil("a")).toEqual({ kunci: "k1", dibuat: 1 });
    await p.hapus("a");
    expect(await p.ambil("a")).toBeUndefined();
  });

  test("dengan medium: ditulis saat simpan, dikosongkan saat habis, dibaca penyimpan baru", async () => {
    const { medium, isi } = mediumTiruan();
    const p = buatPenyimpanKunci(medium);
    await p.simpan("a", { kunci: "k1", dibuat: 5 });
    expect(JSON.parse(isi.teks as string)).toEqual({ a: { kunci: "k1", dibuat: 5 } });
    // Penyimpan baru (aplikasi dibuka ulang) membaca kunci yang tertunda.
    const baru = buatPenyimpanKunci(medium);
    expect(await baru.ambil("a")).toEqual({ kunci: "k1", dibuat: 5 });
    await baru.hapus("a");
    await baru.ambil("a"); // memberi kesempatan tulis antrean selesai
    await new Promise((r) => setTimeout(r, 0));
    expect(isi.teks).toBeNull();
  });

  test("isi medium rusak atau bentuk salah diabaikan", async () => {
    for (const rusak of ["{bukan json", "[]", '{"a":{"kunci":1}}', "null"]) {
      const p = buatPenyimpanKunci(mediumTiruan(rusak).medium);
      expect(await p.ambil("a")).toBeUndefined();
    }
  });

  test("medium yang gagal membaca/menulis tidak menggagalkan penyimpan", async () => {
    const medium: MediumKunci = {
      baca: () => {
        throw new Error("baca");
      },
      tulis: () => Promise.reject(new Error("tulis")),
    };
    const p = buatPenyimpanKunci(medium);
    await p.simpan("a", { kunci: "k", dibuat: 1 });
    expect(await p.ambil("a")).toEqual({ kunci: "k", dibuat: 1 });
    await p.hapus("a");
    expect(await p.ambil("a")).toBeUndefined();
  });

  test("melebihi batas: yang paling lama dibuang", async () => {
    const p = buatPenyimpanKunci(undefined, { maks: 2 });
    await p.simpan("tua", { kunci: "1", dibuat: 1 });
    await p.simpan("tengah", { kunci: "2", dibuat: 2 });
    await p.simpan("baru", { kunci: "3", dibuat: 3 });
    expect(await p.ambil("tua")).toBeUndefined();
    expect(await p.ambil("tengah")).toBeDefined();
    expect(await p.ambil("baru")).toBeDefined();
  });
});

describe("kanonikJson & sidikRingkas", () => {
  test("urutan properti tidak mengubah sidik; isi berbeda mengubahnya", () => {
    expect(kanonikJson('{"b":1,"a":{"d":2,"c":[3,{"y":1,"x":2}]}}')).toBe(
      '{"a":{"c":[3,{"x":2,"y":1}],"d":2},"b":1}',
    );
    expect(sidikRingkas(kanonikJson('{"a":1,"b":2}'))).toBe(
      sidikRingkas(kanonikJson('{"b":2,"a":1}')),
    );
    expect(sidikRingkas('{"a":1}')).not.toBe(sidikRingkas('{"a":2}'));
    expect(sidikRingkas("x")).toMatch(/^[0-9a-z]+$/);
  });

  test("isi bukan JSON dipakai apa adanya", () => {
    expect(kanonikJson("bukan json")).toBe("bukan json");
    expect(kanonikJson("")).toBe("");
  });
});

describe("buatUuid", () => {
  test("UUID v4 sah menurut skema server, dengan atau tanpa crypto", () => {
    expect(kunciIdempotenSchema.safeParse(buatUuid()).success).toBe(true);
    const tanpaUuid = {
      getRandomValues: <T extends ArrayBufferView>(x: T) => crypto.getRandomValues(x),
    };
    for (const sumber of [tanpaUuid, {}, undefined]) {
      const u = buatUuid(sumber as never);
      expect(kunciIdempotenSchema.safeParse(u).success, u).toBe(true);
      expect(u[14]).toBe("4");
      expect("89ab").toContain(u[19] as string);
    }
    expect(new Set(Array.from({ length: 50 }, () => buatUuid({} as never))).size).toBe(50);
  });
});
