import { rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { RingkasPerforma } from "../inti/performa";
import { tingkatDari } from "../inti/tingkat";
import { WARNA_TINGKAT } from "./warna-tingkat";

/**
 * PERFORMA HARI INI (hanya Bulan Ini) — persen tagihan murni hari ini berwarna tingkatnya
 * (belum selesai, jadi tak ikut rata-rata), dasar hitungannya, lalu Dicatat · Setoran.
 */
export function KartuHariIni(props: {
  p: RingkasPerforma | null;
  /** "12 / 30" atau null bila belum absen / tak ada data. */
  dicatat: string | null;
  setoran: number | null;
}) {
  const h = props.p?.hariIni ?? null;
  const persen = h?.persentase ?? null;
  const t = tingkatDari(persen);
  const w = WARNA_TINGKAT[t.kunci];
  return (
    <View style={gaya.kartu}>
      <View style={gaya.kepala}>
        <Text style={gaya.judul}>HARI INI</Text>
        <View style={[gaya.kapsul, { backgroundColor: w.lembut }]}>
          <Text style={[gaya.kapsulTeks, { color: w.teks }]}>{t.label}</Text>
        </View>
      </View>
      <View style={gaya.utama}>
        <Text style={[gaya.persen, { color: w.teks }]}>
          {persen === null ? "—" : `${Math.round(persen)}%`}
        </Text>
        <Text style={gaya.penjelas}>{penjelas(props.p)}</Text>
      </View>
      {props.dicatat !== null || props.setoran !== null ? (
        <View style={gaya.deret}>
          <Keping label="Dicatat" nilai={props.dicatat ?? "—"} />
          <Keping label="Setoran" nilai={props.setoran === null ? "—" : rupiah(props.setoran)} />
        </View>
      ) : null}
    </View>
  );
}

/** Dasar angka hari ini, atau mengapa angkanya kosong. */
function penjelas(p: RingkasPerforma | null): string {
  if (!p) return "Memuat…";
  const h = p.hariIni;
  if (!h) return "Hari ini bukan hari tagih.";
  if (h.patokan === null) return "Belum ada potret kemarin untuk patokan.";
  if (h.persentase === null) return "Tak ada angsuran yang jadi patokan hari ini.";
  return `Tagihan murni ${rupiah(h.setoranMurni)} dari patokan ${rupiah(h.patokan)} — belum selesai, tak ikut rata-rata.`;
}

function Keping({ label, nilai }: { label: string; nilai: string }) {
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
  kepala: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  judul: { ...HURUF["2xs"], fontWeight: TEBAL.tebal, letterSpacing: 0.8, color: WARNA.redup },
  kapsul: { paddingHorizontal: RUANG[2.5], paddingVertical: 2, borderRadius: SUDUT.bulat },
  kapsulTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra },
  utama: { flexDirection: "row", alignItems: "center", gap: RUANG[4] },
  persen: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  penjelas: { ...HURUF.xs, flex: 1, color: WARNA.teksKedua },
  deret: { flexDirection: "row", gap: RUANG[2] },
  keping: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: RUANG[3],
    paddingVertical: RUANG[2.5],
    borderRadius: SUDUT.sedang,
    backgroundColor: WARNA.isiNetral,
  },
  kepingLabel: { ...HURUF["2xs"], fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  kepingNilai: {
    ...HURUF.base,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
});
