import { describe, expect, test } from "bun:test";
import type { KalenderBulan, RiwayatHari } from "@opennael/contracts";
import { daftarBulan } from "../../../lib/bulan";
import {
  daftarAbsen,
  keadaanTanggal,
  ringkasAbsensi,
  sorotKehadiran,
  susunKalender,
} from "./absensi";

// November 2026: 1 Nov = Minggu. Hari kerja Senin–Sabtu; 17 Nov libur kantor.
const HARI_INI = "2026-11-28"; // Sabtu
const kerja: string[] = [];
for (let d = 1; d <= 30; d++) {
  const t = `2026-11-${String(d).padStart(2, "0")}`;
  const pekan = new Date(`${t}T00:00:00Z`).getUTCDay();
  if (pekan !== 0 && t !== "2026-11-17") kerja.push(t);
}
const KALENDER: KalenderBulan = {
  hariTagih: kerja,
  liburKantor: [{ tanggal: "2026-11-17", alasan: "rapat" }],
};

const hari = (tanggal: string, ubah: Partial<RiwayatHari> = {}): RiwayatHari => ({
  tanggal,
  absensi: "masuk_kerja",
  alasanTidakKerja: null,
  kasLapangan: 1_000_000,
  uangJalan: 50_000,
  laporanDibukaAt: null,
  absenAt: `${tanggal}T00:30:00.000Z`,
  tekorLama: 0,
  serahTerima: null,
  ...ubah,
});

const bulanIni = daftarBulan(HARI_INI)[0];
if (!bulanIni) throw new Error("bulan");

describe("keadaan tanggal", () => {
  test("catatan menang; libur; bukan hari kerja; hari ini belum; lewat tak absen; mendatang", () => {
    expect(keadaanTanggal("2026-11-02", HARI_INI, KALENDER, hari("2026-11-02"))).toBe("masuk");
    expect(
      keadaanTanggal(
        "2026-11-03",
        HARI_INI,
        KALENDER,
        hari("2026-11-03", { absensi: "tidak_kerja" }),
      ),
    ).toBe("tidak-kerja");
    expect(keadaanTanggal("2026-11-17", HARI_INI, KALENDER, undefined)).toBe("libur");
    expect(keadaanTanggal("2026-11-08", HARI_INI, KALENDER, undefined)).toBe("bukan-kerja");
    expect(keadaanTanggal(HARI_INI, HARI_INI, KALENDER, undefined)).toBe("belum");
    expect(keadaanTanggal("2026-11-04", HARI_INI, KALENDER, undefined)).toBe("tak-absen");
    expect(keadaanTanggal("2026-11-30", HARI_INI, KALENDER, undefined)).toBe("mendatang");
  });
});

describe("kalender & kehadiran bulan ini", () => {
  const riwayat = [
    hari("2026-11-02"),
    hari("2026-11-03", { absensi: "tidak_kerja", alasanTidakKerja: "sakit" }),
    hari("2026-11-05"),
  ];
  const pekan = susunKalender(bulanIni, HARI_INI, KALENDER, riwayat);

  test("pekan Senin–Minggu: 1 Nov (Minggu) di kolom ketujuh, 30 Nov (Senin) baris keenam", () => {
    expect(pekan).toHaveLength(6);
    expect(pekan[0]?.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(pekan[0]?.[6]).toMatchObject({ angka: 1, keadaan: "bukan-kerja" });
    expect(pekan[5]?.[0]).toMatchObject({ angka: 30, keadaan: "mendatang" });
    expect(pekan[5]?.slice(1)).toEqual([null, null, null, null, null, null]);
  });

  test("kehadiran: hari kerja lewat (tanpa hari ini yang belum absen), libur tak dihitung", () => {
    // Hari kerja 1–27 Nov: 23 (Senin–Sabtu) − 1 libur = 22 (28 Nov = hari ini, belum absen).
    const r = ringkasAbsensi(pekan);
    expect(r).toEqual({ masuk: 2, tidakKerja: 1, takAbsen: 19, hariKerja: 22, persen: 9 });
    expect(sorotKehadiran(r, true)).toMatchObject({
      nilai: 2,
      satuan: "hari",
      lencana: "9% hadir",
      rumus: "masuk dari 22 hari kerja kantor s/d hari ini",
    });
  });

  test("daftar: terbaru dulu, jam absen & alasan; tak absen tanpa jam", () => {
    const d = daftarAbsen(pekan, riwayat);
    expect(d[0]).toMatchObject({ tanggal: "2026-11-27", keadaan: "tak-absen", absenAt: null });
    expect(d.find((b) => b.tanggal === "2026-11-03")).toMatchObject({
      keadaan: "tidak-kerja",
      alasan: "sakit",
    });
    expect(d.at(-1)).toMatchObject({ tanggal: "2026-11-02", keadaan: "masuk" });
  });
});
