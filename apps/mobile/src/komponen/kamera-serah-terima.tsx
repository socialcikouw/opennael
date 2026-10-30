import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { unggahFotoSerahTerima } from "@/lib/foto";
import { useGaya } from "./tampilan";
import { HURUF, RUANG, SUDUT, type Warna } from "./tema";
import { Keterangan, PesanGalat, Tombol, useG } from "./ui";

interface Potret {
  uri: string;
  width: number;
  height: number;
}

/**
 * KAMERA SERAH TERIMA (A7) — nasabah memegang uang pencairan. Hanya dari
 * kamera (bukan galeri), diperiksa dulu, lalu dikompres & diunggah. Foto
 * berlaku 1 jam: potret sesaat sebelum menyimpan akad / gulung.
 */
export function KameraSerahTerima(props: {
  terbuka: boolean;
  onTutup: () => void;
  onSelesai: (fotoId: string, pratinjauUri: string) => void;
}) {
  const gaya = useGaya(buatGaya);
  const g = useG();
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
              <Tombol judul="Pakai foto ini" memuat={mengunggah} onPress={() => void pakai()} />
              <Tombol
                judul="Potret ulang"
                jenis="kedua"
                nonaktif={mengunggah}
                onPress={() => setPotret(null)}
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
              <PesanGalat pesan={galat} />
              <View style={gaya.kendali}>
                <Pressable onPress={tutup} style={gaya.sisi}>
                  <Text style={gaya.batal}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={() => void jepret()}
                  disabled={!siap}
                  style={[gaya.rana, siap ? null : gaya.ranaMati]}
                >
                  <View style={gaya.ranaIsi} />
                </Pressable>
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

/** Isian foto di formulir akad / gulung: tombol potret + pratinjau kecil. */
export function IsianFotoSerahTerima(props: {
  nilai: FotoSerahTerima | null;
  onUbah: (f: FotoSerahTerima | null) => void;
}) {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const [terbuka, setTerbuka] = useState(false);
  const berlaku = fotoMasihBerlaku(props.nilai);

  return (
    <View style={g.tumpuk2}>
      <Text style={g.label}>Foto serah terima</Text>
      {props.nilai && berlaku ? (
        <View style={g.baris3}>
          <Image source={{ uri: props.nilai.uri }} style={gaya.pratinjau} />
          <View style={[g.isi, gaya.keteranganFoto]}>
            <Text style={gaya.diambil}>
              Diambil{" "}
              {new Date(props.nilai.diambilAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · berlaku 1 jam
            </Text>
            <Pressable onPress={() => setTerbuka(true)} hitSlop={10}>
              <Text style={g.tautan}>Potret ulang</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {props.nilai ? (
            <Text style={g.galat}>Foto sudah lebih dari 1 jam — potret ulang.</Text>
          ) : null}
          <Tombol judul="Potret serah terima" jenis="kedua" onPress={() => setTerbuka(true)} />
        </>
      )}
      <KameraSerahTerima
        terbuka={terbuka}
        onTutup={() => setTerbuka(false)}
        onSelesai={(id, uri) => {
          props.onUbah({ id, uri, diambilAt: Date.now() });
          setTerbuka(false);
        }}
      />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    latar: { flex: 1, backgroundColor: WARNA.hitam },
    izin: {
      flex: 1,
      justifyContent: "center",
      gap: RUANG[4],
      backgroundColor: WARNA.permukaan,
      paddingHorizontal: RUANG[5],
    },
    panel: {
      gap: RUANG[3],
      backgroundColor: WARNA.hitam,
      paddingHorizontal: RUANG[5],
      paddingVertical: RUANG[4],
    },
    panelTerang: { backgroundColor: WARNA.permukaan },
    petunjuk: { ...HURUF.sm, textAlign: "center", color: WARNA.putih },
    kendali: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sisi: { width: 80, paddingVertical: RUANG[3] },
    batal: { ...HURUF.base, color: WARNA.putih },
    rana: {
      width: 80,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      borderWidth: 4,
      borderColor: WARNA.putih,
    },
    ranaMati: { opacity: 0.4 },
    ranaIsi: { width: 64, height: 64, borderRadius: SUDUT.bulat, backgroundColor: WARNA.putih },
    pratinjau: { width: 64, height: 80, borderRadius: SUDUT.kecil, backgroundColor: WARNA.abu },
    keteranganFoto: { gap: RUANG[1] },
    diambil: { ...HURUF.sm, color: WARNA.teksLabel },
  });
