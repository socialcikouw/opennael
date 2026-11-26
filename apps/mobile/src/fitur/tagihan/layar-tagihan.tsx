import { kunci } from "@opennael/api-client";
import type { JenisPinjaman } from "@opennael/domain";
import { kunciWilayah } from "@opennael/domain";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, router } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAngkaLonceng } from "@/fitur/notifikasi";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { PesanGalat } from "@/komponen/ui/isian";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG, WARNA } from "@/tema";
import { useAksiKartu } from "./aksi-kartu";
import { useDaftarTagihan, useDataTagihan } from "./data-tagihan";
import { type Baris, jumlahSegmen, type SegmenTagihan } from "./inti/daftar";
import { useKepalaMelayang } from "./kepala-melayang";
import { JudulKelompok, KerangkaKartu, Kosong } from "./komponen/daftar-bagian";
import { GagalSegar } from "./komponen/gagal-segar";
import { KartuNasabah } from "./komponen/kartu-nasabah";
import { KartuDroping, KartuSudah } from "./komponen/kartu-sudah";
import { KepalaTagihan } from "./komponen/kepala-tagihan";
import { KartuJatuhTempo } from "./komponen/ringkasan";
import { useLipatKelompok } from "./lipat-kelompok";

const JUDUL: Record<JenisPinjaman, string> = {
  harian: "Tagihan Harian",
  mingguan: "Tagihan Mingguan",
  tempoan: "Tagihan Tempoan",
};

/**
 * TAGIHAN — isi tab Harian · Mingguan · Tempoan (Mode Kerja; rute `app/kolektor/(kerja)/
 * harian.tsx` dst. memberi `jenis`): kepala melayang yang melipat (judul "Tagihan Harian",
 * cari, lonceng Notifikasi), segmen Berjalan · Macet · Droping, daftar per kampung (urut
 * rute), kartu nasabah lengkap, dan transaksi langsung dari kartu.
 *
 * Data tetap satu sumber (`fitur/lapangan`): sesudah transaksi kartu menampilkan stempel
 * sebentar, lalu data disegarkan dan kartunya turun ke "Sudah ditagih".
 */
export function LayarTagihan({
  jenis,
  segmen: segmenAwal,
}: {
  jenis: JenisPinjaman;
  segmen?: string;
}) {
  const insets = useSafeAreaInsets();
  const ruangTab = useRuangTab();
  const aksen = AKSEN;
  const lonceng = useAngkaLonceng();

  const { hariIni, tanggal, tagihan, kalender, peristiwa, riwayat } = useDataTagihan(jenis);

  // Tarik-segarkan menyegarkan semua bacaan lapangan (hari ini, kartu, kalender, peristiwa,
  // riwayat); pemutarnya hanya menyala karena ditarik, bukan karena penyegaran di latar.
  const klien = useQueryClient();
  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const [cari, setCari] = useState("");
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const kunciCari = kunciWilayah(useDeferredValue(cari));
  const [segmen, setSegmen] = useState<SegmenTagihan>(
    segmenAwal === "droping" ? "droping" : "berjalan",
  );

  // ---- data → kartu → segmen → baris -------------------------------------
  const { bahan, partisi, baris, jatuhTempo, droping } = useDaftarTagihan({
    jenis,
    segmen,
    kunciCari,
    tanggal,
    tagihan,
    kalender,
    peristiwa,
    riwayat,
  });

  // Kelompok kampung bisa dilipat; baris yang tampil (bukan `baris`) jadi data daftar.
  const { tampil, ubah: ubahLipat } = useLipatKelompok(baris, segmen, kunciCari !== "");

  // ---- transaksi ----------------------------------------------------------
  const { stempel, sibuk, aksi, gerbang } = useAksiKartu(hariIni);
  const statusKartu = useMemo(() => ({ stempel, sibuk }), [stempel, sibuk]);

  // ---- gulungan & kepala melayang ---------------------------------------
  const { lipat, terangkat, tinggiLipat, onScroll, tinggiKepala, setTinggiKepala, daftar, keAtas } =
    useKepalaMelayang(cariTerbuka);
  const gantiSegmen = useCallback(
    (s: SegmenTagihan) => {
      setSegmen(s);
      keAtas();
    },
    [keAtas],
  );

  // Parameter `segmen=droping` (dari layar Gulung) dipakai sekali lalu dibuang — kalau
  // dibiarkan, gulung berikutnya tak mengubah nilainya (efek tak jalan) dan ganti mode
  // (layar dipasang ulang) membuka Droping lagi.
  useEffect(() => {
    if (segmenAwal !== "droping") return;
    setSegmen("droping");
    keAtas();
    router.setParams({ segmen: undefined });
  }, [segmenAwal, keAtas]);

  // ---- tampilan -----------------------------------------------------------
  const renderItem = useCallback(
    ({ item }: { item: Baris }) => {
      if (item.jenis === "judul") {
        return <JudulKelompok baris={item} onLipat={ubahLipat} />;
      }
      if (item.jenis === "sudah") return <KartuSudah vm={item.vm} aksen={aksen} aksi={aksi} />;
      return (
        <KartuNasabah
          vm={item.vm}
          aksi={aksi}
          aksen={aksen}
          kolomHariIni={bahan?.kerangka.kolomHariIni ?? -1}
          stempel={stempel.get(item.vm.id) ?? null}
          sibuk={sibuk.has(item.vm.id)}
          terakhir={item.terakhir}
        />
      );
    },
    [aksi, bahan, stempel, sibuk, ubahLipat],
  );

  // Layar galat penuh hanya bila belum ada data; gagal menyegarkan data yang sudah ada
  // (sinyal hilang, tarik-segarkan) cukup spanduk di atas daftar.
  const galatMuat =
    hariIni.isError && !hariIni.data
      ? hariIni.error
      : tagihan.isError && !tagihan.data
        ? tagihan.error
        : null;
  const gagalSegar = galatMuat === null && (hariIni.isError || tagihan.isError);

  if (galatMuat) {
    return (
      <View style={[gaya.layar, gaya.galat, { paddingTop: insets.top + RUANG[6] }]}>
        <PesanGalat pesan={galatMuat.message} />
        <Tombol
          judul="Coba lagi"
          ikon="refresh-cw"
          onPress={() => {
            void hariIni.refetch();
            void tagihan.refetch();
          }}
        />
      </View>
    );
  }

  const memuat = hariIni.isPending || tagihan.isPending;
  const tampilDroping = !memuat && segmen === "droping" && droping.baru + droping.gulung > 0;
  const tutup =
    gerbang && !gerbang.buka
      ? gerbang.perluAbsen
        ? {
            judul: "Absen pagi dulu",
            isi: "Kas lapangan & uang jalan. Transaksi terbuka sesudah absen.",
            tombol: {
              judul: "Absen Sekarang",
              // Formulir absen ada di layar Notifikasi (paling atas selama belum absen).
              onPress: () => router.push("/kolektor/notifikasi" as Href),
            },
          }
        : { judul: gerbang.judul ?? "Lapangan tutup", isi: gerbang.isi }
      : null;

  return (
    <View style={gaya.layar}>
      <Animated.FlatList
        ref={daftar}
        data={memuat ? [] : tampil}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        extraData={statusKartu}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        windowSize={7}
        contentContainerStyle={{ paddingTop: tinggiKepala + RUANG[2], paddingBottom: ruangTab }}
        refreshControl={
          <RefreshControl
            refreshing={menarik}
            onRefresh={tarik}
            progressViewOffset={tinggiKepala}
            tintColor={aksen.teks}
            colors={[aksen.teks]}
          />
        }
        ListHeaderComponent={
          gagalSegar || tampilDroping ? (
            <>
              {gagalSegar ? <GagalSegar /> : null}
              {tampilDroping ? <KartuDroping baru={droping.baru} gulung={droping.gulung} /> : null}
            </>
          ) : undefined
        }
        ListEmptyComponent={
          memuat ? (
            <>
              <KerangkaKartu />
              <KerangkaKartu />
            </>
          ) : (
            <Kosong segmen={segmen} mencari={kunciCari !== ""} aksen={aksen} />
          )
        }
      />

      <KepalaTagihan
        lipat={lipat}
        terangkat={terangkat}
        onUkurLipat={(t) => tinggiLipat.set(t)}
        onUkur={setTinggiKepala}
        judul={JUDUL[jenis]}
        aksen={aksen}
        lonceng={{
          jumlah: lonceng,
          onPress: () => router.push("/kolektor/notifikasi" as Href),
        }}
        kartuAtas={jatuhTempo ? <KartuJatuhTempo r={jatuhTempo} aksen={aksen} /> : null}
        segmen={segmen}
        jumlah={jumlahSegmen(partisi)}
        onGantiSegmen={gantiSegmen}
        cari={cari}
        onCari={setCari}
        cariTerbuka={cariTerbuka}
        onCariTerbuka={setCariTerbuka}
        tutup={tutup}
      />
    </View>
  );
}

const gaya = StyleSheet.create({
  layar: { flex: 1, backgroundColor: WARNA.latar },
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
});
