import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Image, Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Tekan } from "@/komponen/ui/tekan";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { unggahFotoSerahTerima } from "@/platform/foto";
import { HURUF, RUANG, SUDUT, WARNA } from "@/tema";

interface Potret {
  uri: string;
  width: number;
  height: number;
}

/**
 * KAMERA SERAH TERIMA (A7) — nasabah memegang uang pencairan. Hanya dari
 * kamera (bukan galeri), diperiksa dulu, lalu dikompres & diunggah. Foto
 * berlaku 1 jam: potret sesaat sebelum menyimpan akad / gulung.
 *
 * Sesudah memotret: "Potret ulang" di atas, tombol utama di bawah (dalam jangkauan jempol;
 * sketsa pemilik 26 Nov 2026). `judulPakai` = tulisan tombol utama (akad: "Selanjutnya");
 * `keterangan` = satu baris kecil di bawah petunjuk (akad: keadaan GPS titik rumah).
 */
export function KameraSerahTerima(props: {
  terbuka: boolean;
  onTutup: () => void;
  onSelesai: (fotoId: string, pratinjauUri: string) => void;
  judulPakai?: string;
  keterangan?: string | undefined;
}) {
  const [izin, mintaIzin] = useCameraPermissions();
  const kamera = useRef<CameraView>(null);
  const [potret, setPotret] = useState<Potret | null>(null);
  const [siap, setSiap] = useState(false);
  const [mengunggah, setMengunggah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const tutup = () => {
    setPotret(null);
    setGalat(null);
    props.onTutup();
  };

  const jepret = async () => {
    if (!kamera.current) return;
    setGalat(null);
    try {
      const f = await kamera.current.takePictureAsync({ quality: 0.8 });
      setPotret({ uri: f.uri, width: f.width, height: f.height });
    } catch (e) {
      setGalat((e as Error).message);
    }
  };

  const pakai = async () => {
    if (!potret) return;
    setMengunggah(true);
    setGalat(null);
    try {
      const id = await unggahFotoSerahTerima(potret.uri, potret);
      props.onSelesai(id, potret.uri);
      setPotret(null);
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setMengunggah(false);
    }
  };

  return (
    <Modal visible={props.terbuka} animationType="slide" onRequestClose={tutup}>
      <SafeAreaView style={gaya.latar}>
        {!izin ? null : !izin.granted ? (
          <View style={gaya.izin}>
            <Keterangan>
              Kamera dibutuhkan untuk memotret nasabah memegang uang pencairan.
            </Keterangan>
            {izin.canAskAgain ? (
              <Tombol judul="Izinkan kamera" onPress={() => void mintaIzin()} />
            ) : (
              <Keterangan>Izin kamera ditolak — buka Pengaturan HP untuk mengizinkan.</Keterangan>
            )}
            <Tombol judul="Batal" jenis="kedua" onPress={tutup} />
          </View>
        ) : potret ? (
          <View style={g.isi}>
            <Image source={{ uri: potret.uri }} style={g.isi} resizeMode="contain" />
            <View style={[gaya.panel, gaya.panelTerang]}>
              <PesanGalat pesan={galat} />
              <Tombol
                judul="Potret ulang"
                ikon="refresh-cw"
                jenis="kedua"
                nonaktif={mengunggah}
                onPress={() => setPotret(null)}
              />
              <Tombol
                judul={props.judulPakai ?? "Pakai foto ini"}
                memuat={mengunggah}
                onPress={() => void pakai()}
              />
            </View>
          </View>
        ) : (
          <View style={g.isi}>
            <CameraView
              ref={kamera}
              style={g.isi}
              facing="back"
              animateShutter
              onCameraReady={() => setSiap(true)}
            />
            <View style={gaya.panel}>
              <Text style={gaya.petunjuk}>
                Nasabah memegang uang pencairan, wajah terlihat jelas.
              </Text>
              {props.keterangan ? <Text style={gaya.keterangan}>{props.keterangan}</Text> : null}
              <PesanGalat pesan={galat} />
              <View style={gaya.kendali}>
                <Tekan onPress={tutup} style={gaya.sisi}>
                  <Text style={gaya.batal}>Batal</Text>
                </Tekan>
                <Tekan
                  getar="ketuk"
                  onPress={() => void jepret()}
                  disabled={!siap}
                  style={[gaya.rana, siap ? null : gaya.ranaMati]}
                >
                  <View style={gaya.ranaIsi} />
                </Tekan>
                <View style={gaya.sisi} />
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export interface FotoSerahTerima {
  id: string;
  uri: string;
  diambilAt: number;
}

/** Foto masih boleh dipakai — sisakan 5 menit dari batas 1 jam server (A7). */
export function fotoMasihBerlaku(f: FotoSerahTerima | null): f is FotoSerahTerima {
  return !!f && Date.now() - f.diambilAt < 55 * 60 * 1000;
}

const gaya = StyleSheet.create({
  latar: { flex: 1, backgroundColor: WARNA.latarMedia },
  izin: {
    flex: 1,
    justifyContent: "center",
    gap: RUANG[4],
    backgroundColor: WARNA.permukaan,
    paddingHorizontal: RUANG[5],
  },
  panel: {
    gap: RUANG[3],
    backgroundColor: WARNA.latarMedia,
    paddingHorizontal: RUANG[5],
    paddingVertical: RUANG[4],
  },
  panelTerang: { backgroundColor: WARNA.permukaan },
  petunjuk: { ...HURUF.sm, textAlign: "center", color: WARNA.diAtasFoto },
  keterangan: { ...HURUF.xs, textAlign: "center", color: WARNA.diAtasFoto, opacity: 0.8 },
  kendali: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sisi: { width: 80, paddingVertical: RUANG[3] },
  batal: { ...HURUF.base, color: WARNA.diAtasFoto },
  rana: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    borderWidth: 4,
    borderColor: WARNA.diAtasFoto,
  },
  ranaMati: { opacity: 0.4 },
  ranaIsi: {
    width: 64,
    height: 64,
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.diAtasFoto,
  },
});
