import { tampilKampung, tampilNama, tanggalBertahun } from "@opennael/format";
import { Image } from "expo-image";
import { useDeferredValue, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sumberFoto, useTagihan } from "@/fitur/lapangan";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Kerangka } from "@/komponen/ui/kerangka";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Tekan } from "@/komponen/ui/tekan";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { type FotoNasabah, type KelompokFoto, kelompokFoto } from "./inti/kelompok-foto";
import { FotoLayarPenuh } from "./komponen/foto-layar-penuh";

/** Lebar satu foto di karosel (pt); tingginya 4:3 tegak. */
const LEBAR_FOTO = 140;

/**
 * FOTO NASABAH (tombol kanan Mode Rekap) — foto serah terima nasabah pegangan, satu per
 * nasabah, dikelompokkan per kampung dalam karosel yang digeser ke samping; kolom cari nama
 * di atas. Ketuk foto = layar penuh, bisa digeser ke foto lain di kampung yang sama.
 */
export function LayarFotoNasabah() {
  const bawah = useSafeAreaInsets().bottom + RUANG[6];
  const tagihan = useTagihan();
  const [cari, setCari] = useState("");
  const cariTunda = useDeferredValue(cari);
  const kelompok = useMemo(
    () => (tagihan.data ? kelompokFoto(tagihan.data, cariTunda) : []),
    [tagihan.data, cariTunda],
  );
  const [buka, setBuka] = useState<{ foto: readonly FotoNasabah[]; awal: number } | null>(null);
  const { aktif: menarik, tarik } = useTarikSegarkan(() => tagihan.refetch());

  if (tagihan.isPending) return <Kerangka jenis="daftar" teks="Memuat foto…" />;
  if (!tagihan.data) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={tagihan.error?.message} />
      </View>
    );
  }

  return (
    <View style={g.layar}>
      <FlatList
        data={kelompok}
        keyExtractor={(k) => k.kunci}
        contentContainerStyle={[gaya.isi, { paddingBottom: bawah }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
        ListHeaderComponent={
          <View style={gaya.cari}>
            <Ikon nama="search" ukuran={17} warna={WARNA.samar} />
            <TextInput
              style={gaya.teksCari}
              value={cari}
              onChangeText={setCari}
              placeholder="Cari nama nasabah"
              placeholderTextColor={WARNA.samar}
              returnKeyType="search"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
          </View>
        }
        ListEmptyComponent={
          <KotakKosong
            ikon="image"
            judul={cari ? "Tidak ditemukan" : "Belum ada foto"}
            isi={
              cari
                ? "Tidak ada nasabah yang cocok dengan pencarian ini."
                : "Foto serah terima tampil di sini sesudah akad dicatat."
            }
          />
        }
        renderItem={({ item }) => (
          <Kelompok k={item} onBuka={(awal) => setBuka({ foto: item.foto, awal })} />
        )}
      />
      <FotoLayarPenuh
        foto={buka?.foto ?? null}
        awal={buka?.awal ?? 0}
        onTutup={() => setBuka(null)}
      />
    </View>
  );
}

function Kelompok({ k, onBuka }: { k: KelompokFoto; onBuka: (awal: number) => void }) {
  return (
    <View style={gaya.kelompok}>
      <View style={gaya.judulKelompok}>
        <Text style={gaya.kampung} numberOfLines={1}>
          {tampilKampung(k.kampung)}
        </Text>
        <Text style={gaya.jumlah}>{k.foto.length} foto</Text>
      </View>
      <FlatList
        data={k.foto}
        keyExtractor={(f) => f.nasabahId}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={LEBAR_FOTO + RUANG[2.5]}
        decelerationRate="fast"
        contentContainerStyle={gaya.karosel}
        renderItem={({ item, index }) => (
          <Tekan
            onPress={() => onBuka(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Foto ${item.nama} — ketuk untuk layar penuh`}
            style={gaya.foto}
          >
            <Image
              source={sumberFoto(item.fotoId)}
              recyclingKey={item.fotoId}
              cachePolicy="disk"
              contentFit="cover"
              transition={150}
              style={StyleSheet.absoluteFill}
            />
            <View style={gaya.pita}>
              <Text style={gaya.pitaNama} numberOfLines={1}>
                {tampilNama(item.nama)}
              </Text>
              <Text style={gaya.pitaKet} numberOfLines={1}>
                akad {tanggalBertahun(item.tanggalAkad)}
              </Text>
            </View>
          </Tekan>
        )}
      />
    </View>
  );
}

const gaya = StyleSheet.create({
  galat: { paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  isi: { gap: RUANG[5], paddingTop: RUANG[3] },
  cari: {
    height: 40,
    marginHorizontal: RUANG[4],
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
  kelompok: { gap: RUANG[2] },
  judulKelompok: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: RUANG[2],
    paddingHorizontal: RUANG[4],
  },
  kampung: {
    ...HURUF.sm,
    flex: 1,
    fontWeight: TEBAL.ekstra,
    letterSpacing: 0.5,
    color: WARNA.teksLabel,
  },
  jumlah: { ...HURUF.xs, color: WARNA.redup },
  karosel: { gap: RUANG[2.5], paddingHorizontal: RUANG[4] },
  foto: {
    width: LEBAR_FOTO,
    aspectRatio: 3 / 4,
    overflow: "hidden",
    borderRadius: SUDUT.besar,
    backgroundColor: WARNA.isiNetralTegas,
  },
  pita: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: RUANG[2],
    paddingVertical: RUANG[1.5],
    backgroundColor: WARNA.tiraiGelap,
  },
  pitaNama: { ...HURUF.xs, fontWeight: TEBAL.tebal, color: WARNA.diAtasFoto },
  pitaKet: { ...HURUF["3xs"], color: WARNA.diAtasFoto },
});
