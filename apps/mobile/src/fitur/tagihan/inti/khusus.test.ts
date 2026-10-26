import { describe, expect, test } from "bun:test";
import type { Peristiwa } from "@opennael/contracts";
import { ringkasJatuhTempo, susunMingguan, susunTempo } from "./khusus";

// Kamis 29 Okt 2026.
const KAMIS = "2026-10-29";

function peristiwa(tanggal: string, isi: Partial<Peristiwa> = {}): Peristiwa {
  const orang = { id: crypto.randomUUID(), nama: "x" };
  return {
    id: crypto.randomUUID(),
    pinjamanId: crypto.randomUUID(),
    nasabah: orang,
    pencatat: orang,
    tanggal,
    kategori: "angsuran",
    setoranMurni: 100_000,
    setoranPelunasan: 0,
    tabunganKeluar: 0,
    storting: 100_000,
    saldoSesudah: 0,
    alasanLibur: null,
    dibuatAt: `${tanggal}T10:00:00Z`,
    ...isi,
  };
}

describe("kotak mingguan", () => {
  const p = { tanggalAkad: "2026-10-01", tenor: 4, angsuranKe: 1 };

  test("libur menggeser jadwal; terlewat, hari ini, nanti", () => {
    const m = susunMingguan(
      p,
      [peristiwa("2026-10-15", { kategori: "libur", storting: 0 }), peristiwa("2026-10-08")],
      KAMIS,
    );
    expect(m.kotak.map((k) => [k.label, k.status, k.teks])).toEqual([
      ["8/10", "bayar", "100k"],
      ["15/10", "libur", "X"],
      ["22/10", "lewat", "-"],
      ["29/10", "hariini", "-"],
      ["5/11", "nanti", "-"],
    ]);
    expect(m.kabar).toBe("1 minggu terlewat (22/10)");
    expect(m.kabarBahaya).toBe(true);
  });

  test("riwayat belum dimuat: bayar bertanda ✓; kabar tagih berikutnya", () => {
    const m = susunMingguan({ ...p, angsuranKe: 3 }, undefined, KAMIS);
    expect(m.kotak.map((k) => k.teks)).toEqual(["✓", "✓", "✓", "-"]);
    expect(m.kabar).toBe("Hari ini hari tagihnya");
    const lusa = susunMingguan({ ...p, angsuranKe: 4 }, undefined, KAMIS);
    expect(lusa.kabar).toBeNull();
    const awal = susunMingguan({ ...p, angsuranKe: 0 }, undefined, "2026-10-02");
    expect(awal.kabar).toBe("Tagih berikutnya Kam 8 Okt");
    expect(awal.kabarBahaya).toBe(false);
  });
});

describe("tempoan", () => {
  test("hitung mundur, keadaan, dan garis waktu", () => {
    const t = susunTempo(
      { tanggalAkad: "2026-10-01", tenor: 30, jatuhTempo: null, status: "berjalan" },
      KAMIS,
    );
    expect(t).toMatchObject({
      jatuhTempo: "2026-10-31",
      sisaHari: 2,
      keadaan: "segera",
      hitungMundur: "H-2",
      jatuhTempoHariTeks: "Sab 31 Okt",
      akadTeks: "1 Okt",
    });
    expect(t.jalan).toBeCloseTo(28 / 30);
    const macet = susunTempo(
      { tanggalAkad: "2026-09-20", tenor: 30, jatuhTempo: "2026-10-20", status: "macet" },
      KAMIS,
    );
    expect(macet.keadaan).toBe("macet");
    expect(macet.hitungMundur).toBe("MACET · LEWAT 9 HARI");
    expect(macet.jalan).toBe(1);
  });

  test("ringkasan jatuh tempo: lewat, hari ini, 7 hari ke depan", () => {
    const t = (jatuhTempo: string) =>
      susunTempo({ tanggalAkad: "2026-10-01", tenor: 30, jatuhTempo, status: "berjalan" }, KAMIS);
    expect(
      ringkasJatuhTempo([t("2026-10-20"), t(KAMIS), t("2026-11-05"), t("2026-11-20")]),
    ).toEqual({ lewat: 1, hariIni: 1, pekan: 1, berjalan: 4 });
  });
});
