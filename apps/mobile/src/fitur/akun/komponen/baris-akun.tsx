import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";

/** Kotak berisi baris-baris (Profil, Pengaturan, Bantuan), dipisah garis tipis. */
export function DaftarAkun({ children }: { children: ReactNode }) {
  return <View style={gaya.daftar}>{children}</View>;
}

/**
 * Satu baris Mode Akun: ikon dalam kotak kecil, judul (+ keterangan), dan isi kanan opsional
 * (sakelar, chevron). `garis` = garis pemisah di atasnya (semua baris kecuali yang pertama).
 */
export function BarisAkun(props: {
  ikon: NamaIkon;
  judul: string;
  ket?: string | undefined;
  kanan?: ReactNode;
  garis?: boolean;
  bahaya?: boolean;
}) {
  const warna = props.bahaya ? WARNA.bahayaTeks : WARNA.teksKedua;
  return (
    <View style={[gaya.baris, props.garis ? gaya.garis : null]}>
      <View style={[gaya.ikon, props.bahaya ? gaya.ikonBahaya : null]}>
        <Ikon nama={props.ikon} ukuran={17} warna={warna} />
      </View>
      <View style={gaya.teks}>
        <Text style={[gaya.judul, props.bahaya ? { color: WARNA.bahayaTeks } : null]}>
          {props.judul}
        </Text>
        {props.ket ? <Text style={gaya.ket}>{props.ket}</Text> : null}
      </View>
      {props.kanan}
    </View>
  );
}

const gaya = StyleSheet.create({
  daftar: {
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    overflow: "hidden",
  },
  baris: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[3],
  },
  garis: { borderTopWidth: 1, borderTopColor: WARNA.garis },
  ikon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.kecil + 2,
    backgroundColor: WARNA.isiNetral,
  },
  ikonBahaya: { backgroundColor: WARNA.bahayaLembut },
  teks: { flex: 1, minWidth: 0, gap: 2 },
  judul: { ...HURUF.base, fontWeight: TEBAL.sedang, color: WARNA.teks },
  ket: { ...HURUF.xs, color: WARNA.redup },
});
