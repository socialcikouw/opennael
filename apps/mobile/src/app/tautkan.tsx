import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { Judul, Keterangan, Merek } from "@/komponen/ui/teks";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { api, panggil } from "@/lib/api";
import { layarAwal } from "@/lib/navigasi";
import { sesi } from "@/lib/sesi";
import { infoPerangkat, versiAplikasi } from "@/platform/perangkat";

/** Jeda bertanya ke server selama menunggu bos memindai. */
const JEDA_TANYA_MS = 2000;

interface Tautan {
  id: string;
  kode: string;
  qr: string;
  klaim: string;
  kedaluwarsaAt: string;
}

const LANGKAH = [
  "Bos membuka web OpenNael → menu Tautkan HP.",
  "Bos memindai QR di bawah, atau mengetik kodenya.",
  "HP ini masuk sendiri begitu disetujui.",
];

function Langkah() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  return (
    <View style={g.tumpuk3}>
      {LANGKAH.map((teks, i) => (
        <View key={teks} style={[g.baris3, gaya.langkah]}>
          <View style={gaya.nomor}>
            <Text style={gaya.nomorTeks}>{i + 1}</Text>
          </View>
          <Text style={gaya.langkahTeks}>{teks}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * HP kasir / pengawas / kolektor: minta kode, tampilkan QR, lalu bertanya
 * berulang sampai bos menyetujui — sesi diambil dengan kunci klaim yang hanya
 * dipegang HP ini.
 */
export default function Tautkan() {
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

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    gulir: {
      gap: RUANG[6],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[4],
      paddingBottom: RUANG[10],
    },
    langkah: { alignItems: "flex-start" },
    nomor: {
      width: 28,
      height: 28,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: WARNA.utamaMuda,
    },
    nomorTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.utamaTua },
    langkahTeks: { ...HURUF.base, flex: 1, paddingTop: RUANG[0.5], color: WARNA.teksLabel },
    panel: {
      alignItems: "center",
      gap: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
      padding: RUANG[6],
      boxShadow: BAYANGAN.kecil,
    },
    qr: { borderRadius: SUDUT.besar, backgroundColor: WARNA.putih, padding: RUANG[3] },
    tengah: { alignItems: "center", gap: RUANG[1] },
    kodeLabel: { ...HURUF.xs, fontWeight: TEBAL.sedang, letterSpacing: 0.6, color: WARNA.redup },
    kode: {
      ...HURUF["3xl"],
      fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
      fontWeight: TEBAL.tebal,
      letterSpacing: 4,
      color: WARNA.teks,
    },
    menunggu: {
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.utamaLembut,
      paddingHorizontal: RUANG[4],
      paddingVertical: RUANG[2],
    },
    menungguTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utamaTua },
    sinyalPutus: { ...HURUF.sm, color: WARNA.waspada },
    memuat: { height: 256, alignItems: "center", justifyContent: "center", gap: RUANG[3] },
    habis: { width: "100%", alignItems: "center", gap: RUANG[4], paddingVertical: RUANG[4] },
    ikonHabis: {
      width: 56,
      height: 56,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: WARNA.abu,
    },
    rataTengah: { textAlign: "center" },
    penuh: { width: "100%" },
    versi: { ...HURUF.xs, textAlign: "center", color: WARNA.redup },
  });
