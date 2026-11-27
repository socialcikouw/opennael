import { rupiah, tampilNama } from "@opennael/format";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { sumberFoto } from "@/fitur/lapangan";
import { BarisRel, JARAK_KARTU } from "@/komponen/rel-kartu";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { FotoNasabah } from "../inti/kelompok-foto";

/** Jarak dari atas kartu ke cabang rel (pt) — setinggi lencana angsuran ke-. */
const CABANG = RUANG[2] + 10;

/**
 * KARTU FOTO (tab Foto, rupa kartu Harian — permintaan pemilik 28 Nov 2026): satu kartu
 * per nasabah bercabang ke rel kampung; isinya foto serah terima, dengan lencana kecil
 * berlatar hitam bertulisan terakota di atas foto: angsuran ke- (kiri atas), MACET (kanan atas, bila
 * macet), nama dan angsuran (kiri bawah). Huruf sekecil yang masih terbaca (10 pt tebal).
 * Ketuk = layar penuh.
 */
export const KartuFoto = memo(function KartuFoto(props: {
  foto: FotoNasabah;
  akhir: boolean;
  onBuka: () => void;
}) {
  const f = props.foto;
  const nama = tampilNama(f.nama);
  return (
    <BarisRel cabang={CABANG} akhir={props.akhir} jarak={JARAK_KARTU}>
      <Tekan
        onPress={props.onBuka}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Foto ${nama}, angsuran ke ${f.angsuranKe}${
          f.macet ? ", macet" : ""
        }, angsuran ${rupiah(f.angsuran)}. Ketuk untuk layar penuh.`}
        style={({ pressed }) => [gaya.kartu, pressed ? gaya.ditekan : null]}
      >
        <Image
          source={sumberFoto(f.fotoId)}
          recyclingKey={f.fotoId}
          cachePolicy="disk"
          contentFit="cover"
          transition={150}
          style={StyleSheet.absoluteFill}
        />
        <View style={gaya.atas}>
          <View style={[gaya.lencana, gaya.bulat]}>
            <Text style={gaya.teks}>{f.angsuranKe}</Text>
          </View>
          {f.macet ? (
            <View style={gaya.lencana}>
              <Text style={gaya.teks}>MACET</Text>
            </View>
          ) : null}
        </View>
        <View style={gaya.bawah}>
          <View style={gaya.lencana}>
            <Text style={gaya.teks} numberOfLines={1}>
              {nama}
            </Text>
          </View>
          <View style={gaya.lencana}>
            <Text style={gaya.teks} numberOfLines={1}>
              Angsuran {rupiah(f.angsuran)}
            </Text>
          </View>
        </View>
      </Tekan>
    </BarisRel>
  );
});

const gaya = StyleSheet.create({
  kartu: {
    aspectRatio: 1,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: RUANG[2],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.isiNetralTegas,
  },
  ditekan: { opacity: 0.85 },
  atas: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bawah: { alignItems: "flex-start", gap: RUANG[1] },
  // Hitam hangat bertulisan terakota terang (permintaan pemilik 28 Nov 2026).
  lencana: {
    maxWidth: "100%",
    paddingHorizontal: RUANG[1.5],
    paddingVertical: 2,
    borderRadius: SUDUT.kecil - 2,
    backgroundColor: WARNA.latarLencanaFoto,
  },
  bulat: { minWidth: 20, alignItems: "center", borderRadius: SUDUT.bulat },
  teks: {
    ...HURUF["3xs"],
    fontWeight: TEBAL.ekstra,
    color: WARNA.teksLencanaFoto,
    fontVariant: ["tabular-nums"],
  },
});
