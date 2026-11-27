import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import { LencanaHari, LencanaStatus } from "./lencana-kartu";

const TINGGI_LINGKARAN = 32;
/** Lama kartu ditahan sebelum Lunasi (konfirmasinya tetap ditanyakan layar). */
export const TAHAN_LUNASI_MS = 600;
/** Isian kotak kartu (pt) — kartu-nasabah memakai angka yang sama. */
export const ISIAN_KOTAK = RUANG[2.5];
/** Jarak dari atas kotak ke garis tengah baris nama — tempat cabang rel masuk. */
export const CABANG_INFO = 1 + ISIAN_KOTAK + TINGGI_LINGKARAN / 2;

/**
 * Bagian atas kotak kartu:
 *   (12) Budi Santoso                                ›
 *        20 Nov 26 • 14.10
 *   [Rabu]                                  Pinjaman Ke-3
 * Tanggal & jam akad 10 pt TEPAT DI BAWAH NAMA, sejajar huruf pertamanya (permintaan
 * pemilik 28 Nov 2026; dulu di baris kedua di bawah lingkaran). Baris kedua: lencana hari
 * tagih / status di kiri, "Pinjaman Ke-N" di kanan berwarna terakota & tebal. Tabungan
 * "••••" tak lagi di kartu (ada di Detail Nasabah). Lingkaran = angsuran yang sudah
 * lunas: pekat berwarna mode dan besar supaya paling mencolok (beda dari lencana jumlah
 * nasabah di judul kelompok yang abu).
 * Baris nama bisa diketuk: membuka detail nasabah (`onBuka`); `onSiap` dipanggil
 * saat jari menekan, supaya datanya sudah mulai diambil. Tahan lama di baris itu
 * tetap Lunasi (`onLunasi`), juga ditawarkan sebagai aksi aksesibilitas.
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
        onLongPress={onLunasi ?? undefined}
        delayLongPress={TAHAN_LUNASI_MS}
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
          <Text style={gaya.akad} numberOfLines={1}>
            {vm.akadTeks}
          </Text>
        </View>
        <Ikon nama="chevron-right" ukuran={16} warna={WARNA.redup} />
      </Tekan>
      <View style={gaya.barisKecil}>
        <View style={gaya.kiri}>
          {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
          {vm.lencana ? <LencanaStatus lencana={vm.lencana} /> : null}
        </View>
        <Text style={[gaya.pinjamanKe, { color: aksen.teks }]} numberOfLines={1}>
          {vm.pinjamanKeTeks}
        </Text>
      </View>
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
  akad: { ...HURUF["3xs"], color: WARNA.redup, fontVariant: ["tabular-nums"] },
  // Kiri (akad + lencana) boleh turun ke baris berikutnya bila sempit — tak pernah
  // berhimpitan dengan "Pinjaman Ke-N" yang tetap di kanan atas.
  barisKecil: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: RUANG[2],
  },
  kiri: {
    flex: 1,
    minWidth: 0,
    minHeight: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: RUANG[1.5],
    rowGap: RUANG[1],
  },
  // Pinjaman Ke-N: rata kanan, terakota & tebal supaya mencolok (menggantikan tabungan ••••).
  pinjamanKe: { ...HURUF.xs, lineHeight: 18, flexShrink: 0, fontWeight: TEBAL.tebal },
});
