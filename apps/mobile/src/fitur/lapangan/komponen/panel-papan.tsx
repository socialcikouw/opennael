import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { Papan } from "../inti/papan";
import { PapanTombol, tinggiTombolPapan } from "./papan-tombol";

/**
 * PANEL PAPAN — bagian bawah layar transaksi (Bayar, Gulung, langkah Pokok akad): papan angka
 * dan tombol KONFIRMASI (atau `judul` lain, mis. SELANJUTNYA; aktif bila `sah`) dalam jangkauan jempol. Panel naik satu tingkat dari
 * latar (`permukaan`), tombol papan satu tingkat lagi (`isiNetral`).
 * `sisaTinggi` = tinggi (pt) layar yang dipakai bagian atas, supaya papan selalu muat.
 */
export function PanelPapan({
  papan,
  sisaTinggi,
  sah,
  memuat,
  aksen,
  judul = "KONFIRMASI",
  onTekan,
  onKonfirmasi,
}: {
  papan: Papan;
  sisaTinggi: number;
  sah: boolean;
  /** Sedang menyimpan: tombol mati dan berlabel "MENYIMPAN…". */
  memuat: boolean;
  aksen: WarnaAksen;
  /** Tulisan tombol (huruf besar seperti papan); bawaan KONFIRMASI. */
  judul?: string;
  onTekan: (kunci: string) => void;
  onKonfirmasi: () => void;
}) {
  const bawah = useSafeAreaInsets().bottom;
  const { height } = useWindowDimensions();
  const aktif = sah && !memuat;

  return (
    <View style={[gaya.panel, { paddingBottom: bawah + RUANG[4] }]}>
      <PapanTombol
        papan={papan}
        tinggi={tinggiTombolPapan(height, papan.length, sisaTinggi)}
        onTekan={onTekan}
      />
      <Tekan
        accessibilityRole="button"
        accessibilityState={{ disabled: !aktif }}
        disabled={!aktif}
        onPress={onKonfirmasi}
        style={({ pressed }) => [
          gaya.konfirmasi,
          sah ? { backgroundColor: aksen.isi } : gaya.konfirmasiMati,
          pressed ? gaya.konfirmasiDitekan : null,
        ]}
      >
        <Ikon
          nama={memuat ? "clock" : "check"}
          ukuran={20}
          warna={sah ? aksen.teksIsi : WARNA.samar}
          tebal
        />
        <Text style={[gaya.konfirmasiTeks, { color: sah ? aksen.teksIsi : WARNA.samar }]}>
          {memuat ? "MENYIMPAN…" : judul}
        </Text>
      </Tekan>
    </View>
  );
}

const gaya = StyleSheet.create({
  panel: {
    gap: RUANG[4],
    paddingHorizontal: RUANG[4],
    paddingTop: RUANG[4],
    borderTopLeftRadius: SUDUT.lebar,
    borderTopRightRadius: SUDUT.lebar,
    backgroundColor: WARNA.permukaan,
    borderTopWidth: 1,
    borderTopColor: WARNA.garis,
  },
  konfirmasi: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[2],
    borderRadius: SUDUT.bulat,
  },
  konfirmasiMati: { backgroundColor: WARNA.isiNetral },
  konfirmasiDitekan: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  konfirmasiTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
});
