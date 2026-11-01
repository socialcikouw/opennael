import type { KartuTagih } from "@opennael/contracts";
import { jam, rupiah } from "@opennael/format";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useHariIni, useTagihan } from "@/fitur/lapangan";
import { judulKata } from "@/fitur/tagihan";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useWarnaMode } from "@/komponen/ui/tampilan";
import { RUANG } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useZonaKantor } from "@/lib/kantor";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { type BarisDroping, barisDroping, dropingHariIni, ringkasDroping } from "./inti/droping";
import { hitungPerJenis, type SaringJenis, saringJenis } from "./inti/jenis";
import { BarisJenis } from "./komponen/baris-jenis";
import { KartuTotal } from "./komponen/kartu-total";
import { KotakKosong } from "./komponen/kosong";
import { PilJenis } from "./komponen/pil-jenis";

const jenisDari = (p: KartuTagih) => p.jenis;

/**
 * DROPING (mode Semua) — pokok pinjaman yang keluar hari ini dari ketiga jenis:
 * total droping (drop baru + drop gulung) dan tunai yang diterima nasabah
 * (pencairan), lalu satu baris per akad (terbaru dulu). Diketuk → rincian
 * pinjaman hanya-baca. Potongan admin & tabungan masuk ada di arus kas (Mutasi).
 */
export function LayarDroping() {
  const g = useG();
  const aksen = useWarnaMode("semua");
  const ruangTab = useRuangTab();
  const zona = useZonaKantor();
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const tanggal = hariIni.data?.kalender.tanggal;
  const [saring, setSaring] = useState<SaringJenis>("semua");

  const { refetch: segarHariIni } = hariIni;
  const { refetch: segarTagihan } = tagihan;
  const segarkan = useCallback(
    () => Promise.all([segarHariIni(), segarTagihan()]),
    [segarHariIni, segarTagihan],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const { jumlah, ringkas, baris } = useMemo(() => {
    const semua = tagihan.data && tanggal ? dropingHariIni(tagihan.data, tanggal) : [];
    const tersaring = saringJenis(semua, saring, jenisDari);
    return {
      jumlah: hitungPerJenis(semua, jenisDari),
      ringkas: ringkasDroping(tersaring),
      baris: tersaring.map(barisDroping),
    };
  }, [tagihan.data, tanggal, saring]);

  const renderItem = useCallback(
    ({ item: b }: { item: BarisDroping }) => (
      <BarisJenis
        jenis={b.jenis}
        nama={b.nama}
        sub={`${judulKata(b.kampung)} · ke-${b.pinjamanKe}${b.waktuAkad ? ` · ${jam(b.waktuAkad, zona)}` : ""}`}
        nilai={rupiah(b.pokok)}
        lencana={b.asal}
        catatan={`Pencairan ${rupiah(b.pencairan)}`}
        onPress={() =>
          router.push({ pathname: "/kolektor/pinjaman/[id]", params: { id: b.id, lihat: "1" } })
        }
      />
    ),
    [zona],
  );

  if (hariIni.isPending || tagihan.isPending) return <Memuat teks="Memuat droping…" />;
  const galat = !tagihan.data ? tagihan.error : !hariIni.data ? hariIni.error : null;
  if (galat) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={galat.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  }

  return (
    <FlatList
      style={g.layar}
      data={baris}
      keyExtractor={(b) => b.id}
      renderItem={renderItem}
      initialNumToRender={12}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      refreshControl={
        <RefreshControl
          refreshing={menarik}
          onRefresh={tarik}
          tintColor={aksen.teks}
          colors={[aksen.teks]}
        />
      }
      ListHeaderComponent={
        <View style={gaya.kepala}>
          {hariIni.isError || tagihan.isError ? (
            <Spanduk
              judul="Gagal menyegarkan"
              isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
            />
          ) : null}
          <KartuTotal
            label="DROPING HARI INI"
            ikon="banknote-arrow-up"
            nilai={ringkas.total}
            keterangan={`${ringkas.jumlah} akad · nasabah menerima ${rupiah(ringkas.pencairan)}`}
            rincian={[
              { label: "Drop baru", nilai: ringkas.baru },
              { label: "Drop gulung", nilai: ringkas.gulung, tanda: "+" },
            ]}
          />
          <PilJenis nilai={saring} jumlah={jumlah} onPilih={setSaring} />
        </View>
      }
      ListEmptyComponent={
        <KotakKosong
          ikon="banknote-arrow-up"
          judul="Belum ada droping"
          isi={
            saring === "semua"
              ? "Akad & gulung yang dicairkan hari ini muncul di sini."
              : "Belum ada pencairan jenis ini hari ini."
          }
        />
      }
    />
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  isi: { paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  kepala: { gap: RUANG[4], paddingBottom: RUANG[4] },
});
