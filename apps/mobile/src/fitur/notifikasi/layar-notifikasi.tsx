import { useCallback } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Kerangka } from "@/komponen/ui/kerangka";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { GulirKeyboard } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { RUANG } from "@/tema";
import { usePengingat } from "./data";
import { ItemPengingat } from "./komponen/item-pengingat";

/**
 * NOTIFIKASI — layar bertumpuk yang dibuka lonceng di kepala tab Harian · Mingguan ·
 * Tempoan (Mode Kerja; isi & angka lonceng sama di ketiganya):
 * belum absen, kabar gerbang lapangan, yang belum ditagih dirinci per jenis
 * (harian · mingguan · tempoan jatuh tempo sekarang · tempoan lewat jatuh
 * tempo) beserta nama & nominalnya, tempoan jatuh tempo besok, Mutasi kas yang
 * sudah terbuka, laporan, dan hasil serah terima kas. Diturunkan dari data
 * lapangan di HP; notifikasi kiriman server belum ada.
 */
export function LayarNotifikasi() {
  const bawah = useSafeAreaInsets().bottom + RUANG[6];
  const { hariIni, tagihan, kas, pengingat } = usePengingat();

  const { refetch: segarHariIni } = hariIni;
  const { refetch: segarTagihan } = tagihan;
  const { refetch: segarKas } = kas;
  const segarkan = useCallback(
    () => Promise.all([segarHariIni(), segarTagihan(), segarKas()]),
    [segarHariIni, segarTagihan, segarKas],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (hariIni.isPending) return <Kerangka jenis="daftar" teks="Memuat pengingat…" />;
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
    // Formulir absen (kas lapangan, uang jalan) ada di sini: isian naik di atas papan ketik.
    <GulirKeyboard
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: bawah }]}
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
        <ItemPengingat key={p.kunci} p={p} />
      ))}
      {pengingat.length === 0 ? (
        <KotakKosong
          ikon="bell"
          judul="Tidak ada pengingat"
          isi="Semua yang perlu dikerjakan hari ini sudah beres."
        />
      ) : null}
    </GulirKeyboard>
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
});
