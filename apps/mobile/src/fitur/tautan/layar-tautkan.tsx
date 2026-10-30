import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { Judul, Keterangan, Merek } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { api, panggil } from "@/lib/api";
import { layarAwal } from "@/lib/navigasi";
import { sesi } from "@/lib/sesi";
import { infoPerangkat, versiAplikasi } from "@/platform/perangkat";
import { buatGaya } from "./gaya";
import { Langkah } from "./komponen/langkah";

/** Jeda bertanya ke server selama menunggu bos memindai. */
const JEDA_TANYA_MS = 2000;

interface Tautan {
  id: string;
  kode: string;
  qr: string;
  klaim: string;
  kedaluwarsaAt: string;
}

/**
 * HP kasir / pengawas / kolektor: minta kode, tampilkan QR, lalu bertanya
 * berulang sampai bos menyetujui — sesi diambil dengan kunci klaim yang hanya
 * dipegang HP ini.
 */
export function LayarTautkan() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const g = useG();
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

  const menit = Math.floor(sisaDetik / 60);
  const detik = String(sisaDetik % 60).padStart(2, "0");

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

        <View style={gaya.panel}>
          {status === "menunggu" && tautan ? (
            <>
              <View style={gaya.qr}>
                <QRCode value={tautan.qr} size={208} />
              </View>
              <View style={gaya.tengah}>
                <Text style={gaya.kodeLabel}>ATAU KETIK KODE</Text>
                <Text selectable style={gaya.kode}>
                  {tautan.kode}
                </Text>
              </View>
              <View style={[g.baris2, gaya.menunggu]}>
                <ActivityIndicator size="small" color={WARNA.utama} />
                <Text style={gaya.menungguTeks}>
                  Menunggu persetujuan bos · {menit}:{detik}
                </Text>
              </View>
              {sinyalPutus ? (
                <View style={g.baris2}>
                  <Ikon nama="cloud-off" ukuran={16} warna={WARNA.waspada} />
                  <Text style={gaya.sinyalPutus}>Sinyal terputus — terus mencoba…</Text>
                </View>
              ) : null}
            </>
          ) : status === "memuat" ? (
            <View style={gaya.memuat}>
              <ActivityIndicator color={WARNA.utama} />
              <Text style={g.teksRedup}>Meminta kode…</Text>
            </View>
          ) : (
            <View style={gaya.habis}>
              <View style={gaya.ikonHabis}>
                <Ikon nama="clock" ukuran={28} warna={WARNA.redup} />
              </View>
              <View style={gaya.tengah}>
                <Text style={g.subjudul}>
                  {galat ? "Kode tidak bisa diminta" : "Kode sudah tidak berlaku"}
                </Text>
                <Text style={[g.teksKecil, gaya.rataTengah]}>
                  Minta kode baru, lalu tunjukkan ke bos.
                </Text>
              </View>
              <View style={gaya.penuh}>
                <Tombol judul="Minta kode baru" ikon="refresh-cw" onPress={() => void minta()} />
              </View>
            </View>
          )}
        </View>

        <PesanGalat pesan={galat} />
        <Text style={gaya.versi}>{versiAplikasi()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
