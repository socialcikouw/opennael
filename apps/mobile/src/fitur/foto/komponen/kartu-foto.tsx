import { rupiah, tampilNama } from "@opennael/format";
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
 * per nasabah bercabang ke rel kampung; isinya foto serah terima, dengan lencana kecil
 * berlatar hitam bertulisan terakota di atas foto: angsuran ke- (kiri atas), nama dan
 * angsuran (kiri bawah); status (kanan atas) sedikit lebih besar: BERJALAN hijau / MACET
 * merah, tulisan putih 12. Ukuran bertingkat: angsuran ke- 20 (lingkaran 36), nama 16,
 * angsuran 12.
 * Ketuk = layar penuh.
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
        }, angsuran ${rupiah(f.angsuran)}. ${f.fotoId ? "Ketuk untuk layar penuh." : "Ketuk untuk detail nasabah."}`}
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
          <View style={[gaya.lencana, gaya.bulat]}>
            <Text style={[gaya.teks, gaya.teksKe]}>{f.angsuranKe}</Text>
          </View>
          <View style={[gaya.status, f.macet ? gaya.statusMacet : gaya.statusBerjalan]}>
            <Text style={gaya.teksStatus}>{f.macet ? "MACET" : "BERJALAN"}</Text>
          </View>
        </View>
        <View style={gaya.bawah}>
          <View style={[gaya.lencana, gaya.lencanaNama]}>
            <Text style={[gaya.teks, gaya.teksNama]} numberOfLines={1}>
              {nama}
            </Text>
          </View>
          <View style={gaya.lencana}>
            <Text style={[gaya.teks, gaya.teksAngsuran]} numberOfLines={1}>
              Angsuran {rupiah(f.angsuran)}
            </Text>
          </View>
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
    padding: RUANG[2],
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
  atas: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bawah: { alignItems: "flex-start", gap: RUANG[1] },
  // Hitam hangat bertulisan terakota terang (permintaan pemilik 28 Nov 2026).
  lencana: {
    maxWidth: "100%",
    paddingHorizontal: RUANG[1.5],
    paddingVertical: 2,
    borderRadius: SUDUT.kecil - 2,
    backgroundColor: WARNA.latarLencanaFoto,
  },
  // Lencana STATUS sedikit lebih besar supaya mencolok: berjalan hijau (arti "boleh"),
  // macet merah (arti "bahaya"), tulisan putih — kontras ≥ 4,5:1 diuji `token.test.ts`.
  status: {
    paddingHorizontal: RUANG[2],
    paddingVertical: RUANG[0.5],
    borderRadius: SUDUT.kecil - 2,
  },
  statusBerjalan: { backgroundColor: WARNA.sukses },
  statusMacet: { backgroundColor: WARNA.bahayaBingkai },
  teksStatus: { ...HURUF.xs, fontWeight: TEBAL.ekstra, color: WARNA.teksAtasSukses },
  // Lingkaran angsuran ke- (seperti kartu Harian): paling besar di kartu, 20 pt.
  bulat: {
    minWidth: UKURAN_KE,
    height: UKURAN_KE,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
    borderRadius: SUDUT.bulat,
  },
  lencanaNama: { paddingHorizontal: RUANG[2], paddingVertical: RUANG[0.5] },
  // Ukuran bertingkat: angsuran ke- 20 (lingkaran), nama 16, nominal angsuran 12 sedang.
  teks: { color: WARNA.teksLencanaFoto, fontVariant: ["tabular-nums"] },
  teksKe: { ...HURUF.xl, fontWeight: TEBAL.ekstra },
  teksNama: { ...HURUF.base, fontWeight: TEBAL.ekstra },
  teksAngsuran: { ...HURUF.xs, fontWeight: TEBAL.semi },
});
