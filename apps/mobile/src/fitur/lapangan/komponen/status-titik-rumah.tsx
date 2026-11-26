import { StyleSheet, Switch, Text, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, TEBAL, WARNA } from "@/tema";
import { AKURASI_TIMPA_METER } from "../inti/titik-rumah";
import type { TitikLatar } from "../titik-rumah-latar";

/**
 * Baris kecil keadaan GPS di latar (lihat `useTitikRumahLatar`) — mencari sinyal, titik
 * sudah didapat, atau tak bisa. Tak pernah menghalangi transaksi.
 *
 * Tanpa `perbarui` (nasabah baru): hanya memberi tahu, titik selalu direkam.
 * Dengan `perbarui` (akad ulang & gulung, keputusan pemilik 27 Nov 2026): saklar
 * "Perbarui titik rumah", menyala sebagai bawaan — kolektor mematikannya bila tidak sedang
 * di rumah nasabah (pasar, kantor, jalan). Titik ≤ 30 m menimpa titik lama.
 */
export function StatusTitikRumah({
  titik,
  perbarui,
}: {
  titik: TitikLatar;
  perbarui?: { nyala: boolean; ubah: (nyala: boolean) => void };
}) {
  const siap = titik.status === "siap";
  const ikon = (
    <Ikon
      nama="map-pin"
      ukuran={14}
      warna={siap && (perbarui?.nyala ?? true) ? WARNA.sukses : WARNA.redup}
    />
  );

  if (!perbarui) {
    const teks =
      titik.status === "siap"
        ? `Titik rumah terdeteksi (±${titik.titik.akurasiMeter} m), direkam otomatis saat akad disimpan.`
        : titik.status === "mencari"
          ? "Titik rumah: mencari sinyal GPS…"
          : `Titik rumah tidak terekam otomatis. ${titik.alasan}`;
    return (
      <View style={g.baris2} accessibilityLiveRegion="polite">
        {ikon}
        <Text style={[g.teksRedup, g.isi]}>{teks}</Text>
      </View>
    );
  }

  const ket = !perbarui.nyala
    ? "Titik rumah lama tetap dipakai."
    : titik.status === "siap"
      ? titik.titik.akurasiMeter <= AKURASI_TIMPA_METER
        ? `GPS ±${titik.titik.akurasiMeter} m — titik lama diganti. Matikan bila bukan di rumah nasabah.`
        : `GPS ±${titik.titik.akurasiMeter} m kurang akurat — hanya direkam bila belum ada titik.`
      : titik.status === "mencari"
        ? "Mencari sinyal GPS…"
        : `GPS tidak bisa dipakai. ${titik.alasan}`;
  return (
    <View style={g.baris2} accessibilityLiveRegion="polite">
      {ikon}
      <View style={g.isi}>
        <Text style={gaya.judul}>Perbarui titik rumah</Text>
        <Text style={g.teksMini}>{ket}</Text>
      </View>
      <Switch
        value={perbarui.nyala}
        onValueChange={perbarui.ubah}
        trackColor={{ true: WARNA.sukses, false: WARNA.garisTegas }}
        thumbColor={WARNA.permukaan}
        accessibilityLabel="Perbarui titik rumah"
      />
    </View>
  );
}

const gaya = StyleSheet.create({
  judul: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teks },
});
