import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "@/komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/tema";
import { Ikon } from "@/komponen/ui";
import type { Baris, TabKerja } from "../inti/daftar";

/** Judul kelompok: "RUTE 1 - PULE BARAT" · "10 = 500K", atau "SUDAH DITAGIH" · "4 nasabah". */
export const JudulKelompok = memo(function JudulKelompok({
  baris,
  aksen,
}: {
  baris: Extract<Baris, { jenis: "judul" }>;
  aksen: WarnaMode;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.judul}>
      <Ikon
        nama={baris.sudah ? "circle-check" : "map-pin"}
        ukuran={13}
        warna={baris.sudah ? aksen.teks : WARNA.redup}
      />
      <Text style={gaya.judulTeks} numberOfLines={1}>
        {baris.label}
      </Text>
      <Text style={gaya.ringkas}>{baris.ringkas}</Text>
    </View>
  );
});

/** Kerangka kartu saat daftar pertama kali dimuat — bentuknya sama dengan kartu. */
export function KerangkaKartu() {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.kerangka}>
      <View style={gaya.kerangkaKepala}>
        <View style={gaya.kerangkaBulat} />
        <View style={gaya.kerangkaTeks}>
          <View style={[gaya.kerangkaBaris, { width: "55%" }]} />
          <View style={[gaya.kerangkaBaris, { width: "35%" }]} />
        </View>
      </View>
      <View style={gaya.kerangkaRel} />
      <View style={gaya.kerangkaGrid} />
      <View style={gaya.kerangkaTombol} />
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
      gap: RUANG[1.5],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[3],
      paddingBottom: RUANG[2],
    },
    judulTeks: {
      ...HURUF.xs,
      flex: 1,
      fontWeight: TEBAL.tebal,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: WARNA.teksKedua,
    },
    ringkas: {
      ...HURUF.xs,
      fontWeight: TEBAL.semi,
      fontVariant: ["tabular-nums"],
      color: WARNA.redup,
    },
    kerangka: {
      gap: RUANG[3],
      marginHorizontal: RUANG[4],
      marginBottom: RUANG[3],
      padding: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    kerangkaKepala: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    kerangkaBulat: { width: 44, height: 44, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kerangkaTeks: { flex: 1, gap: RUANG[2] },
    kerangkaBaris: { height: 10, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kerangkaRel: { height: 6, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kerangkaGrid: { height: 96, borderRadius: SUDUT.besar, backgroundColor: WARNA.abu },
    kerangkaTombol: { height: 48, borderRadius: SUDUT.sedang, backgroundColor: WARNA.abu },
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
