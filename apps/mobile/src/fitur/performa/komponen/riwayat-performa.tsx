import { rupiah, tanggalPendek } from "@opennael/format";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { TitikPerforma } from "../inti/performa";
import { tingkatDari } from "../inti/tingkat";
import { WARNA_TINGKAT } from "./warna-tingkat";

/**
 * RIWAYAT HARIAN (rupa aplikasi lama) — terbaru di atas. Tiap baris: tanggal, tagihan murni
 * hari itu, bar mini selebar persentasenya, dan kapsul persen berwarna tingkat. Paling
 * banyak ±27 baris statis: dipetakan biasa di gulungan induk, bukan FlatList.
 */
export const RiwayatPerforma = memo(function RiwayatPerforma(props: {
  titik: readonly TitikPerforma[];
  kosong: string;
}) {
  const urut = [...props.titik].reverse();
  return (
    <View style={gaya.kartu}>
      <Text style={gaya.judul}>RIWAYAT HARIAN · TAGIHAN MURNI</Text>
      {urut.length === 0 ? <Text style={gaya.kosong}>{props.kosong}</Text> : null}
      {urut.map((t, i) => {
        const w = WARNA_TINGKAT[tingkatDari(t.persentase).kunci];
        return (
          <View key={t.tanggal} style={[gaya.baris, i > 0 ? gaya.pemisah : null]}>
            <View style={gaya.kiri}>
              <Text style={gaya.tanggal}>
                {tanggalPendek(t.tanggal)}
                {t.hariIni ? " · hari ini" : ""}
              </Text>
              <Text style={gaya.murni}>{rupiah(t.setoranMurni)}</Text>
            </View>
            <View style={gaya.rel}>
              <View
                style={[
                  gaya.isiRel,
                  {
                    width: `${Math.min(100, Math.max(0, t.persentase ?? 0))}%`,
                    backgroundColor: w.isi,
                  },
                ]}
              />
            </View>
            <View style={[gaya.kapsul, { backgroundColor: w.lembut }]}>
              <Text style={[gaya.kapsulTeks, { color: w.teks }]}>
                {t.persentase === null ? "—" : `${Math.round(t.persentase)}%`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

const gaya = StyleSheet.create({
  kartu: {
    padding: RUANG[4],
    borderRadius: SUDUT.besar + 2,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  judul: {
    ...HURUF["2xs"],
    marginBottom: RUANG[1],
    fontWeight: TEBAL.tebal,
    letterSpacing: 0.8,
    color: WARNA.redup,
  },
  kosong: { ...HURUF.sm, paddingVertical: RUANG[2], color: WARNA.redup },
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    paddingVertical: RUANG[2.5],
  },
  pemisah: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: WARNA.garis },
  kiri: { width: 112 },
  tanggal: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  murni: {
    ...HURUF.sm,
    fontWeight: TEBAL.tebal,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  rel: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: WARNA.isiNetral,
  },
  isiRel: { height: 6, borderRadius: 3 },
  kapsul: {
    minWidth: 52,
    alignItems: "center",
    paddingHorizontal: RUANG[2],
    paddingVertical: RUANG[1],
    borderRadius: SUDUT.bulat,
  },
  kapsulTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
});
