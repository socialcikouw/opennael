import { describe, expect, test } from "bun:test";
import type { Ambil } from "../bahan";
import type { Klien } from "../klien";
import { kunci } from "../kunci";
import { buatKueri } from "./index";

/**
 * Klien palsu: setiap rantai `api.a.b.$get(x)` tidak ke jaringan, tetapi
 * menjawab `{ jalur: "a.b.$get", argumen: [x] }` — jadi uji memeriksa kueri
 * memanggil rute dan parameter yang dimaksud, bukan sekadar bentuk kuncinya.
 */
type Panggilan = { jalur: string; argumen: unknown[] };

function rantai(jalur: string[]): unknown {
  return new Proxy(() => {}, {
    get: (_, nama) => rantai([...jalur, String(nama)]),
    apply: (_, __, argumen): Panggilan => ({ jalur: jalur.join("."), argumen }),
  });
}

function buatPalsu(jawab: (p: Panggilan) => unknown = (p) => p) {
  const ambil = async (kirim: () => Promise<unknown>) => jawab((await kirim()) as Panggilan);
  return buatKueri({ api: rantai([]) as Klien, ambil: ambil as unknown as Ambil });
}

const kueri = buatPalsu();

type Opsi = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  [lain: string]: unknown;
};
const lihat = (opsi: unknown) => opsi as Opsi;
const jalankan = (opsi: unknown) => lihat(opsi).queryFn();
const kunciDari = (opsi: unknown) => lihat(opsi).queryKey;

const T = "2026-11-01";
const Z = "2026-11-30";

/** [kueri, kunci yang diharapkan, jalur rute, argumen panggilan] */
const KASUS: [string, unknown, readonly unknown[], string, unknown[]][] = [
  [
    "pengguna.semua",
    kueri.pengguna.semua(),
    ["pengguna", "semua"],
    "identitas.pengguna.$get",
    [{ query: { termasukNonaktif: "ya" } }],
  ],
  [
    "pengguna.kolektor",
    kueri.pengguna.kolektor(),
    ["pengguna", "kolektor"],
    "identitas.pengguna.$get",
    [{ query: { peran: "kolektor" } }],
  ],
  [
    "perangkat.daftar(false)",
    kueri.perangkat.daftar(false),
    ["perangkat", false],
    "identitas.auth.perangkat.$get",
    [{ query: {} }],
  ],
  [
    "perangkat.daftar(true)",
    kueri.perangkat.daftar(true),
    ["perangkat", true],
    "identitas.auth.perangkat.$get",
    [{ query: { termasukDiputus: "true" } }],
  ],
  ["kantor.profil", kueri.kantor.profil(), ["kantor"], "kantor.kantor.$get", []],
  [
    "kantor.pekanKerja",
    kueri.kantor.pekanKerja(),
    ["kantor", "pekan-kerja"],
    "kantor.kantor.pekan-kerja.$get",
    [],
  ],
  [
    "wilayah.daftar()",
    kueri.wilayah.daftar(),
    ["wilayah", false],
    "kantor.wilayah.$get",
    [{ query: {} }],
  ],
  [
    "wilayah.daftar(true)",
    kueri.wilayah.daftar(true),
    ["wilayah", true],
    "kantor.wilayah.$get",
    [{ query: { baru: "7" } }],
  ],
  ["kampung", kueri.kampung(), ["kampung"], "kantor.lapangan.kampung.$get", []],
  [
    "liburKantor.daftar",
    kueri.liburKantor.daftar(T, Z),
    ["libur-kantor", T, Z],
    "kantor.libur-kantor.$get",
    [{ query: { tanggalMulai: T, tanggalSelesai: Z } }],
  ],
  [
    "kebijakan.aktif",
    kueri.kebijakan.aktif(),
    ["kebijakan", "aktif"],
    "kantor.kebijakan.aktif.$get",
    [],
  ],
  [
    "harian.hariKolektor",
    kueri.harian.hariKolektor(T),
    ["harian", "hari-kolektor", T],
    "hariKolektor.hari-kolektor.$get",
    [{ query: { tanggal: T } }],
  ],
  [
    "harian.transaksi(semua)",
    kueri.harian.transaksi(T),
    ["harian", "transaksi", T, ""],
    "hariKolektor.transaksi.$get",
    [{ query: { tanggal: T } }],
  ],
  [
    "harian.transaksi(kolektor)",
    kueri.harian.transaksi(T, "k1"),
    ["harian", "transaksi", T, "k1"],
    "hariKolektor.transaksi.$get",
    [{ query: { tanggal: T, kolektorId: "k1" } }],
  ],
  [
    "harian.transfer",
    kueri.harian.transfer(T),
    ["harian", "transfer", T],
    "hariKolektor.transfer-setoran.$get",
    [{ query: { tanggal: T } }],
  ],
  [
    "harian.biaya",
    kueri.harian.biaya(T),
    ["harian", "biaya", T],
    "hariKolektor.biaya-tak-terduga.$get",
    [{ query: { tanggalMulai: T, tanggalSelesai: T, termasukBatal: "ya" } }],
  ],
  [
    "ruteKolektor.urutan",
    kueri.ruteKolektor.urutan("k1"),
    ["rute-kolektor", "k1"],
    "hariKolektor.rute-kolektor.$get",
    [{ query: { kolektorId: "k1" } }],
  ],
  [
    "nasabah.daftar()",
    kueri.nasabah.daftar(),
    ["nasabah", "daftar", null, null],
    "pembiayaan.nasabah.$get",
    [{ query: {} }],
  ],
  [
    "nasabah.daftar(cari, kolektor)",
    kueri.nasabah.daftar("ani", "k1"),
    ["nasabah", "daftar", "ani", "k1"],
    "pembiayaan.nasabah.$get",
    [{ query: { cari: "ani", kolektorId: "k1" } }],
  ],
  [
    "nasabah.bebas",
    kueri.nasabah.bebas("an"),
    ["nasabah", "bebas", "an"],
    "pembiayaan.nasabah.$get",
    [{ query: { cari: "an", bebas: "ya" } }],
  ],
  [
    "nasabah.serupa(nama, kampung)",
    kueri.nasabah.serupa("ani", "Sukamaju"),
    ["nasabah", "serupa", "ani", "Sukamaju", null],
    "pembiayaan.nasabah.serupa.$get",
    [{ query: { nama: "ani", kampung: "Sukamaju" } }],
  ],
  [
    "nasabah.serupa(nama, NIK)",
    kueri.nasabah.serupa("ani", "", "3201000000000001"),
    ["nasabah", "serupa", "ani", "", "3201000000000001"],
    "pembiayaan.nasabah.serupa.$get",
    [{ query: { nama: "ani", nik: "3201000000000001" } }],
  ],
  [
    "nasabah.neraca",
    kueri.nasabah.neraca("n1"),
    ["nasabah", "neraca", "n1"],
    "pembiayaan.nasabah.:id.neraca.$get",
    [{ param: { id: "n1" } }],
  ],
  [
    "nasabah.buku",
    kueri.nasabah.buku("n1"),
    ["nasabah", "buku", "n1"],
    "pembiayaan.nasabah.:id.buku.$get",
    [{ param: { id: "n1" } }],
  ],
  [
    "nasabah.penarikanTabungan",
    kueri.nasabah.penarikanTabungan("n1"),
    ["nasabah", "penarikan", "n1"],
    "pembiayaan.nasabah.:id.penarikan-tabungan.$get",
    [{ param: { id: "n1" } }],
  ],
  [
    "nasabah.koreksiTabungan",
    kueri.nasabah.koreksiTabungan("n1"),
    ["nasabah", "koreksi", "n1"],
    "pembiayaan.nasabah.:id.koreksi-tabungan.$get",
    [{ param: { id: "n1" } }],
  ],
  [
    "pinjaman.daftar()",
    kueri.pinjaman.daftar("aktif"),
    ["pinjaman", "daftar", "aktif", null],
    "pembiayaan.pinjaman.$get",
    [{ query: { status: "aktif" } }],
  ],
  [
    "pinjaman.daftar(kolektor)",
    kueri.pinjaman.daftar("semua", "k1"),
    ["pinjaman", "daftar", "semua", "k1"],
    "pembiayaan.pinjaman.$get",
    [{ query: { status: "semua", kolektorId: "k1" } }],
  ],
  [
    "pinjaman.aktif",
    kueri.pinjaman.aktif(),
    ["pinjaman", "aktif"],
    "pembiayaan.pinjaman.$get",
    [{ query: { status: "aktif" } }],
  ],
  [
    "pinjaman.rincian",
    kueri.pinjaman.rincian("p1"),
    ["pinjaman", "p1"],
    "pembiayaan.pinjaman.:id.$get",
    [{ param: { id: "p1" } }],
  ],
  [
    "pinjaman.riwayatStatus",
    kueri.pinjaman.riwayatStatus("p1"),
    ["pinjaman", "riwayat-status", "p1"],
    "pembiayaan.pinjaman.:id.riwayat-status.$get",
    [{ param: { id: "p1" } }],
  ],
  [
    "ringkasan.hari",
    kueri.ringkasan.hari(T),
    ["ringkasan", T],
    "pelaporan.ringkasan.$get",
    [{ query: { mulai: T, selesai: T } }],
  ],
  [
    "ringkasan.perKolektor",
    kueri.ringkasan.perKolektor(T),
    ["ringkasan", "per-kolektor", T],
    "pelaporan.ringkasan.per-kolektor.$get",
    [{ query: { mulai: T, selesai: T } }],
  ],
  [
    "ringkasan.performa",
    kueri.ringkasan.performa(T, Z),
    ["ringkasan", "performa", T, Z],
    "pelaporan.ringkasan.performa.$get",
    [{ query: { mulai: T, selesai: Z } }],
  ],
  [
    "aktivitas.hari",
    kueri.aktivitas.hari(T),
    ["aktivitas", T, null],
    "pelaporan.aktivitas.$get",
    [{ query: { tanggal: T } }],
  ],
  [
    "aktivitas.hari(pelaku)",
    kueri.aktivitas.hari(T, "u1"),
    ["aktivitas", T, "u1"],
    "pelaporan.aktivitas.$get",
    [{ query: { tanggal: T, pelakuId: "u1" } }],
  ],
  [
    "riwayat.perubahan",
    kueri.riwayat.perubahan("pinjaman", "b1"),
    ["riwayat", "pinjaman", "b1"],
    "pelaporan.riwayat.$get",
    [{ query: { tabel: "pinjaman", barisId: "b1" } }],
  ],
  [
    "kas.laporan",
    kueri.kas.laporan(T, Z),
    ["kas", "laporan", T, Z],
    "kas.kas.laporan.$get",
    [{ query: { mulai: T, selesai: Z } }],
  ],
  [
    "kas.pencocokan",
    kueri.kas.pencocokan(T, Z),
    ["kas", "pencocokan", T, Z],
    "kas.kas.pencocokan.$get",
    [{ query: { mulai: T, selesai: Z } }],
  ],
  [
    "kas.posisiModal",
    kueri.kas.posisiModal(T),
    ["kas", "posisi-modal", T],
    "kas.kas.posisi-modal.$get",
    [{ query: { tanggal: T } }],
  ],
  [
    "gaji.pratinjau",
    kueri.gaji.pratinjau("k1", T, Z),
    ["gaji", "pratinjau", "k1", T, Z],
    "penggajian.kas.gaji.pratinjau.$get",
    [{ query: { kolektorId: "k1", mulai: T, selesai: Z } }],
  ],
  [
    "gaji.slip()",
    kueri.gaji.slip(),
    ["gaji", "slip", null],
    "penggajian.kas.gaji.$get",
    [{ query: {} }],
  ],
  [
    "gaji.slip(kolektor)",
    kueri.gaji.slip("k1"),
    ["gaji", "slip", "k1"],
    "penggajian.kas.gaji.$get",
    [{ query: { kolektorId: "k1" } }],
  ],
  ["tarifGaji.daftar", kueri.tarifGaji.daftar(), ["tarif-gaji"], "penggajian.tarif-gaji.$get", []],
  [
    "lapangan.hariIni",
    kueri.lapangan.hariIni(),
    ["lapangan", "hari-ini"],
    "hariKolektor.lapangan.hari-ini.$get",
    [],
  ],
  [
    "lapangan.tagihan",
    kueri.lapangan.tagihan(),
    ["lapangan", "pinjaman"],
    "pembiayaan.lapangan.pinjaman.$get",
    [],
  ],
  [
    "lapangan.kalender",
    kueri.lapangan.kalender("2026-11"),
    ["lapangan", "kalender", "2026-11"],
    "kantor.lapangan.kalender.$get",
    [{ query: { bulan: "2026-11" } }],
  ],
  [
    "lapangan.peristiwaBulan",
    kueri.lapangan.peristiwaBulan(T),
    ["lapangan", "peristiwa-bulan", T],
    "pembiayaan.transaksi.peristiwa.$get",
    [{ query: { tanggalMulai: "2026-11-01", tanggalSelesai: T } }],
  ],
  [
    "lapangan.riwayatPinjaman",
    kueri.lapangan.riwayatPinjaman("p1"),
    ["lapangan", "peristiwa-pinjaman", "p1"],
    "pembiayaan.transaksi.peristiwa.$get",
    [{ query: { pinjamanId: "p1" } }],
  ],
  [
    "lapangan.portofolio",
    kueri.lapangan.portofolio(),
    ["lapangan", "portofolio"],
    "pembiayaan.lapangan.portofolio.$get",
    [],
  ],
  [
    "lapangan.performa",
    kueri.lapangan.performa("2026-10-26", T, "mingguan"),
    ["lapangan", "performa", "mingguan", "2026-10-26", T],
    "pelaporan.ringkasan.performa.$get",
    [{ query: { mulai: "2026-10-26", selesai: T, jenis: "mingguan" } }],
  ],
  [
    "lapangan.kampung",
    kueri.lapangan.kampung(),
    ["lapangan", "kampung"],
    "kantor.lapangan.kampung.$get",
    [],
  ],
  [
    "lapangan.nasabahLama",
    kueri.lapangan.nasabahLama(),
    ["lapangan", "nasabah-lama"],
    "pembiayaan.lapangan.nasabah-lama.$get",
    [],
  ],
  [
    "lapangan.kas",
    kueri.lapangan.kas(),
    ["lapangan", "kas"],
    "hariKolektor.hari-kolektor.$get",
    [{ query: {} }],
  ],
  [
    "lapangan.setoran",
    kueri.lapangan.setoran(),
    ["lapangan", "setoran"],
    "hariKolektor.transaksi.$get",
    [{ query: {} }],
  ],
  [
    "lapangan.biaya",
    kueri.lapangan.biaya(T),
    ["lapangan", "biaya", T],
    "hariKolektor.biaya-tak-terduga.$get",
    [{ query: { tanggalMulai: T, tanggalSelesai: T } }],
  ],
  [
    "setoran.hari",
    kueri.setoran.hari(),
    ["setoran", "hari"],
    "hariKolektor.hari-kolektor.$get",
    [{ query: {} }],
  ],
  [
    "setoran.transaksi",
    kueri.setoran.transaksi("k1"),
    ["setoran", "transaksi", "k1"],
    "hariKolektor.transaksi.$get",
    [{ query: { kolektorId: "k1" } }],
  ],
  [
    "setoran.biaya",
    kueri.setoran.biaya("k1", T),
    ["setoran", "biaya", "k1", T],
    "hariKolektor.biaya-tak-terduga.$get",
    [{ query: { kolektorId: "k1", tanggalMulai: T, tanggalSelesai: T } }],
  ],
];

describe("katalog kueri", () => {
  test.each(KASUS)("%s: kunci dan rute", async (_nama, opsi, kunciHarapan, jalur, argumen) => {
    expect(kunciDari(opsi)).toEqual(kunciHarapan as unknown[]);
    expect(await jalankan(opsi)).toEqual({ jalur, argumen });
  });

  test("setiap kunci berawalan salah satu `kunci.*` — tak ada kelompok liar", () => {
    const awalan = new Set<unknown>(Object.values(kunci).map((k) => k[0]));
    for (const [nama, opsi] of KASUS) expect(awalan.has(kunciDari(opsi)[0]), nama).toBe(true);
  });

  test("tiap awalan `kunci.*` dipakai paling sedikit satu kueri", () => {
    const dipakai = new Set(KASUS.map(([, opsi]) => kunciDari(opsi)[0]));
    for (const k of Object.values(kunci)) expect(dipakai.has(k[0]), k[0]).toBe(true);
  });

  test("tak ada dua kueri di tabel yang berkunci sama", () => {
    const kunciSemua = KASUS.map(([, opsi]) => JSON.stringify(kunciDari(opsi)));
    expect(new Set(kunciSemua).size).toBe(kunciSemua.length);
  });

  test("harian.libur: rute peristiwa per tanggal, hanya kategori libur", async () => {
    const peristiwa = [
      { kategori: "libur", id: "a" },
      { kategori: "setoran", id: "b" },
    ];
    const dipanggil: Panggilan[] = [];
    const palsu = buatPalsu((p) => {
      dipanggil.push(p);
      return peristiwa;
    });
    const opsi = palsu.harian.libur(T);
    expect(kunciDari(opsi)).toEqual(["harian", "libur", T]);
    expect(await jalankan(opsi)).toEqual([{ kategori: "libur", id: "a" }]);
    expect(dipanggil).toEqual([
      { jalur: "pembiayaan.transaksi.peristiwa.$get", argumen: [{ query: { tanggal: T } }] },
    ]);
  });

  test("kueri menunggu masukan yang belum lengkap", () => {
    const aktif = (opsi: unknown) => lihat(opsi).enabled;
    expect(aktif(kueri.nasabah.bebas("a"))).toBe(false);
    expect(aktif(kueri.nasabah.bebas("an"))).toBe(true);
    expect(aktif(kueri.nasabah.serupa("a", ""))).toBe(false);
    expect(aktif(kueri.nasabah.serupa("an", ""))).toBe(true);
    expect(aktif(kueri.ruteKolektor.urutan(""))).toBe(false);
    expect(aktif(kueri.ruteKolektor.urutan("k1"))).toBe(true);
    expect(aktif(kueri.lapangan.kalender(undefined))).toBe(false);
    expect(aktif(kueri.lapangan.kalender("2026-11"))).toBe(true);
    expect(aktif(kueri.lapangan.peristiwaBulan(undefined))).toBe(false);
    expect(aktif(kueri.lapangan.performa(undefined, undefined, "harian"))).toBe(false);
    expect(aktif(kueri.lapangan.performa("2026-10-26", "2026-11-01", "semua"))).toBe(true);
    // Jenis berbeda = kunci berbeda: pindah mode tak memakai cache jenis lain.
    expect(kunciDari(kueri.lapangan.performa("2026-10-26", T, "harian"))).not.toEqual(
      kunciDari(kueri.lapangan.performa("2026-10-26", T, "tempoan")),
    );
    expect(aktif(kueri.lapangan.peristiwaBulan(T))).toBe(true);
    expect(aktif(kueri.lapangan.biaya(undefined))).toBe(false);
    expect(aktif(kueri.lapangan.biaya(T))).toBe(true);
    expect(aktif(kueri.setoran.biaya("k1", undefined))).toBe(false);
    expect(aktif(kueri.setoran.biaya("k1", T))).toBe(true);
  });

  test("opsi bawaan HP: kalender 1 jam tak basi, hari kasir muat ulang tiap 30 dtk", () => {
    expect(lihat(kueri.lapangan.kalender("2026-11")).staleTime).toBe(3_600_000);
    expect(lihat(kueri.setoran.hari()).refetchInterval).toBe(30_000);
  });
});
