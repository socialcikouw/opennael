import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { infoPerangkat, versiAplikasi } from "@/platform/perangkat";
import { RUANG, WARNA } from "@/tema";
import { BarisAkun, DaftarAkun } from "./komponen/baris-akun";
import { TombolKeluar } from "./komponen/tombol-keluar";
import { useGetar } from "./pengaturan";

/**
 * PENGATURAN (tab kedua Mode Akun) — Getar (nyala/mati, disimpan di HP, berlaku seketika),
 * Perangkat Ini (nama & sistem HP yang tertaut), Tentang OpenNael (versi & pembaruan yang
 * sedang jalan), lalu Keluar dari HP ini di kotak terpisah.
 */
export function LayarPengaturan() {
  const ruangTab = useRuangTab();
  const getar = useGetar();
  const hp = infoPerangkat();

  return (
    <ScrollView style={g.layar} contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}>
      <DaftarAkun>
        <BarisAkun
          ikon="vibrate"
          judul="Getar"
          ket="Angka papan, tahan lama, hasil transaksi"
          kanan={
            <Switch
              value={getar.nyala}
              onValueChange={getar.ubah}
              trackColor={{ true: WARNA.sukses, false: WARNA.garisTegas }}
              thumbColor={WARNA.permukaan}
              accessibilityLabel="Getar"
            />
          }
        />
        <BarisAkun
          garis
          ikon="smartphone"
          judul="Perangkat Ini"
          ket={`${hp.nama ?? "HP ini"} · ${hp.platform === "ios" ? "iOS" : "Android"}`}
        />
        <BarisAkun garis ikon="info" judul="Tentang OpenNael" ket={versiAplikasi()} />
      </DaftarAkun>

      <View style={g.bagian}>
        <Text style={g.teksRedup}>
          HP ini tertaut ke akun Anda. Sesudah keluar, bos perlu menautkan HP ini lagi.
        </Text>
        <TombolKeluar />
      </View>
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[5], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
});
