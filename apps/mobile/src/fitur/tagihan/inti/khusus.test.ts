import { describe, expect, test } from "bun:test";
import type { Peristiwa } from "@opennael/contracts";
import { jatuhTempoDari, ringkasJatuhTempo, susunMingguan, susunTempo } from "./khusus";

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

describe("tempoan (hari masuk kerja, A4)", () => {
  const tempo = (
    hariTempo: number,
    jatuhTempo: string | null = null,
    batasTempo: string | null = null,
  ) => ({
    tanggalAkad: "2026-10-20",
    jatuhTempo,
    batasTempo,
    hariTempo,
    status: "berjalan" as const,
  });

  test('sebelum jatuh tempo: sisa hari kerja ("3 HARI LAGI"), garis waktu sebagian', () => {
    const t = susunTempo(tempo(3), KAMIS);
    expect(t).toMatchObject({
      jatuhTempo: null,
      sisaHari: 3,
      keadaan: "nanti",
      hitungMundur: "3 HARI LAGI",
      jatuhTempoTeks: "Hari Ke-6",
      jatuhTempoHariTeks: "hari kerja ke-6",
      akadTeks: "20 Okt",
    });
    expect(t.jalan).toBeCloseTo(0.5);
    expect(susunTempo(tempo(5), KAMIS)).toMatchObject({
      keadaan: "segera",
      hitungMundur: "1 HARI LAGI",
    });
  });

  test("jatuh tempo hari ini, meleset, batas lunas, macet", () => {
    expect(susunTempo(tempo(6, KAMIS), KAMIS)).toMatchObject({
      sisaHari: 0,
      keadaan: "hariini",
      hitungMundur: "HARI INI",
      jatuhTempoHariTeks: "Kam 29 Okt",
      jalan: 1,
    });
    expect(susunTempo(tempo(8, "2026-10-27"), KAMIS)).toMatchObject({
      sisaHari: -2,
      keadaan: "meleset",
      hitungMundur: "MELESET 2 HARI",
    });
    expect(susunTempo(tempo(10, "2026-10-23", KAMIS), KAMIS)).toMatchObject({
      keadaan: "batas",
      hitungMundur: "WAJIB LUNAS",
    });
    const macet = susunTempo({ ...tempo(11, "2026-10-22", "2026-10-28"), status: "macet" }, KAMIS);
    expect(macet).toMatchObject({ keadaan: "macet", hitungMundur: "MACET" });
  });

  test("ringkasan jatuh tempo: meleset, hari ini, belum jatuh tempo", () => {
    expect(
      ringkasJatuhTempo([
        susunTempo(tempo(8, "2026-10-27"), KAMIS),
        susunTempo(tempo(6, KAMIS), KAMIS),
        susunTempo(tempo(2), KAMIS),
        susunTempo(tempo(0), KAMIS),
      ]),
    ).toEqual({ meleset: 1, hariIni: 1, belum: 2, berjalan: 4 });
  });
});

describe("jatuhTempoDari — hanya tempoan yang dihitung", () => {
  const p = (
    jenis: "harian" | "mingguan" | "tempoan",
    jatuhTempo: string | null,
    hariTempo = 0,
  ) => ({
    jenis,
    tanggalAkad: "2026-10-01",
    jatuhTempo,
    batasTempo: null,
    hariTempo,
    status: "berjalan" as const,
  });
  test("harian & mingguan tak ikut; tempoan dipilah meleset/hari ini/belum", () => {
    expect(
      jatuhTempoDari(
        [
          p("harian", null),
          p("mingguan", null),
          p("tempoan", "2026-10-20", 9),
          p("tempoan", KAMIS, 6),
          p("tempoan", null, 2),
        ],
        KAMIS,
      ),
    ).toEqual({ meleset: 1, hariIni: 1, belum: 1, berjalan: 3 });
  });
  test("tanpa tempoan: semua nol", () => {
    expect(jatuhTempoDari([p("harian", null)], KAMIS)).toEqual({
      meleset: 0,
      hariIni: 0,
      belum: 0,
      berjalan: 0,
    });
  });
});
