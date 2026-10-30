import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Tombol } from "@/komponen/ui/tombol";
import { api } from "@/lib/api";
import { sesi } from "@/lib/sesi";

/** Keluar dari HP ini — diputus di server bila terjangkau; sesi di HP tetap dihapus walau tidak. */
export function TombolKeluar() {
  const [jalan, setJalan] = useState(false);
  const keluar = async () => {
    setJalan(true);
    await api.identitas.auth.keluar.$post().catch(() => null);
    await sesi.hapus();
    router.replace("/tautkan");
  };
  return (
    <Tombol
      judul="Keluar dari HP ini"
      jenis="bahaya"
      ikon="log-out"
      memuat={jalan}
      onPress={() =>
        Alert.alert("Keluar?", "HP ini perlu ditautkan ulang oleh bos untuk masuk lagi.", [
          { text: "Batal", style: "cancel" },
          { text: "Keluar", style: "destructive", onPress: () => void keluar() },
        ])
      }
    />
  );
}
