import { tanggalPendek } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { RingkasPerforma, TitikPerforma } from "../inti/performa";
import { LEGENDA_TINGKAT, tingkatDari } from "../inti/tingkat";
import { WARNA_TINGKAT } from "./warna-tingkat";

/** Tinggi bidang batang (pt) — 100%. Di atas 100% batang tetap penuh (warna tinta). */
const TINGGI = 96;
const MIN = 4;

const teksTitik = (t: TitikPerforma | null) =>
  t && t.persentase !== null ? `${Math.round(t.persentase)}% · ${tanggalPendek(t.tanggal)}` : "—";

/**
 * GRAFIK PER HARI TAGIH (rupa aplikasi lama): satu batang per hari tagih, diwarnai tingkatnya
 * (hari ini diredupkan — belum selesai); sorotan Terbaik · Terendah · Hari ≥ 90%; legenda
 * lima tingkat.
 */
export function KartuGrafik({ p, kosong }: { p: RingkasPerforma; kosong: string }) {
  return (
    <View style={gaya.kartu}>
      <Text style={gaya.judul}>PER HARI TAGIH</Text>
      {p.titik.length === 0 ? (
        <Text style={gaya.kosong}>{kosong}</Text>
      ) : (
        <View
          style={gaya.bidang}
          accessible
          accessibilityLabel={`Performa ${p.titik.length} hari tagih${
            p.rataRata !== null ? `, rata-rata ${p.rataRata} persen` : ""
          }`}
        >
          {p.titik.map((t) => {
            const w = WARNA_TINGKAT[tingkatDari(t.persentase).kunci];
            const tinggi =
              t.persentase === null
                ? MIN
                : Math.max(MIN, (Math.min(t.persentase, 100) / 100) * TINGGI);
            return (
              <View key={t.tanggal} style={gaya.lajur}>
                <View
                  style={[
                    gaya.batang,
                    { height: tinggi, backgroundColor: w.isi, opacity: t.hariIni ? 0.4 : 1 },
                  ]}
                />
              </View>
            );
          })}
        </View>
      )}

      <View style={gaya.sorotan}>
        <Sorotan label="Terbaik" nilai={teksTitik(p.sorotan.terbaik)} />
        <Sorotan label="Terendah" nilai={teksTitik(p.sorotan.terendah)} />
        <Sorotan
          label="Hari ≥ 90%"
          nilai={p.hariDinilai > 0 ? `${p.sorotan.hariTarget} dari ${p.hariDinilai}` : "—"}
        />
      </View>

      <View style={gaya.legenda}>
        {LEGENDA_TINGKAT.map((t) => (
          <View key={t.kunci} style={gaya.itemLegenda}>
            <View style={[gaya.titik, { backgroundColor: WARNA_TINGKAT[t.kunci].isi }]} />
            <Text style={gaya.teksLegenda}>
              {t.label} <Text style={gaya.rentang}>{t.rentang}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Sorotan({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={gaya.keping}>
      <Text style={gaya.kepingLabel}>{label}</Text>
      <Text style={gaya.kepingNilai} numberOfLines={1} adjustsFontSizeToFit>
        {nilai}
      </Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[3],
    padding: RUANG[4],
    borderRadius: SUDUT.besar + 2,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  judul: { ...HURUF["2xs"], fontWeight: TEBAL.tebal, letterSpacing: 0.8, color: WARNA.redup },
  kosong: { ...HURUF.sm, color: WARNA.redup },
  bidang: { height: TINGGI, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  lajur: { flex: 1, height: "100%", justifyContent: "flex-end" },
  batang: { width: "100%", borderRadius: 3 },
  sorotan: { flexDirection: "row", gap: RUANG[2] },
  keping: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: RUANG[2.5],
    paddingVertical: RUANG[2],
    borderRadius: SUDUT.sedang,
    backgroundColor: WARNA.isiNetral,
  },
  kepingLabel: { ...HURUF["2xs"], fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  kepingNilai: {
    ...HURUF.sm,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  legenda: { flexDirection: "row", flexWrap: "wrap", columnGap: RUANG[3], rowGap: RUANG[1] },
  itemLegenda: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  titik: { width: 8, height: 8, borderRadius: 4 },
  teksLegenda: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  rentang: { fontWeight: TEBAL.sedang, color: WARNA.redup },
});
