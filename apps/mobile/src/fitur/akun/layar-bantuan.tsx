import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/**
 * Panduan singkat — isinya mengikuti aturan usaha (`docs/aturan-usaha.md`); ubah di sini bila
 * aturannya berubah.
 */
const PANDUAN: readonly { ikon: NamaIkon; judul: string; isi: string }[] = [
  {
    ikon: "clock",
    judul: "Absen pagi",
    isi: "Ketuk Absen Sekarang di spanduk kuning (atau lonceng Notifikasi), lalu isi kas lapangan dan uang jalan — minimal Rp 5.000, kelipatan Rp 5.000. Transaksi baru bisa dicatat sesudah absen.",
  },
  {
    ikon: "hand-coins",
    judul: "Mencatat bayar & libur",
    isi: "Di kartu nasabah: BAYAR untuk setoran (ketik nominal, lalu KONFIRMASI), LIBUR bila nasabah tidak bayar hari ini. Angsuran ke-0 dan ke-1 wajib bayar, belum bisa libur. Tempoan baru bisa libur sejak jatuh tempo, dengan alasan.",
  },
  {
    ikon: "circle-check",
    judul: "Melunasi pinjaman",
    isi: "Tahan kartu nasabah sampai muncul pertanyaan Lunasi. Tabungan nasabah ikut menutup sisa saldo lebih dulu. Tempoan dilunasi lewat tombol LUNASI di kartunya.",
  },
  {
    ikon: "repeat",
    judul: "Menggulung pinjaman",
    isi: "Ketuk GULUNG bila tombolnya hijau (Bisa Digulung). Foto serah terima wajib diambil. Pinjaman barunya langsung tampil di segmen Droping.",
  },
  {
    ikon: "lock-open",
    judul: "Membuka laporan sore",
    isi: "Buka Mode Rekap › Ringkasan › Mutasi Kas. Laporan terbuka sesudah semua nasabah wajib hari ini ditagih: harian, mingguan di hari tagihnya, dan tempoan sejak jatuh tempo. Lalu setor tunai ke kasir.",
  },
  {
    ikon: "arrow-left-right",
    judul: "Berganti mode",
    isi: "Ketuk huruf di kiri bawah (K, R, atau A). Mode Kerja untuk menagih dan akad, Mode Rekap untuk kas, laporan, performa, dan foto nasabah, Mode Akun untuk profil dan pengaturan.",
  },
];

/** BANTUAN (tab ketiga Mode Akun) — panduan singkat yang bisa dibuka-tutup satu per satu. */
export function LayarBantuan() {
  const ruangTab = useRuangTab();
  const [buka, setBuka] = useState<string | null>(null);
  return (
    <ScrollView style={g.layar} contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}>
      <View style={gaya.daftar}>
        {PANDUAN.map((p, i) => {
          const terbuka = buka === p.judul;
          return (
            <View key={p.judul} style={i > 0 ? gaya.garis : null}>
              <Tekan
                accessibilityRole="button"
                accessibilityState={{ expanded: terbuka }}
                onPress={() => setBuka(terbuka ? null : p.judul)}
                style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
              >
                <View style={gaya.ikon}>
                  <Ikon nama={p.ikon} ukuran={17} warna={WARNA.teksKedua} />
                </View>
                <Text style={gaya.judul}>{p.judul}</Text>
                <Ikon
                  nama={terbuka ? "chevron-up" : "chevron-down"}
                  ukuran={18}
                  warna={WARNA.samar}
                />
              </Tekan>
              {terbuka ? <Text style={gaya.jawab}>{p.isi}</Text> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[5], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  daftar: {
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    overflow: "hidden",
  },
  garis: { borderTopWidth: 1, borderTopColor: WARNA.garis },
  baris: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[3],
  },
  ditekan: { backgroundColor: WARNA.isiNetral },
  ikon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.kecil + 2,
    backgroundColor: WARNA.isiNetral,
  },
  judul: { ...HURUF.base, flex: 1, fontWeight: TEBAL.sedang, color: WARNA.teks },
  jawab: {
    ...HURUF.sm,
    color: WARNA.teksKedua,
    paddingLeft: RUANG[4] + 32 + RUANG[3],
    paddingRight: RUANG[4],
    paddingBottom: RUANG[4],
  },
});
