import { Text } from "react-native";
import { LembarBawah } from "@/komponen/lembar-bawah";
import { g } from "@/komponen/ui/gaya-bersama";
import { Tombol } from "@/komponen/ui/tombol";

/** Lembar BATALKAN AKAD? — dibuka tombol ✕; foto & isian dibuang, uang belum tercatat keluar. */
export function LembarBatalAkad(props: {
  terbuka: boolean;
  onTutup: () => void;
  onBatalkan: () => void;
}) {
  return (
    <LembarBawah terbuka={props.terbuka} onTutup={props.onTutup} judul="Batalkan Akad?">
      <Text style={g.keterangan}>
        Foto serah terima dan isian yang sudah diisi akan dibuang. Uang belum tercatat keluar.
      </Text>
      <Tombol judul="Lanjutkan mengisi" jenis="kedua" onPress={props.onTutup} />
      <Tombol
        judul="Batalkan akad"
        jenis="bahaya"
        onPress={() => {
          props.onTutup();
          props.onBatalkan();
        }}
      />
    </LembarBawah>
  );
}
