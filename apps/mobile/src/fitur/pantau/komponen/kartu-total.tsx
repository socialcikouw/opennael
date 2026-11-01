import { rupiah } from "@opennael/format";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

export interface RincianTotal {
  label: string;
  nilai: number;
  /** Tanda di depan label: "+" masuk, "−" keluar; kosong = titik awal / keterangan. */
  tanda?: "+" | "−" | undefined;
}

/**
 * KARTU TOTAL — angka utama tab pantau (tunai harus disetor, total storting,
 * total droping) dalam warna aksen mode Semua, dengan rincian penyusunnya di
 * bawah garis. `kaki` = isi tambahan (mis. tekor/lebih setor).
 */
export function KartuTotal(props: {
  label: string;
  nilai: number;
  ikon: NamaIkon;
  keterangan?: string | undefined;
  rincian?: readonly RincianTotal[];
  kaki?: ReactNode;
}) {
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  const aksen = useWarnaMode("semua");
  return (
    <View style={gaya.kartu}>
      <View style={gaya.kepala}>
        <View style={[gaya.ikon, { backgroundColor: aksen.lembut }]}>
          <Ikon nama={props.ikon} ukuran={18} warna={aksen.teks} />
        </View>
        <Text style={gaya.label}>{props.label}</Text>
      </View>
      <Text
        style={[gaya.nilai, { color: props.nilai < 0 ? WARNA.bahaya : aksen.teks }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {rupiah(props.nilai)}
      </Text>
      {props.keterangan ? <Text style={gaya.keterangan}>{props.keterangan}</Text> : null}
      {props.rincian && props.rincian.length > 0 ? (
        <View style={gaya.rincian}>
          {props.rincian.map((r) => (
            <View key={r.label} style={gaya.baris}>
              <Text style={gaya.barisLabel} numberOfLines={1}>
                {r.tanda ? `${r.tanda} ` : ""}
                {r.label}
              </Text>
              <Text style={gaya.barisNilai}>{rupiah(r.nilai)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {props.kaki}
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kartu: {
      gap: RUANG[2],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
      padding: RUANG[5],
      boxShadow: BAYANGAN.kecil,
    },
    kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    ikon: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
    },
    label: {
      ...HURUF["2xs"],
      flex: 1,
      fontWeight: TEBAL.ekstra,
      letterSpacing: 0.8,
      color: WARNA.redup,
    },
    nilai: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    keterangan: { ...HURUF.xs, color: WARNA.redup },
    rincian: {
      gap: RUANG[1.5],
      marginTop: RUANG[1],
      paddingTop: RUANG[3],
      borderTopWidth: 1,
      borderTopColor: WARNA.garis,
    },
    baris: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    barisLabel: { ...HURUF.sm, flex: 1, color: WARNA.teksKedua },
    barisNilai: {
      ...HURUF.sm,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
  });
