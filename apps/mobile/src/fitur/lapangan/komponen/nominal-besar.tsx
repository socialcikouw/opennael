import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaMode } from "@/tema";

/**
 * NOMINAL BESAR — bagian tengah layar transaksi (Bayar & Gulung), SATU komponen untuk
 * keduanya supaya selalu sama:
 *   [ ANGSURAN  Rp 50.000 ]        ← pil patokan (berwarna mode)
 *        Rp 50.000                 ← nominal yang diketik, angka pahlawan layar
 *        ───────────               ← garis: merah galat · warna mode terisi · abu kosong
 *   keterangan (galat / hasil / petunjuk)      `ket`
 *   [ tambahan ]                              `anak` (mis. pilihan tenor)
 */
export function NominalBesar(props: {
  patokanLabel: string;
  patokanNilai: string;
  nominal: number;
  /** Bacaan pembaca layar untuk nominal, mis. "Nominal setoran Rp 50.000". */
  labelAksesibilitas: string;
  garis: "galat" | "terisi" | "kosong";
  aksen: WarnaMode;
  ket: ReactNode;
  anak?: ReactNode;
}) {
  const { aksen, nominal } = props;
  const warnaGaris =
    props.garis === "galat" ? WARNA.bahaya : props.garis === "terisi" ? aksen.teks : WARNA.garis;
  return (
    <View style={gaya.tengah}>
      <View style={[gaya.patokan, { backgroundColor: aksen.lembut }]}>
        <Text style={[gaya.patokanLabel, { color: aksen.teks }]}>{props.patokanLabel}</Text>
        <Text style={[gaya.patokanNilai, { color: aksen.teks }]} numberOfLines={1}>
          {props.patokanNilai}
        </Text>
      </View>

      <View style={gaya.nominalBaris} accessible accessibilityLabel={props.labelAksesibilitas}>
        <Text style={[gaya.mataUang, nominal > 0 ? { color: WARNA.teks } : null]}>Rp</Text>
        <Text
          style={[gaya.nominal, nominal === 0 ? { color: WARNA.samar } : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {nominal.toLocaleString("id-ID")}
        </Text>
      </View>
      <View style={[gaya.garisNominal, { backgroundColor: warnaGaris }]} />
      <View style={gaya.ket}>{props.ket}</View>
      {props.anak}
    </View>
  );
}

/**
 * Teks keterangan di bawah garis nominal; `ikon` + `warna` opsional (galat merah, pas
 * berwarna mode). Dua baris dipesan di `NominalBesar`: munculnya galat tak menggeser nominal.
 */
export function KetNominal(props: {
  teks: string;
  ikon?: NamaIkon | undefined;
  warna?: string | undefined;
}) {
  return (
    <>
      {props.ikon ? (
        <Ikon nama={props.ikon} ukuran={12} warna={props.warna ?? WARNA.redup} />
      ) : null}
      <Text
        style={[gaya.ketTeks, props.warna ? { color: props.warna } : null]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {props.teks}
      </Text>
    </>
  );
}

const gaya = StyleSheet.create({
  tengah: { flex: 1, justifyContent: "center", alignItems: "center", gap: RUANG[3] },
  patokan: {
    alignItems: "center",
    paddingVertical: RUANG[2],
    paddingHorizontal: RUANG[5],
    borderRadius: SUDUT.lebar,
  },
  patokanLabel: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
  patokanNilai: { ...HURUF.xl, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  nominalBaris: {
    width: "100%",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: RUANG[2],
    paddingHorizontal: RUANG[2],
  },
  mataUang: { ...HURUF["2xl"], fontWeight: TEBAL.semi, color: WARNA.samar },
  nominal: {
    ...HURUF.hero,
    flexShrink: 1,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -1,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  garisNominal: { width: "70%", height: 2, borderRadius: SUDUT.bulat },
  ket: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[1.5],
    paddingHorizontal: RUANG[4],
  },
  ketTeks: { ...HURUF.xs, flexShrink: 1, textAlign: "center", color: WARNA.redup },
});
