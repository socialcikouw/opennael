import type { IndeksBuku } from "@opennael/contracts";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PilGulir } from "@/komponen/pil-gulir";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Kerangka } from "@/komponen/ui/kerangka";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Tombol } from "@/komponen/ui/tombol";
import { kueri } from "@/lib/api";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import {
  LABEL_SARINGAN,
  type SaringanBuku,
  type SeksiBuku,
  susunIndeks,
  URUTAN_SARINGAN,
} from "./inti/buku";
import { BarisBuku } from "./komponen/baris-buku";

/**
 * BUKU (Mode Rekap › Menu › Buku, 28 Nov 2026; rupa Buku v2 aplikasi lama) — indeks semua
 * nasabah pegangan yang pernah meminjam:
 *   12 nasabah · 31 pinjaman
 *   [ Cari nama atau kampung ]
 *   [Semua 12][Aktif 8][Macet 1][Selesai 3]
 *   A ─ baris…   B ─ baris…   (huruf indeks menempel saat digulir)
 * Ketuk nasabah = Detail Nasabah (semua pinjamannya). Satu bacaan ringan
 * (`GET /lapangan/buku`); saring & cari di HP, tertunda sedikit saat mengetik.
 */
export function LayarBuku() {
  const bawah = useSafeAreaInsets().bottom;
  const buku = useQuery(kueri.lapangan.buku());
  const [cari, setCari] = useState("");
  const cariTunda = useDeferredValue(cari);
  const [saring, setSaring] = useState<SaringanBuku>("semua");
  const { aktif: menarik, tarik } = useTarikSegarkan(() => buku.refetch());

  const indeks = useMemo(
    () => susunIndeks(buku.data ?? [], saring, cariTunda),
    [buku.data, saring, cariTunda],
  );
  const buka = useCallback(
    (b: IndeksBuku) =>
      router.push({ pathname: "/kolektor/nasabah/[id]", params: { id: b.nasabah.id } }),
    [],
  );

  if (buku.isPending) return <Kerangka jenis="daftar" teks="Memuat buku…" />;
  if (!buku.data) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={buku.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void buku.refetch()} />
      </View>
    );
  }

  return (
    <SectionList<IndeksBuku, SeksiBuku>
      style={g.layar}
      sections={indeks.seksi}
      keyExtractor={(b) => b.nasabah.id}
      stickySectionHeadersEnabled
      initialNumToRender={14}
      contentContainerStyle={[gaya.isi, { paddingBottom: bawah + RUANG[6] }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={menarik}
          onRefresh={tarik}
          tintColor={AKSEN.teks}
          colors={[AKSEN.teks]}
        />
      }
      ListHeaderComponent={
        <View style={gaya.kepala}>
          <Text style={g.teksRedup}>
            {indeks.jumlah.semua} nasabah · {indeks.jumlahPinjaman} pinjaman
          </Text>
          <View style={gaya.cari}>
            <Ikon nama="search" ukuran={17} warna={WARNA.samar} />
            <TextInput
              style={gaya.teksCari}
              value={cari}
              onChangeText={setCari}
              placeholder="Cari nama atau kampung"
              placeholderTextColor={WARNA.samar}
              returnKeyType="search"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
          </View>
          <PilGulir
            opsi={URUTAN_SARINGAN.map((s) => ({
              nilai: s,
              label: LABEL_SARINGAN[s],
              angka: indeks.jumlah[s],
            }))}
            nilai={saring}
            onPilih={setSaring}
          />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={gaya.huruf}>
          <Text style={gaya.hurufTeks}>{section.huruf}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={gaya.item}>
          <BarisBuku b={item} onBuka={buka} />
        </View>
      )}
      ListEmptyComponent={
        <KotakKosong
          ikon="search-x"
          judul={cari ? "Tidak ditemukan" : "Belum ada nasabah"}
          isi={
            cari
              ? "Tidak ada nasabah yang cocok dengan pencarian ini."
              : "Nasabah muncul di sini sesudah akad pertama."
          }
        />
      }
    />
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  isi: { paddingHorizontal: RUANG[5], paddingTop: RUANG[3] },
  kepala: { gap: RUANG[3], paddingBottom: RUANG[2] },
  cari: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
    paddingHorizontal: RUANG[3],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.permukaan,
    borderWidth: 1,
    borderColor: WARNA.garis,
  },
  teksCari: { ...HURUF.base, flex: 1, paddingVertical: 0, color: WARNA.teks },
  // Huruf indeks menempel di atas saat digulir — latar layar supaya tak tembus.
  huruf: { paddingTop: RUANG[3], paddingBottom: RUANG[1.5], backgroundColor: WARNA.latar },
  hurufTeks: { ...HURUF.sm, fontWeight: TEBAL.ekstra, color: WARNA.utama },
  item: { paddingBottom: RUANG[2] },
});
