import type { TransaksiHari } from "@opennael/contracts";
import { rupiah, tampilKampung } from "@opennael/format";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useTagihan } from "@/fitur/lapangan";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useWarnaMode } from "@/komponen/ui/tampilan";
import { RUANG } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useSetoranHariIni } from "./data";
import { hitungPerJenis, type SaringJenis, saringJenis } from "./inti/jenis";
import { type BarisStorting, barisStorting, ringkasStorting } from "./inti/storting";
import { BarisJenis } from "./komponen/baris-jenis";
import { KartuTotal } from "./komponen/kartu-total";
import { KotakKosong } from "./komponen/kosong";
import { PilJenis } from "./komponen/pil-jenis";

const jenisDari = (t: TransaksiHari) => t.jenisPinjaman;

/**
 * STORTING (mode Semua) — uang setoran yang masuk hari ini dari ketiga jenis
 * pinjaman: total & penyusunnya (murni + pelunasan − tabungan keluar), bagian
 * yang ditransfer, lalu satu baris per setoran. Saringan jenis mengubah total
 * dan daftar. Hanya-baca; menagih dari mode jenisnya.
 */
export function LayarStorting() {
  const g = useG();
  const aksen = useWarnaMode("semua");
  const ruangTab = useRuangTab();
  const setoran = useSetoranHariIni();
  const tagihan = useTagihan();
  const [saring, setSaring] = useState<SaringJenis>("semua");

  const { refetch: segarSetoran } = setoran;
  const { refetch: segarTagihan } = tagihan;
  const segarkan = useCallback(
    () => Promise.all([segarSetoran(), segarTagihan()]),
    [segarSetoran, segarTagihan],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const { jumlah, ringkas, baris } = useMemo(() => {
    const semua = setoran.data ?? [];
    const tersaring = saringJenis(semua, saring, jenisDari);
    return {
      jumlah: hitungPerJenis(semua, jenisDari),
      ringkas: ringkasStorting(tersaring),
      baris: tersaring.map(barisStorting),
    };
  }, [setoran.data, saring]);
  // Pinjaman yang lunas/digulung hari ini sudah keluar daftar tagih: barisnya tak bisa dibuka.
  const aktif = useMemo(() => new Set(tagihan.data?.map((p) => p.id)), [tagihan.data]);

  const renderItem = useCallback(
    ({ item: b }: { item: BarisStorting }) => (
      <BarisJenis
        jenis={b.jenis}
        nama={b.nama}
        sub={`${tampilKampung(b.kampung)} · ${b.jenisTransaksi}`}
        nilai={rupiah(b.storting)}
        nilaiBahaya={b.storting < 0}
        lencana={b.transfer !== null ? `Transfer ${rupiah(b.transfer)}` : undefined}
        catatan={b.rincian}
        onPress={
          aktif.has(b.pinjamanId)
            ? () =>
                router.push({
                  pathname: "/kolektor/pinjaman/[id]",
                  params: { id: b.pinjamanId, lihat: "1" },
                })
            : undefined
        }
      />
    ),
    [aktif],
  );

  if (setoran.isPending) return <Memuat teks="Memuat storting…" />;
  if (!setoran.data) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={setoran.error?.message} />
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
          {setoran.isError ? (
            <Spanduk
              judul="Gagal menyegarkan"
              isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
            />
          ) : null}
          <KartuTotal
            label="STORTING HARI INI"
            ikon="banknote-arrow-down"
            nilai={ringkas.total}
            keterangan={`${ringkas.jumlah} setoran${ringkas.transfer > 0 ? ` · ${rupiah(ringkas.transfer)} lewat transfer` : ""}`}
            rincian={[
              { label: "Setoran murni", nilai: ringkas.murni },
              { label: "Setoran pelunasan", nilai: ringkas.pelunasan, tanda: "+" },
              { label: "Tabungan keluar", nilai: ringkas.tabunganKeluar, tanda: "−" },
            ]}
          />
          <PilJenis nilai={saring} jumlah={jumlah} onPilih={setSaring} />
        </View>
      }
      ListEmptyComponent={
        <KotakKosong
          ikon="banknote-arrow-down"
          judul="Belum ada setoran"
          isi={
            saring === "semua"
              ? "Setoran yang dicatat hari ini muncul di sini."
              : "Belum ada setoran jenis ini hari ini."
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
