import { judul as judulKapital } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { NamaIkon } from "./daftar-ikon";
import { Ikon } from "./ikon";

/**
 * KOTAK KOSONG — satu bentuk untuk semua keadaan kosong & terkunci: kotak bergaris putus,
 * lingkaran ikon, judul (Kapital Tiap Kata), dan penjelasan. `besar` = keadaan terkunci
 * yang menjadi isi utama layar (mis. Mutasi tergembok): lingkaran & judul satu tingkat
 * lebih besar. Dipakai Notifikasi, Storting, Droping, dan Mutasi.
 */
export function KotakKosong(props: {
  ikon: NamaIkon;
  judul: string;
  isi: string;
  besar?: boolean;
}) {
  const besar = props.besar === true;
  return (
    <View style={[gaya.kosong, besar ? gaya.kosongBesar : null]}>
      <View style={[gaya.lingkaran, besar ? gaya.lingkaranBesar : null]}>
        <Ikon nama={props.ikon} ukuran={besar ? 30 : 24} warna={WARNA.redup} />
      </View>
      <Text style={[gaya.judul, besar ? gaya.judulBesar : null]}>{judulKapital(props.judul)}</Text>
      <Text style={gaya.isi}>{props.isi}</Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  kosong: {
    alignItems: "center",
    gap: RUANG[2],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: WARNA.garisTegas,
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[8],
  },
  kosongBesar: { paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  lingkaran: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.isiNetral,
  },
  lingkaranBesar: { width: 64, height: 64 },
  judul: { ...HURUF.base, fontWeight: TEBAL.tebal, textAlign: "center", color: WARNA.teks },
  judulBesar: { ...HURUF.lg },
  isi: { ...HURUF.sm, textAlign: "center", color: WARNA.redup },
});
