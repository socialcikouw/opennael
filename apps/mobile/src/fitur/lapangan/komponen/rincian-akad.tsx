import { rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Baris } from "@/komponen/ui/kartu";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/**
 * RINCIAN AKAD — puncak formulir, tepat di atas tombol simpan:
 *   Pencairan
 *   Rp 920.000                 ← besar & hijau: uang yang diserahkan ke nasabah
 *   ──────────────────────────
 *   Potongan Admin · Masuk Tabungan · Total Kembali · Angsuran
 * Angka = rumus server (`syaratAkad`); `sekali` = tempoan (dibayar sekali, bukan angsuran).
 */
export function RincianAkad(props: {
  hasil: {
    potonganAdmin: number;
    tabunganMasuk: number;
    pencairan: number;
    totalKembali: number;
    angsuran: number;
  };
  sekali: boolean;
}) {
  const h = props.hasil;
  return (
    <View style={gaya.kartu}>
      <View style={gaya.utama}>
        <Text style={gaya.label}>Pencairan</Text>
        <Text style={gaya.nilai} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>
          {rupiah(h.pencairan)}
        </Text>
      </View>
      <View style={gaya.garis} />
      <Baris label="Potongan Admin" nilai={rupiah(h.potonganAdmin)} />
      <Baris label="Masuk Tabungan" nilai={rupiah(h.tabunganMasuk)} />
      <Baris label="Total Kembali" nilai={rupiah(h.totalKembali)} />
      <Baris label={props.sekali ? "Dibayar Sekali" : "Angsuran"} nilai={rupiah(h.angsuran)} />
    </View>
  );
}

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[3],
    padding: RUANG[4],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.utamaGaris,
    backgroundColor: WARNA.utamaLembut,
  },
  utama: { gap: RUANG[0.5] },
  label: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.teksKedua },
  nilai: {
    ...HURUF["3xl"],
    fontWeight: TEBAL.ekstra,
    letterSpacing: -0.5,
    color: WARNA.utama,
    fontVariant: ["tabular-nums"],
  },
  garis: { height: 1, backgroundColor: WARNA.utamaGaris },
});
