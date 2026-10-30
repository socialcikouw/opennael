import { Pressable, Text, View } from "react-native";
import { useWarna } from "@/komponen/ui/tampilan";
import { useG } from "./gaya-bersama";
import { Label } from "./isian";

/**
 * Pilihan tunggal. `segmen` = kontrol bersegmen selebar layar (mis. aksi
 * Setor/Lunas/Libur); bawaan = deretan tombol kecil yang boleh membungkus.
 */
export function Pilihan<T extends string | number>(props: {
  label?: string;
  pilihan: readonly { nilai: T; teks: string }[];
  nilai: T | null;
  onPilih: (nilai: T) => void;
  segmen?: boolean;
}) {
  const WARNA = useWarna();
  const g = useG();
  if (props.segmen) {
    return (
      <View style={g.tumpuk1}>
        <Label teks={props.label} />
        <View style={g.segmen}>
          {props.pilihan.map((p) => {
            const aktif = p.nilai === props.nilai;
            return (
              <Pressable
                key={String(p.nilai)}
                onPress={() => props.onPilih(p.nilai)}
                accessibilityRole="button"
                accessibilityState={{ selected: aktif }}
                style={[g.segmenButir, aktif ? g.segmenAktif : null]}
              >
                <Text style={[g.pilihanTeks, { color: aktif ? WARNA.utamaTua : WARNA.teksKedua }]}>
                  {p.teks}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={g.tumpuk1}>
      <Label teks={props.label} />
      <View style={g.bungkus}>
        {props.pilihan.map((p) => {
          const aktif = p.nilai === props.nilai;
          return (
            <Pressable
              key={String(p.nilai)}
              onPress={() => props.onPilih(p.nilai)}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif }}
              style={({ pressed }) => [
                g.chip,
                aktif ? g.chipAktif : null,
                pressed ? g.ditekan : null,
              ]}
            >
              <Text
                style={[g.pilihanTeks, { color: aktif ? WARNA.teksAtasUtama : WARNA.teksTombol }]}
              >
                {p.teks}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
