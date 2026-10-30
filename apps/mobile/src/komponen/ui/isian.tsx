import { bacaUang, tulisUang } from "@opennael/format";
import { useState } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { useWarna } from "@/komponen/ui/tampilan";
import { GELAP, type Warna } from "@/komponen/ui/tema";
import { useG } from "./gaya-bersama";
import { Ikon } from "./ikon";

export function Label({ teks }: { teks?: string | undefined }) {
  const g = useG();
  return teks ? <Text style={g.label}>{teks}</Text> : null;
}

/** Bingkai isian: menyala hijau saat aktif, merah saat galat. */
function bingkai(WARNA: Warna, fokus: boolean, galat: unknown) {
  return { borderColor: galat ? WARNA.bahayaBingkai : fokus ? WARNA.utamaFokus : WARNA.garisTegas };
}

export function Isian(
  props: TextInputProps & { label?: string; galat?: string | undefined; ikon?: NamaIkon },
) {
  const WARNA = useWarna();
  const g = useG();
  const { label, galat, ikon, onFocus, onBlur, ...input } = props;
  const [fokus, setFokus] = useState(false);
  return (
    <View style={g.tumpuk1}>
      <Label teks={label} />
      <View style={[g.bingkaiIsian, bingkai(WARNA, fokus, galat)]}>
        {ikon ? <Ikon nama={ikon} warna={WARNA.redup} /> : null}
        <TextInput
          style={g.isian}
          keyboardAppearance={WARNA === GELAP ? "dark" : "light"}
          placeholderTextColor={WARNA.samar}
          onFocus={(e) => {
            setFokus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFokus(false);
            onBlur?.(e);
          }}
          {...input}
        />
      </View>
      {galat ? <Text style={g.galat}>{galat}</Text> : null}
    </View>
  );
}

/** Isian rupiah: papan angka, pemisah ribuan saat diketik. */
export function IsianUang(props: {
  label: string;
  nilai: number;
  onUbah: (n: number) => void;
  galat?: string | null | undefined;
  autoFocus?: boolean;
}) {
  const WARNA = useWarna();
  const g = useG();
  const [fokus, setFokus] = useState(false);
  return (
    <View style={g.tumpuk1}>
      <Label teks={props.label} />
      <View style={[g.bingkaiIsian, g.bingkaiUang, bingkai(WARNA, fokus, props.galat)]}>
        <Text style={g.awalanRp}>Rp</Text>
        <TextInput
          style={g.isianUang}
          keyboardAppearance={WARNA === GELAP ? "dark" : "light"}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={WARNA.samar}
          value={tulisUang(props.nilai)}
          onChangeText={(t) => props.onUbah(bacaUang(t))}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          autoFocus={props.autoFocus ?? false}
        />
      </View>
      {props.galat ? <Text style={g.galat}>{props.galat}</Text> : null}
    </View>
  );
}

export function PesanGalat({ pesan }: { pesan: string | null | undefined }) {
  const WARNA = useWarna();
  const g = useG();
  if (!pesan) return null;
  return (
    <View style={[g.kotakPesan, g.kotakGalat]}>
      <Ikon nama="circle-alert" ukuran={18} warna={WARNA.bahaya} />
      <Text style={g.pesanGalat}>{pesan}</Text>
    </View>
  );
}
