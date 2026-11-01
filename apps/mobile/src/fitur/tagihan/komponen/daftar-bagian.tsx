import { rupiah } from "@opennael/format";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { Baris, TabKerja } from "../inti/daftar";
import { LEBAR_REL, TEBAL_REL, TENGAH_REL } from "./rel-kartu";

/** Tinggi lencana jumlah; rel turun dari bawahnya. */
const TINGGI_JUMLAH = 24;
const ATAS_JUDUL = RUANG[3];

/**
 * Judul kelompok (kampung), akar rel pohon kartu di bawahnya:
 *   [10] PERMATA CITRA GARDEN        Rp 150.000  ▼
 * Jumlah nasabah, nama kampung, total angsuran kelompok (target tagih), dan
 * panah: ketuk judul untuk melipat / membuka kartunya. "Sudah ditagih" tanpa
 * uang ("hanya jumlah nasabah").
 */
export const JudulKelompok = memo(function JudulKelompok({
  baris,
  onLipat,
}: {
  baris: Extract<Baris, { jenis: "judul" }>;
  onLipat: (id: string) => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const uang = baris.total !== null ? rupiah(baris.total) : null;
  return (
    <Pressable
      onPress={() => onLipat(baris.id)}
      accessibilityRole="button"
      accessibilityState={{ expanded: !baris.terlipat }}
      accessibilityLabel={`${baris.nama}, ${baris.jumlah} nasabah${uang ? `, ${uang}` : ""}. ${
        baris.terlipat ? "Ketuk untuk membuka" : "Ketuk untuk melipat"
      }`}
      style={gaya.judul}
    >
      <View style={gaya.jumlah}>
        <Text style={gaya.jumlahTeks} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {baris.jumlah}
        </Text>
      </View>
      <Text style={gaya.nama} numberOfLines={1}>
        {baris.nama}
      </Text>
      {uang ? <Text style={gaya.total}>{uang}</Text> : null}
      <Ikon
        nama={baris.terlipat ? "chevron-right" : "chevron-down"}
        ukuran={16}
        warna={WARNA.redup}
      />
      {!baris.terlipat && !baris.sudah ? <View pointerEvents="none" style={gaya.rel} /> : null}
    </Pressable>
  );
});

/** Kerangka kartu saat daftar pertama kali dimuat — bentuknya sama dengan kartu. */
export function KerangkaKartu() {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.kerangka}>
      <View style={gaya.kerangkaKotak}>
        <View style={[gaya.kerangkaBaris, { width: "55%" }]} />
        <View style={[gaya.kerangkaBaris, { width: "35%" }]} />
      </View>
      <View style={gaya.kerangkaKotak}>
        <View style={gaya.kerangkaGrid} />
        <View style={[gaya.kerangkaBaris, { width: "45%" }]} />
      </View>
    </View>
  );
}

const PESAN_KOSONG: Record<TabKerja, { judul: string; isi: string }> = {
  aktif: {
    judul: "Tidak ada tagihan aktif",
    isi: "Semua nasabah berjalan sudah ditagih hari ini.",
  },
  macet: {
    judul: "Tidak ada nasabah macet",
    isi: "Tak ada nasabah macet yang belum ditagih hari ini.",
  },
  droping: { judul: "Belum ada droping", isi: "Belum ada pencairan hari ini." },
};

export function Kosong({
  tab,
  mencari,
  aksen,
}: {
  tab: TabKerja;
  mencari: boolean;
  aksen: WarnaMode;
}) {
  const gaya = useGaya(buatGaya);
  const pesan = PESAN_KOSONG[tab];
  return (
    <View style={gaya.kosong}>
      <View style={[gaya.kosongIkon, { backgroundColor: aksen.lembut }]}>
        <Ikon nama={mencari ? "search-x" : "circle-check"} ukuran={24} warna={aksen.teks} />
      </View>
      <Text style={gaya.kosongJudul}>{mencari ? "Tidak ditemukan" : pesan.judul}</Text>
      <Text style={gaya.kosongIsi}>
        {mencari ? "Tidak ada nasabah yang cocok dengan pencarian ini." : pesan.isi}
      </Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    judul: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
      marginHorizontal: RUANG[4],
      paddingTop: ATAS_JUDUL,
      paddingBottom: RUANG[2],
    },
    // Lebar 30 (garis tengah di 15) = garis tengah rel kartu di bawahnya.
    // Abu netral berbentuk kotak: sengaja beda dari lingkaran angsuran ke- di kartu (pekat, berwarna mode).
    jumlah: {
      width: LEBAR_REL - RUANG[2],
      height: TINGGI_JUMLAH,
      borderRadius: SUDUT.kecil,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: WARNA.garisTegas,
      backgroundColor: WARNA.abu,
    },
    jumlahTeks: {
      ...HURUF.xs,
      fontWeight: TEBAL.tebal,
      color: WARNA.teksKedua,
      fontVariant: ["tabular-nums"],
    },
    nama: {
      ...HURUF.xs,
      flex: 1,
      fontWeight: TEBAL.tebal,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: WARNA.teksKedua,
    },
    total: {
      ...HURUF.xs,
      fontWeight: TEBAL.semi,
      fontVariant: ["tabular-nums"],
      color: WARNA.redup,
    },
    // Rel turun dari bawah lencana jumlah sampai dasar judul, bertemu rel kartu pertama.
    rel: {
      position: "absolute",
      top: ATAS_JUDUL + TINGGI_JUMLAH,
      bottom: 0,
      left: TENGAH_REL - TEBAL_REL / 2,
      width: TEBAL_REL,
      backgroundColor: WARNA.garisTegas,
    },
    kerangka: { marginHorizontal: RUANG[4], marginBottom: RUANG[3], paddingLeft: LEBAR_REL },
    kerangkaKotak: {
      gap: RUANG[3],
      padding: RUANG[3],
      marginBottom: RUANG[2],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    kerangkaBaris: { height: 10, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kerangkaGrid: { height: 96, borderRadius: SUDUT.besar, backgroundColor: WARNA.abu },
    kosong: {
      alignItems: "center",
      gap: RUANG[2],
      marginHorizontal: RUANG[4],
      marginTop: RUANG[6],
      padding: RUANG[6],
    },
    kosongIkon: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
    },
    kosongJudul: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
    kosongIsi: { ...HURUF.sm, textAlign: "center", color: WARNA.redup },
  });
