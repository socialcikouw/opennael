import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { RUANG, SUDUT, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { usePengingat } from "./data";
import { ItemPengingat } from "./komponen/item-pengingat";

/**
 * NOTIFIKASI — pengingat kolektor: belum absen, kabar gerbang lapangan (libur,
 * di luar jam kerja, …), tagihan wajib yang belum dicatat, dan laporan yang
 * sudah boleh dibuka. Diturunkan dari data lapangan di HP; notifikasi kiriman
 * server belum ada (dirancang di docs lebih dulu). Tab ini menampilkan
 * banyaknya pengingat yang menunggu tindakan (`useJumlahPengingat`).
 */
export function LayarNotifikasi() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const g = useG();
  const ruangTab = useRuangTab();
  const { hariIni, tagihan, pengingat, belum } = usePengingat();

  const { refetch: segarHariIni } = hariIni;
  const { refetch: segarTagihan } = tagihan;
  const segarkan = useCallback(
    () => Promise.all([segarHariIni(), segarTagihan()]),
    [segarHariIni, segarTagihan],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (hariIni.isPending) return <Memuat teks="Memuat pengingat…" />;
  // Layar galat penuh hanya bila keadaan hari ini belum pernah berhasil dimuat.
  if (!pengingat) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      {hariIni.isError ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}
      {tagihan.isError ? <PesanGalat pesan={tagihan.error?.message} /> : null}
      {pengingat.map((p) => (
        <ItemPengingat key={p.jenis} p={p} jumlahBelum={belum?.length ?? 0} />
      ))}
      {pengingat.length === 0 ? (
        <View style={gaya.kosong}>
          <Ikon nama="bell" ukuran={28} warna={WARNA.redup} />
          <Keterangan>Tidak ada pengingat.</Keterangan>
        </View>
      ) : null}
    </ScrollView>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
    isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
    kosong: {
      alignItems: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: WARNA.garisTegas,
      paddingHorizontal: RUANG[4],
      paddingVertical: RUANG[8],
    },
  });
