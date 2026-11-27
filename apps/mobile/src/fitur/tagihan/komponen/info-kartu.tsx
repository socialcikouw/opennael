import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import { LencanaHari, LencanaStatus } from "./lencana-kartu";

const TINGGI_LINGKARAN = 32;
/** Isian kotak kartu (pt) — kartu-nasabah memakai angka yang sama. */
export const ISIAN_KOTAK = RUANG[2.5];
/** Jarak dari atas kotak ke garis tengah baris nama — tempat cabang rel masuk. */
export const CABANG_INFO = 1 + ISIAN_KOTAK + TINGGI_LINGKARAN / 2;

/**
 * Bagian atas kotak kartu:
 *   (12) Budi Santoso                                ›
 *        20 Nov 26 • 14.10 [Rabu] [Gulung Naik]  ← lencana hari tagih / asal droping sebaris
 * Tanggal & jam akad 10 pt TEPAT DI BAWAH NAMA, sejajar huruf pertamanya (permintaan
 * pemilik 28 Nov 2026; dulu di baris kedua di bawah lingkaran). "ke-N" (pinjaman ke-) pindah ke atas Pokok Pinjaman. Tabungan
 * "••••" tak lagi di kartu (ada di Detail Nasabah). Lingkaran = angsuran yang sudah
 * lunas: pekat berwarna mode dan besar supaya paling mencolok (beda dari lencana jumlah
 * nasabah di judul kelompok yang abu).
 * Baris nama bisa diketuk: membuka detail nasabah (`onBuka`); `onSiap` dipanggil
 * saat jari menekan, supaya datanya sudah mulai diambil. Lunasi (`onLunasi`) ditawarkan
 * di sini sebagai aksi aksesibilitas pembaca layar (di layar: geser kartu ke kiri).
 */
export function InfoKartu({
  vm,
  aksen,
  onLunasi,
  onBuka,
  onSiap,
}: {
  vm: KartuVM;
  aksen: WarnaAksen;
  onLunasi: (() => void) | null;
  onBuka: () => void;
  onSiap: () => void;
}) {
  return (
    <View style={gaya.info}>
      <Tekan
        style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
        onPress={onBuka}
        onPressIn={onSiap}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole="button"
        accessibilityHint="Buka detail nasabah"
        accessibilityLabel={`${vm.namaTampil}, angsuran ke-${vm.p.angsuranKe}, akad ${vm.akadTeks}`}
        accessibilityActions={onLunasi ? [{ name: "lunasi", label: "Lunasi pinjaman" }] : []}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "lunasi") onLunasi?.();
        }}
      >
        <View style={[gaya.lingkaran, { backgroundColor: aksen.isi }]}>
          <Text
            style={[gaya.lingkaranTeks, { color: aksen.teksIsi }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {vm.angsuranKeTeks}
          </Text>
        </View>
        {/* Nama, dan tepat di bawahnya tanggal & jam akad — sejajar huruf pertama nama. */}
        <View style={gaya.kolomNama}>
          <Text style={gaya.nama} numberOfLines={1}>
            {vm.namaTampil}
          </Text>
          {/* Lencana hari tagih (mingguan) & asal droping (Baru / Gulung …) sebaris di samping
              tanggal akad — tanpa baris sendiri (28 Nov 2026). */}
          <View style={gaya.barisAkad}>
            <Text style={gaya.akad} numberOfLines={1}>
              {vm.akadTeks}
            </Text>
            {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} kecil /> : null}
            {vm.lencana ? <LencanaStatus lencana={vm.lencana} kecil /> : null}
          </View>
        </View>
        <Ikon nama="chevron-right" ukuran={16} warna={WARNA.redup} />
      </Tekan>
    </View>
  );
}

const gaya = StyleSheet.create({
  info: { gap: RUANG[0.5] },
  ditekan: { opacity: 0.6 },
  baris: {
    minHeight: TINGGI_LINGKARAN,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
  },
  lingkaran: {
    minWidth: TINGGI_LINGKARAN,
    height: TINGGI_LINGKARAN,
    paddingHorizontal: RUANG[1.5],
    borderRadius: SUDUT.bulat,
    alignItems: "center",
    justifyContent: "center",
  },
  lingkaranTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  kolomNama: { flex: 1, minWidth: 0 },
  nama: { ...HURUF.base, lineHeight: 20, fontWeight: TEBAL.tebal, color: WARNA.teks },
  // Tanggal & jam akad: 10 pt, tepat di bawah nama (permintaan pemilik 28 Nov 2026).
  akad: { ...HURUF["3xs"], flexShrink: 1, color: WARNA.redup, fontVariant: ["tabular-nums"] },
  barisAkad: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
});
