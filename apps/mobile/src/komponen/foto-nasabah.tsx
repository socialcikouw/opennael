import { Image, type ImageSource } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALAMAT_API } from "../lib/api";
import { sesi } from "../lib/sesi";
import { HURUF, RUANG, SUDUT, TEBAL } from "./tema";
import { Ikon, WARNA } from "./ui";

/**
 * Berkas `GET /foto/:id` bertoken. Disimpan di disk HP per id foto — tiap foto
 * diunduh sekali per HP, walau tokennya sudah berganti.
 */
function sumberFoto(id: string): ImageSource {
  const token = sesi.ambil()?.tokenAkses;
  return {
    uri: `${ALAMAT_API}/foto/${id}`,
    cacheKey: `foto-${id}`,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  };
}

/**
 * FOTO NASABAH bulat — foto serah terima pinjamannya (schema-foto: foto
 * profil = foto serah terima terakhir). Inisial bila tak ada foto (salinan
 * buku lama) atau gagal dimuat. `tanda` = lencana centang di pojok.
 */
export function AvatarNasabah(props: {
  fotoId: string | null;
  nama: string;
  ukuran: number;
  tanda?: boolean;
}) {
  const [gagal, setGagal] = useState(false);
  const bulat = { width: props.ukuran, height: props.ukuran, borderRadius: props.ukuran / 2 };
  return (
    <View>
      {props.fotoId && !gagal ? (
        <Image
          source={sumberFoto(props.fotoId)}
          recyclingKey={props.fotoId}
          cachePolicy="disk"
          contentFit="cover"
          transition={150}
          onError={() => setGagal(true)}
          style={[bulat, gaya.latarFoto]}
          accessibilityLabel={`Foto ${props.nama}`}
        />
      ) : (
        <View style={[bulat, gaya.inisial]}>
          <Text style={gaya.inisialHuruf}>{props.nama.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      {props.tanda ? (
        <View style={gaya.tanda}>
          <Ikon nama="check" ukuran={12} warna={WARNA.putih} />
        </View>
      ) : null}
    </View>
  );
}

/** FOTO SERAH TERIMA besar di rincian pinjaman; ketuk = layar penuh. */
export function FotoSerahTerima({ fotoId, nama }: { fotoId: string; nama: string }) {
  const [penuh, setPenuh] = useState(false);
  const [gagal, setGagal] = useState(false);
  const atas = useSafeAreaInsets().top;

  if (gagal) {
    return (
      <View style={[gaya.besar, gaya.gagal]}>
        <Ikon nama="image" ukuran={28} warna={WARNA.redup} />
        <Text style={gaya.gagalTeks}>Foto serah terima tidak bisa dimuat</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setPenuh(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Foto serah terima ${nama} — ketuk untuk layar penuh`}
      >
        <Image
          source={sumberFoto(fotoId)}
          cachePolicy="disk"
          contentFit="cover"
          transition={150}
          onError={() => setGagal(true)}
          style={[gaya.besar, gaya.latarFoto]}
        />
        <View style={gaya.petunjuk}>
          <Ikon nama="maximize-2" ukuran={14} warna={WARNA.putih} />
        </View>
      </Pressable>
      <Modal
        visible={penuh}
        animationType="fade"
        onRequestClose={() => setPenuh(false)}
        statusBarTranslucent
      >
        <Pressable style={gaya.layarPenuh} onPress={() => setPenuh(false)}>
          <Image
            source={sumberFoto(fotoId)}
            cachePolicy="disk"
            contentFit="contain"
            style={gaya.isiPenuh}
          />
          <View style={[gaya.tutup, { top: atas + RUANG[3] }]}>
            <Ikon nama="x" ukuran={24} warna={WARNA.putih} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const gaya = StyleSheet.create({
  latarFoto: { backgroundColor: WARNA.abuTua },
  inisial: { alignItems: "center", justifyContent: "center", backgroundColor: WARNA.abu },
  inisialHuruf: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teksKedua },
  tanda: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: SUDUT.bulat,
    borderWidth: 2,
    borderColor: WARNA.permukaan,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.utama,
  },
  besar: { width: "100%", aspectRatio: 4 / 3, borderRadius: SUDUT.besar },
  petunjuk: {
    position: "absolute",
    right: RUANG[2],
    bottom: RUANG[2],
    padding: RUANG[1.5],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.tiraiGelap,
  },
  gagal: {
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[2],
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: WARNA.garisTegas,
  },
  gagalTeks: { ...HURUF.sm, color: WARNA.redup },
  layarPenuh: { flex: 1, backgroundColor: WARNA.hitam },
  isiPenuh: { flex: 1 },
  tutup: {
    position: "absolute",
    right: RUANG[4],
    padding: RUANG[2],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.tiraiTerang,
  },
});
