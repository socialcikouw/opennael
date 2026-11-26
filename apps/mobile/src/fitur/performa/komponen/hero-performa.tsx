import { rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { tingkatDari } from "../inti/tingkat";
import { Cincin } from "./cincin";
import { WARNA_TINGKAT } from "./warna-tingkat";

const UKURAN_CINCIN = 116;

/**
 * KARTU UTAMA PERFORMA (rupa aplikasi lama) — cincin rata-rata persentase bulan itu,
 * lencana tingkat, dan rata-rata tagihan murni per hari tagih. Latar kartu = semburat
 * tingkat: warnanya terbaca sebelum angkanya.
 */
export function HeroPerforma(props: {
  /** "Rata-rata bulan ini · Harian". */
  overline: string;
  persen: number | null;
  murni: number | null;
  catatan: string;
}) {
  const t = tingkatDari(props.persen);
  const w = WARNA_TINGKAT[t.kunci];
  return (
    <View style={[gaya.kartu, { backgroundColor: w.lembut }]}>
      <View style={gaya.kepala}>
        <Text style={gaya.overline} numberOfLines={1}>
          {props.overline.toUpperCase()}
        </Text>
        <View style={[gaya.lencana, { borderColor: w.teks }]}>
          <Ikon nama="badge-check" ukuran={12} warna={w.teks} />
          <Text style={[gaya.lencanaTeks, { color: w.teks }]}>{t.label}</Text>
        </View>
      </View>

      <View style={gaya.tengah}>
        <Cincin isi={(props.persen ?? 0) / 100} ukuran={UKURAN_CINCIN} tebal={12} warna={w.isi}>
          <Text style={[gaya.persen, { color: w.teks }]} numberOfLines={1} adjustsFontSizeToFit>
            {props.persen === null ? "—" : `${Math.round(props.persen)}%`}
          </Text>
          <Text style={gaya.subCincin}>kinerja</Text>
        </Cincin>
        <View style={gaya.kolom}>
          <Text style={gaya.angka} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {props.murni === null ? "—" : rupiah(props.murni)}
          </Text>
          <Text style={gaya.satuan}>rata-rata tagihan murni per hari tagih</Text>
        </View>
      </View>

      <Text style={gaya.catatan}>{props.catatan}</Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  kartu: { gap: RUANG[3], padding: RUANG[5], borderRadius: SUDUT.lebar },
  kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[2.5] },
  overline: {
    ...HURUF["2xs"],
    flex: 1,
    fontWeight: TEBAL.tebal,
    letterSpacing: 0.8,
    color: WARNA.teksKedua,
  },
  lencana: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1],
    paddingHorizontal: RUANG[2.5],
    paddingVertical: RUANG[1],
    borderRadius: SUDUT.bulat,
    borderWidth: 1,
    backgroundColor: WARNA.permukaan,
  },
  lencanaTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra },
  tengah: { flexDirection: "row", alignItems: "center", gap: RUANG[4] },
  persen: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -0.8,
    maxWidth: UKURAN_CINCIN - 30,
    fontVariant: ["tabular-nums"],
  },
  subCincin: { ...HURUF["2xs"], marginTop: -2, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  kolom: { flex: 1, minWidth: 0 },
  angka: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -0.6,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  satuan: { ...HURUF.xs, marginTop: RUANG[0.5], color: WARNA.teksKedua },
  catatan: { ...HURUF.xs, color: WARNA.teksKedua },
});
