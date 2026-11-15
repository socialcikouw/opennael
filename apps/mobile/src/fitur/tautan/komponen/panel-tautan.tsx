import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

export interface Tautan {
  id: string;
  kode: string;
  qr: string;
  klaim: string;
  kedaluwarsaAt: string;
}

/**
 * Panel kode penautan: QR + kode ketik + hitung mundur sambil menunggu bos
 * menyetujui. `tautan` kosong = kode sedang diminta (tinggi panel dijaga supaya
 * layar tak melompat saat QR muncul).
 */
export function PanelTautan(props: {
  tautan: Tautan | null;
  sisaDetik: number;
  sinyalPutus: boolean;
}) {
  const { tautan, sisaDetik } = props;
  if (!tautan) {
    return (
      <View style={gaya.panel}>
        <View style={gaya.memuat}>
          <ActivityIndicator color={WARNA.utama} />
          <Text style={g.teksRedup}>Meminta kode…</Text>
        </View>
      </View>
    );
  }
  const menit = Math.floor(sisaDetik / 60);
  const detik = String(sisaDetik % 60).padStart(2, "0");
  return (
    <View style={gaya.panel}>
      <View style={gaya.qr}>
        <QRCode
          value={tautan.qr}
          size={208}
          color={WARNA.tintaQr}
          backgroundColor={WARNA.latarQr}
        />
      </View>
      <View style={gaya.tengah}>
        <Text style={gaya.kodeLabel}>ATAU KETIK KODE</Text>
        <Text selectable style={gaya.kode}>
          {tautan.kode}
        </Text>
      </View>
      <View style={[g.baris2, gaya.menunggu]}>
        <ActivityIndicator size="small" color={WARNA.utama} />
        <Text style={gaya.menungguTeks}>
          Menunggu persetujuan bos · {menit}:{detik}
        </Text>
      </View>
      {props.sinyalPutus ? (
        <View style={g.baris2}>
          <Ikon nama="cloud-off" ukuran={16} warna={WARNA.waspada} />
          <Text style={gaya.sinyalPutus}>Sinyal terputus — terus mencoba…</Text>
        </View>
      ) : null}
    </View>
  );
}

const gaya = StyleSheet.create({
  panel: {
    alignItems: "center",
    gap: RUANG[4],
    borderRadius: SUDUT.lebar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    padding: RUANG[6],
  },
  qr: { borderRadius: SUDUT.besar, backgroundColor: WARNA.latarQr, padding: RUANG[3] },
  tengah: { alignItems: "center", gap: RUANG[1] },
  kodeLabel: { ...HURUF.xs, fontWeight: TEBAL.sedang, letterSpacing: 0.6, color: WARNA.redup },
  kode: {
    ...HURUF["3xl"],
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontWeight: TEBAL.tebal,
    letterSpacing: 4,
    color: WARNA.teks,
  },
  menunggu: {
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.utamaLembut,
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[2],
  },
  menungguTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utamaTua },
  sinyalPutus: { ...HURUF.sm, color: WARNA.waspada },
  memuat: { height: 256, alignItems: "center", justifyContent: "center", gap: RUANG[3] },
});
