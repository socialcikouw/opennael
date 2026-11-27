import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { KeadaanSel, PekanVM } from "../inti/absensi";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Warna tiap keadaan — arti warna tema: hijau masuk, amber tidak kerja, merah tak absen. */
const WARNA_SEL: Record<KeadaanSel, { latar: string; teks: string }> = {
  masuk: { latar: WARNA.suksesMuda, teks: WARNA.suksesTua },
  "tidak-kerja": { latar: WARNA.waspadaMuda, teks: WARNA.waspadaTua },
  "tak-absen": { latar: WARNA.bahayaMuda, teks: WARNA.bahayaTua },
  belum: { latar: WARNA.permukaan, teks: WARNA.utama },
  libur: { latar: WARNA.isiNetralTegas, teks: WARNA.teksKedua },
  "bukan-kerja": { latar: "transparent", teks: WARNA.samar },
  mendatang: { latar: WARNA.isiNetral, teks: WARNA.redup },
};

const LEGENDA: readonly { keadaan: KeadaanSel; label: string }[] = [
  { keadaan: "masuk", label: "Masuk" },
  { keadaan: "tidak-kerja", label: "Tidak kerja" },
  { keadaan: "tak-absen", label: "Tak absen" },
  { keadaan: "libur", label: "Libur kantor" },
];

/**
 * KALENDER ABSENSI sebulan (Senin–Minggu): tiap tanggal lingkaran berwarna keadaannya; hari
 * ini bertepi terakota. Legenda di bawah.
 */
export function KalenderAbsensi({ pekan }: { pekan: readonly PekanVM[] }) {
  return (
    <View style={gaya.kartu}>
      <View style={gaya.baris}>
        {HARI.map((h) => (
          <Text key={h} style={gaya.judulHari}>
            {h}
          </Text>
        ))}
      </View>
      {pekan.map((p) => (
        <View key={p.find((s) => s)?.tanggal ?? "kosong"} style={gaya.baris}>
          {HARI.map((h, kolom) => {
            const s = p[kolom];
            if (!s) return <View key={h} style={gaya.kolom} />;
            const w = WARNA_SEL[s.keadaan];
            return (
              <View key={h} style={gaya.kolom}>
                <View
                  style={[gaya.sel, { backgroundColor: w.latar }, s.hariIni ? gaya.hariIni : null]}
                >
                  <Text style={[gaya.angka, { color: w.teks }]}>{s.angka}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <View style={gaya.legenda}>
        {LEGENDA.map((l) => (
          <View key={l.keadaan} style={gaya.itemLegenda}>
            <View style={[gaya.titik, { backgroundColor: WARNA_SEL[l.keadaan].latar }]} />
            <Text style={gaya.teksLegenda}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const UKURAN_SEL = 32;

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[1.5],
    padding: RUANG[3],
    borderRadius: SUDUT.besar + 2,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  baris: { flexDirection: "row" },
  kolom: { flex: 1, alignItems: "center" },
  judulHari: {
    ...HURUF["3xs"],
    flex: 1,
    textAlign: "center",
    fontWeight: TEBAL.tebal,
    color: WARNA.samar,
  },
  sel: {
    width: UKURAN_SEL,
    height: UKURAN_SEL,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
  },
  hariIni: { borderWidth: 2, borderColor: WARNA.utama },
  angka: { ...HURUF.xs, fontWeight: TEBAL.tebal, fontVariant: ["tabular-nums"] },
  legenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: RUANG[3],
    rowGap: RUANG[1],
    paddingTop: RUANG[1.5],
  },
  itemLegenda: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  titik: { width: 10, height: 10, borderRadius: 5 },
  teksLegenda: { ...HURUF.xs, color: WARNA.teksKedua },
});
