import { kunciWilayah } from "@opennael/domain";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useKampung } from "@/fitur/lapangan/data";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Isian } from "@/komponen/ui/isian";

/** Kampung: ketik bebas, atau ketuk kampung yang sudah ada (ejaan baku). */
export function PilihKampung(props: {
  teks: string;
  terpilih: string | null;
  onUbah: (teks: string, id: string | null) => void;
}) {
  const g = useG();
  const kampung = useKampung();
  const saran = useMemo(() => {
    const kunci = kunciWilayah(props.teks);
    return (kampung.data ?? [])
      .filter((k) => !kunci || kunciWilayah(k.nama).includes(kunci))
      .slice(0, 8);
  }, [kampung.data, props.teks]);

  return (
    <View style={g.tumpuk2}>
      <Isian
        label="Kampung"
        value={props.teks}
        onChangeText={(t) => props.onUbah(t, null)}
        placeholder="Ketik atau pilih di bawah"
        maxLength={50}
        autoCapitalize="words"
      />
      {props.terpilih ? null : (
        <View style={g.bungkus}>
          {saran.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => props.onUbah(k.nama, k.id)}
              style={({ pressed }) => [g.chip, pressed ? g.ditekan : null]}
            >
              <Text style={g.teksKecil}>{k.nama}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
