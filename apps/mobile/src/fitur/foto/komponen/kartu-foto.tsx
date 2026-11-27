import { LABEL_JENIS, rupiah, tampilNama } from "@opennael/format";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { sumberFoto } from "@/fitur/lapangan";
import { BarisRel, JARAK_KARTU } from "@/komponen/rel-kartu";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { FotoNasabah } from "../inti/kelompok-foto";

/** Garis tengah lingkaran angsuran ke- (pt). */
const UKURAN_KE = 36;
/** Jarak dari atas kartu ke cabang rel (pt) — garis tengah lingkaran angsuran ke-. */
const CABANG = RUANG[2] + UKURAN_KE / 2;

/**
 * KARTU FOTO (tab Foto, rupa kartu Harian — permintaan pemilik 28 Nov 2026): satu kartu
 * per nasabah bercabang ke rel kampung; isinya foto serah terima. Tulisan MENEMPEL di foto
 * seperti cap kamera (rekomendasi saya atas permintaan pemilik "cantik & jelas dibaca"):
 *   - kiri atas: lingkaran angsuran ke- gelap tembus pandang, angka putih 16 pt, tepi putih;
 *   - kanan atas: kapsul status serupa (gelap bening, tepi putih, tulisan putih 12 pt) dengan
 *     titik warna arti — hijau BERJALAN / merah MACET;
 *   - dasar: PITA gelap tembus pandang selebar foto — nama putih 16 pt tebal, jenis • hari tagih + angsuran ("Mingguan • Rabu Rp …") 12 pt
 *     (sama dengan pita alamat di foto Detail Nasabah).
 * Ketuk = layar penuh (berfoto) / Detail Nasabah (belum berfoto).
 */
export const KartuFoto = memo(function KartuFoto(props: {
  foto: FotoNasabah;
  akhir: boolean;
  onBuka: () => void;
}) {
  const f = props.foto;
  const nama = tampilNama(f.nama);
  return (
    <BarisRel cabang={CABANG} akhir={props.akhir} jarak={JARAK_KARTU}>
      <Tekan
        onPress={props.onBuka}
        accessibilityRole={f.fotoId ? "imagebutton" : "button"}
        accessibilityLabel={`${f.fotoId ? "Foto" : "Belum ada foto"} ${nama}, angsuran ke ${f.angsuranKe}${
          f.macet ? ", macet" : ""
        }, ${LABEL_JENIS[f.jenis]}${f.hariTagih ? ` hari ${f.hariTagih}` : ""} ${rupiah(f.angsuran)}. ${f.fotoId ? "Ketuk untuk layar penuh." : "Ketuk untuk detail nasabah."}`}
        style={({ pressed }) => [gaya.kartu, pressed ? gaya.ditekan : null]}
      >
        {f.fotoId ? (
          <Image
            source={sumberFoto(f.fotoId)}
            recyclingKey={f.fotoId}
            cachePolicy="disk"
            contentFit="cover"
            transition={150}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          // Belum berfoto (salinan buku lama): avatar ikon orang di tengah kartu.
          <View style={gaya.avatarBidang}>
            <View style={gaya.avatar}>
              <Ikon nama="user-round" ukuran={52} warna={WARNA.utamaTua} />
            </View>
            <Text style={gaya.tanpaFoto}>Belum ada foto</Text>
          </View>
        )}
        <View style={gaya.atas}>
          <View style={gaya.bulat}>
            <Text style={gaya.teksKe}>{f.angsuranKe}</Text>
          </View>
          <View style={[gaya.status, f.macet ? gaya.statusMacet : null]}>
            <View
              style={[
                gaya.titik,
                { backgroundColor: f.macet ? WARNA.bahayaDiAtasFoto : WARNA.suksesDiAtasFoto },
              ]}
            />
            <Text style={[gaya.teksStatus, f.macet ? gaya.teksMacet : null]}>
              {f.macet ? "MACET" : "BERJALAN"}
            </Text>
          </View>
        </View>
        <View style={gaya.pita}>
          <Text style={gaya.teksNama} numberOfLines={1}>
            {nama}
          </Text>
          <Text style={gaya.teksAngsuran} numberOfLines={1}>
            {LABEL_JENIS[f.jenis]}
            {f.hariTagih ? ` • ${f.hariTagih}` : ""} {rupiah(f.angsuran)}
          </Text>
        </View>
      </Tekan>
    </BarisRel>
  );
});

const gaya = StyleSheet.create({
  kartu: {
    aspectRatio: 1,
    overflow: "hidden",
    justifyContent: "space-between",
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.isiNetralTegas,
  },
  ditekan: { opacity: 0.85 },
  avatarBidang: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[2],
    backgroundColor: WARNA.isiNetral,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.utamaMuda,
  },
  tanpaFoto: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.redup },
  atas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: RUANG[2],
  },
  // Pita dasar selebar foto: lapisan gelap tembus pandang, tulisan putih (seperti cap kamera).
  pita: {
    gap: RUANG[0.5],
    paddingHorizontal: RUANG[3],
    paddingVertical: RUANG[2],
    backgroundColor: WARNA.tiraiGelap,
  },
  // Kapsul STATUS — rupa sama dengan lingkaran angsuran ke- (gelap bening, tepi putih),
  // arti dibawa titik warna: hijau berjalan / merah macet.
  status: {
    height: UKURAN_KE - 8,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1.5],
    paddingHorizontal: RUANG[2.5],
    borderRadius: SUDUT.bulat,
    borderWidth: 1.5,
    borderColor: WARNA.diAtasFoto,
    backgroundColor: WARNA.tiraiGelap,
  },
  // MACET lebih mencolok: tepi & tulisan merah terang (BERJALAN tetap putih).
  statusMacet: { borderColor: WARNA.bahayaDiAtasFoto },
  teksMacet: { color: WARNA.bahayaDiAtasFoto },
  titik: { width: 8, height: 8, borderRadius: 4 },
  teksStatus: { ...HURUF.xs, fontWeight: TEBAL.ekstra, color: WARNA.diAtasFoto },
  // Lingkaran angsuran ke- (seperti kartu Harian): 36 pt, gelap tembus pandang, tepi putih.
  bulat: {
    minWidth: UKURAN_KE,
    height: UKURAN_KE,
    paddingHorizontal: RUANG[1.5],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    borderWidth: 1.5,
    borderColor: WARNA.diAtasFoto,
    backgroundColor: WARNA.tiraiGelap,
  },
  teksKe: {
    ...HURUF.base,
    fontWeight: TEBAL.ekstra,
    color: WARNA.diAtasFoto,
    fontVariant: ["tabular-nums"],
  },
  teksNama: { ...HURUF.base, fontWeight: TEBAL.ekstra, color: WARNA.diAtasFoto },
  teksAngsuran: {
    ...HURUF.xs,
    fontWeight: TEBAL.semi,
    color: WARNA.diAtasFoto,
    opacity: 0.9,
    fontVariant: ["tabular-nums"],
  },
});
