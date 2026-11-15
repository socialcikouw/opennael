import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Judul, Keterangan, Merek } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { api, panggil } from "@/lib/api";
import { layarAwal } from "@/lib/navigasi";
import { sesi } from "@/lib/sesi";
import { infoPerangkat, versiAplikasi } from "@/platform/perangkat";
import { RUANG } from "@/tema";
import { Langkah } from "./komponen/langkah";
import { PanelTautan, type Tautan } from "./komponen/panel-tautan";

/** Jeda bertanya ke server selama menunggu bos memindai. */
const JEDA_TANYA_MS = 2000;

/**
 * HP kasir / pengawas / kolektor: minta kode, tampilkan QR, lalu bertanya
 * berulang sampai bos menyetujui — sesi diambil dengan kunci klaim yang hanya
 * dipegang HP ini.
 */
export function LayarTautkan() {
  const [tautan, setTautan] = useState<Tautan | null>(null);
  const [status, setStatus] = useState<"memuat" | "menunggu" | "kedaluwarsa">("memuat");
  const [galat, setGalat] = useState<string | null>(null);
  const [sinyalPutus, setSinyalPutus] = useState(false);
  const [sisaDetik, setSisaDetik] = useState(0);
  const aktif = useRef(true);

  const minta = useCallback(async () => {
    setStatus("memuat");
    setGalat(null);
    try {
      const res = await panggil(() =>
        api.identitas.auth.tautan.$post({ json: { perangkat: infoPerangkat() } }),
      );
      if (res.status !== 201) throw new Error("Jawaban tak terduga");
      setTautan(await res.json());
      setStatus("menunggu");
    } catch (e) {
      setGalat((e as Error).message);
      setStatus("kedaluwarsa");
    }
  }, []);

  useEffect(() => {
    aktif.current = true;
    void minta();
    return () => {
      aktif.current = false;
    };
  }, [minta]);

  // Hitung mundur sampai kode kedaluwarsa.
  useEffect(() => {
    if (!tautan || status !== "menunggu") return;
    const hitung = () => {
      const sisa = Math.max(0, Math.round((Date.parse(tautan.kedaluwarsaAt) - Date.now()) / 1000));
      setSisaDetik(sisa);
      if (sisa === 0) setStatus("kedaluwarsa");
    };
    hitung();
    const j = setInterval(hitung, 1000);
    return () => clearInterval(j);
  }, [tautan, status]);

  // Bertanya berulang: menunggu → (disetujui bos) → tertaut.
  useEffect(() => {
    if (!tautan || status !== "menunggu") return;
    let berhenti = false;
    const tanya = async () => {
      try {
        const res = await panggil(() =>
          api.identitas.auth.tautan[":id"].klaim.$post({
            param: { id: tautan.id },
            json: { klaim: tautan.klaim },
          }),
        );
        if (res.status !== 200 || berhenti || !aktif.current) return;
        setSinyalPutus(false);
        const hasil = await res.json();
        if (hasil.status === "tertaut") {
          berhenti = true;
          await sesi.simpan({
            tokenAkses: hasil.tokenAkses,
            tokenSegar: hasil.tokenSegar,
            pengguna: hasil.pengguna,
          });
          router.replace(layarAwal(hasil.pengguna.peran));
        } else if (hasil.status === "kedaluwarsa") {
          setStatus("kedaluwarsa");
        }
      } catch {
        // Sinyal putus sesaat: coba lagi di putaran berikutnya.
        setSinyalPutus(true);
      }
    };
    const j = setInterval(() => void tanya(), JEDA_TANYA_MS);
    return () => {
      berhenti = true;
      clearInterval(j);
    };
  }, [tautan, status]);

  return (
    <SafeAreaView style={g.layar}>
      <ScrollView contentContainerStyle={gaya.gulir}>
        <Merek />
        <View style={g.tumpuk2}>
          <Judul>Tautkan HP ini</Judul>
          <Keterangan>
            HP kasir, pengawas, dan kolektor masuk tanpa kata sandi — cukup disetujui bos.
          </Keterangan>
        </View>
        <Langkah />

        {status === "kedaluwarsa" ? (
          <View style={g.tumpuk3}>
            <KotakKosong
              ikon="clock"
              judul={galat ? "Kode tidak bisa diminta" : "Kode sudah tidak berlaku"}
              isi="Minta kode baru, lalu tunjukkan ke bos."
            />
            <Tombol judul="Minta kode baru" ikon="refresh-cw" onPress={() => void minta()} />
          </View>
        ) : (
          <PanelTautan
            tautan={status === "menunggu" ? tautan : null}
            sisaDetik={sisaDetik}
            sinyalPutus={sinyalPutus}
          />
        )}

        <PesanGalat pesan={galat} />
        <Text style={[g.teksMini, gaya.versi]}>{versiAplikasi()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const gaya = StyleSheet.create({
  gulir: {
    gap: RUANG[6],
    paddingHorizontal: RUANG[5],
    paddingTop: RUANG[4],
    paddingBottom: RUANG[10],
  },
  versi: { textAlign: "center" },
});
