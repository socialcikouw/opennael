import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { Layar } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Judul, Keterangan, Merek } from "@/komponen/ui/teks";
import { ALAMAT_API } from "@/lib/api";
import { layarAwal } from "@/lib/navigasi";
import { useSesi } from "@/lib/sesi";
import { RUANG, WARNA } from "@/tema";

/**
 * Pintu masuk: HP yang belum tertaut langsung ke layar penautan QR — aplikasi
 * HP khusus kasir, pengawas, kolektor; tidak ada login nomor HP + kata sandi.
 */
export default function Pintu() {
  const s = useSesi();

  if (!ALAMAT_API) {
    return (
      <Layar>
        <Merek />
        <Judul>Alamat server belum diatur</Judul>
        <Spanduk
          judul="Untuk pengembang"
          isi="Isi EXPO_PUBLIC_API_URL di apps/mobile/.env dengan alamat server (IP laptop di jaringan yang sama), lalu jalankan ulang Metro."
        />
        <Keterangan>Hubungi pengelola aplikasi bila pesan ini muncul di HP kerja.</Keterangan>
      </Layar>
    );
  }
  if (s === undefined) {
    return (
      <View style={[g.memuat, gaya.memuat]}>
        <Merek besar />
        <ActivityIndicator color={WARNA.utama} />
      </View>
    );
  }
  if (!s) return <Redirect href="/tautkan" />;
  return <Redirect href={layarAwal(s.pengguna.peran)} />;
}

const gaya = StyleSheet.create({
  memuat: { gap: RUANG[6] },
});
