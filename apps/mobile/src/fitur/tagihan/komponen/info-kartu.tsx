import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaMode } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import { LencanaHari, LencanaStatus } from "./lencana-kartu";

const TINGGI_LINGKARAN = 36;
/** Lama kartu ditahan sebelum Lunasi (konfirmasinya tetap ditanyakan layar). */
export const TAHAN_LUNASI_MS = 600;
/** Isian kotak kartu (pt) — kartu-nasabah memakai angka yang sama. */
export const ISIAN_KOTAK = RUANG[3];
/** Jarak dari atas kotak ke garis tengah baris nama — tempat cabang rel masuk. */
export const CABANG_INFO = 1 + ISIAN_KOTAK + TINGGI_LINGKARAN / 2;

/**
 * Bagian atas kotak kartu:
 *   (12) Budi Santoso                                ›
 *   1 Sep • 14.00 [Rabu]                    Pinjaman Ke-3
 * Baris kedua (permintaan pemilik 24 Nov 2026): tanggal & jam akad KECIL di kiri, tepat
 * di bawah lingkaran (bila sempit, akad yang terpotong; tahun hanya bila bukan tahun
 * ini), "Pinjaman Ke-N" di kanan berwarna terakota & tebal supaya mencolok. Tabungan
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
  aksen: WarnaMode;
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
        <Text style={gaya.nama} numberOfLines={1}>
          {vm.namaTampil}
        </Text>
        <Ikon nama="chevron-right" ukuran={16} warna={WARNA.redup} />
      </Tekan>
      <View style={gaya.barisKecil}>
        <View style={gaya.kiri}>
          <Text style={gaya.akad} numberOfLines={1}>
            {vm.akadTeks}
          </Text>
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
  lingkaranTeks: { ...HURUF.lg, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  nama: { ...HURUF.lg, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
  // Tanggal & jam akad: kecil, di bawah lingkaran angsuran (rata kiri kotak).
  akad: { ...HURUF["2xs"], flexShrink: 1, color: WARNA.redup, fontVariant: ["tabular-nums"] },
  barisKecil: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: RUANG[2],
  },
  kiri: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  // Pinjaman Ke-N: rata kanan, terakota & tebal supaya mencolok (menggantikan tabungan ••••).
  pinjamanKe: { ...HURUF.sm, flexShrink: 0, fontWeight: TEBAL.tebal },
});
