import type { KartuTagih } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AvatarNasabah } from "../../../komponen/foto-nasabah";
import { useRuangTab } from "../../../komponen/tab-mengambang";
import { HURUF, RUANG, SUDUT, TEBAL } from "../../../komponen/tema";
import {
  g,
  Ikon,
  Isian,
  Keterangan,
  Lencana,
  Memuat,
  PesanGalat,
  Tombol,
  WARNA,
} from "../../../komponen/ui";
import { NAMA_JENIS, rupiah } from "../../../lib/format";
import { useHariIni, useTagihan } from "../../../lib/lapangan";

/**
 * TAGIHAN — daftar tagih pegangan kolektor per kampung. Kartu yang sudah
 * dicatat hari ini (setoran / libur) ditandai (C3).
 */
export default function Tagihan() {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const ruangTab = useRuangTab();
  const [cari, setCari] = useState("");

  const bagian = useMemo(() => {
    const kunci = kunciWilayah(cari);
    const cocok = (tagihan.data ?? []).filter(
      (p) =>
        !kunci ||
        kunciWilayah(p.nasabah.nama).includes(kunci) ||
        kunciWilayah(p.nasabah.kampung).includes(kunci),
    );
    const perKampung = new Map<string, KartuTagih[]>();
    for (const p of cocok)
      perKampung.set(p.nasabah.kampung, [...(perKampung.get(p.nasabah.kampung) ?? []), p]);
    return [...perKampung].map(([title, data]) => ({ title, data }));
  }, [tagihan.data, cari]);

  const segarkan = () => {
    void hariIni.refetch();
    void tagihan.refetch();
  };

  if (hariIni.isPending) return <Memuat teks="Memuat tagihan…" />;
  if (hariIni.isError) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={segarkan} />
      </View>
    );
  }

  const tanggal = hariIni.data.kalender.tanggal;
  const semua = tagihan.data ?? [];

  return (
    <SectionList
      style={g.layar}
      contentContainerStyle={{ paddingBottom: ruangTab }}
      sections={bagian}
      keyExtractor={(p) => p.id}
      keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={hariIni.isRefetching || tagihan.isRefetching}
          onRefresh={segarkan}
        />
      }
      ListHeaderComponent={
        <View style={gaya.kepala}>
          <Isian
            ikon="search"
            value={cari}
            onChangeText={setCari}
            placeholder="Cari nama atau kampung"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {tagihan.isError ? <PesanGalat pesan={tagihan.error.message} /> : null}
          {tagihan.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
          {tagihan.data && semua.length === 0 ? (
            <View style={gaya.kosong}>
              <Ikon nama="users" ukuran={28} warna={WARNA.redup} />
              <Keterangan>Belum ada pinjaman aktif di pegangan Anda.</Keterangan>
            </View>
          ) : null}
          {tagihan.data && semua.length > 0 && bagian.length === 0 ? (
            <Keterangan>Tidak ada yang cocok dengan pencarian ini.</Keterangan>
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={[g.baris2, gaya.kampung]}>
          <Ikon nama="map-pin" ukuran={14} warna={WARNA.redup} />
          <Text style={gaya.kampungTeks}>
            {section.title} · {section.data.length}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <BarisTagih p={item} tanggal={tanggal} />}
    />
  );
}

function BarisTagih({ p, tanggal }: { p: KartuTagih; tanggal: string }) {
  const lencana =
    p.hariIni?.jenis === "angsuran" ? (
      <Lencana teks={`Setor ${rupiah(p.hariIni.storting)}`} warna="hijau" />
    ) : p.hariIni?.jenis === "libur" ? (
      <Lencana teks="Libur" warna="kuning" />
    ) : p.tanggalAkad === tanggal ? (
      <Lencana teks="Akad hari ini" />
    ) : null;
  const kemajuan =
    p.jenis === "tempoan"
      ? `jatuh tempo ${p.jatuhTempo ?? "-"}`
      : `angsuran ${p.angsuranKe}/${p.tenor}`;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/kolektor/pinjaman/[id]", params: { id: p.id } })}
      style={({ pressed }) => [
        g.butirDaftar,
        g.baris3,
        gaya.butir,
        pressed ? g.butirDitekan : null,
        p.hariIni ? gaya.sudahDicatat : null,
      ]}
    >
      <AvatarNasabah
        fotoId={p.fotoSerahTerimaId}
        nama={p.nasabah.nama}
        ukuran={48}
        tanda={p.hariIni !== null}
      />
      <View style={[g.isi, gaya.rincian]}>
        <View style={g.bungkus}>
          <Text style={g.teksTebal}>{p.nasabah.nama}</Text>
          {p.status === "macet" ? <Lencana teks="Macet" warna="merah" /> : null}
        </View>
        <Text style={g.teksKecil}>
          {NAMA_JENIS[p.jenis]} ke-{p.pinjamanKe} · {kemajuan}
        </Text>
        {lencana}
      </View>
      <View style={gaya.angka}>
        <Text style={gaya.angsuran}>{rupiah(p.angsuran)}</Text>
        <Text style={g.teksMini}>saldo {rupiah(p.saldo)}</Text>
      </View>
      <Ikon nama="chevron-right" ukuran={18} warna={WARNA.samar} />
    </Pressable>
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  kepala: {
    gap: RUANG[4],
    paddingHorizontal: RUANG[5],
    paddingTop: RUANG[2],
    paddingBottom: RUANG[3],
  },
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
  kampung: { paddingHorizontal: RUANG[5], paddingTop: RUANG[4], paddingBottom: RUANG[2] },
  kampungTeks: {
    ...HURUF.xs,
    fontWeight: TEBAL.tebal,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: WARNA.redup,
  },
  butir: { marginHorizontal: RUANG[5], marginBottom: RUANG[2] },
  sudahDicatat: { opacity: 0.7 },
  rincian: { gap: RUANG[1] },
  angka: { alignItems: "flex-end" },
  angsuran: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
});
