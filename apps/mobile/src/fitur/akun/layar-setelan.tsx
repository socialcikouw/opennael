import { LABEL_PERAN } from "@opennael/format";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Kartu } from "@/komponen/ui/kartu";
import { useGaya } from "@/komponen/ui/tampilan";
import { useSesi } from "@/lib/sesi";
import { HURUF, RUANG, TEBAL, type Warna } from "@/tema";
import { TombolKeluar } from "./komponen/tombol-keluar";

/**
 * SETELAN (tab mode Semua) — akun yang tertaut di HP ini dan keluar. Satu-satunya
 * tempat keluar di HP kolektor (layar Analitik/Dasbor tak memuatnya). Tak ada pilihan
 * tampilan: aplikasi hanya bertema gelap.
 */
export function LayarSetelan() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const s = useSesi();
  const ruangTab = useRuangTab();
  const p = s?.pengguna;

  return (
    <ScrollView style={g.layar} contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}>
      {p ? (
        <Kartu>
          <View style={g.baris3}>
            <View style={g.avatar}>
              <Text style={g.avatarHuruf}>{p.nama.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={gaya.profil}>
              <Text style={g.teksTebal} numberOfLines={1}>
                {p.nama}
              </Text>
              <Text style={g.teksRedup} numberOfLines={1}>
                {LABEL_PERAN[p.peran]} · {p.kantor.nama}
              </Text>
              {p.nomorHp ? <Text style={g.teksMini}>{p.nomorHp}</Text> : null}
            </View>
          </View>
        </Kartu>
      ) : null}

      <View style={gaya.bagian}>
        <Text style={gaya.judulBagian}>AKUN</Text>
        <Text style={g.teksRedup}>
          HP ini tertaut ke akun di atas. Sesudah keluar, bos perlu menautkan HP ini lagi.
        </Text>
        <TombolKeluar />
      </View>
    </ScrollView>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    isi: { gap: RUANG[5], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
    profil: { flex: 1, gap: RUANG[0.5] },
    bagian: { gap: RUANG[2] },
    judulBagian: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: 0.8,
      color: WARNA.redup,
    },
  });
