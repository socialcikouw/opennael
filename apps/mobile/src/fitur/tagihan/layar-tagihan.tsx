import { kunciWilayah } from "@opennael/domain";
import { router } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { PesanGalat } from "@/komponen/ui/isian";
import { useGaya, useWarnaMode } from "@/komponen/ui/tampilan";
import { RUANG, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useAksiKartu } from "./aksi-kartu";
import { useDaftarTagihan, useDataTagihan } from "./data-tagihan";
import { type Baris, jumlahSegmen, type TabKerja } from "./inti/daftar";
import { useKepalaMelayang } from "./kepala-melayang";
import { JudulKelompok, KerangkaKartu, Kosong } from "./komponen/daftar-bagian";
import { KartuNasabah } from "./komponen/kartu-nasabah";
import { KartuDroping, KartuSudah } from "./komponen/kartu-sudah";
import { KepalaTagihan } from "./komponen/kepala-tagihan";
import { KartuJatuhTempo, KartuRasio } from "./komponen/ringkasan";
import { LayarSemua } from "./layar-semua";
import { useLipatKelompok } from "./lipat-kelompok";
import { jenisDariMode, MODE, useMode } from "./mode";

/**
 * TAGIHAN — klon layar Kerja aplikasi lama (naelcapital): kepala melayang
 * yang melipat, segmen Aktif · Macet · Droping, daftar per kampung (urut rute), kartu
 * nasabah lengkap, dan transaksi langsung dari kartu. Isinya mengikuti mode
 * aplikasi (Harian · Mingguan · Tempoan); mode Semua = direktori hanya-baca
 * (`fitur/semua`).
 *
 * Data tetap satu sumber (`lib/lapangan`): sesudah transaksi kartu
 * menampilkan stempel sebentar, lalu data disegarkan dan kartunya turun ke
 * "Sudah ditagih".
 */
export function LayarTagihan({ segmen }: { segmen?: string }) {
  const mode = useMode();
  // Ganti mode = seluruh wajah berganti: dipasang ulang dengan pudar singkat.
  return (
    <Animated.View key={mode} entering={FadeIn.duration(200)} style={{ flex: 1 }}>
      {mode === "semua" ? <LayarSemua /> : <LayarTagihanKerja segmenAwal={segmen} />}
    </Animated.View>
  );
}

function LayarTagihanKerja({ segmenAwal }: { segmenAwal?: string }) {
  const gaya = useGaya(buatGaya);
  const insets = useSafeAreaInsets();
  const ruangTab = useRuangTab();
  const mode = useMode();
  const jenis = jenisDariMode(mode);
  const aksen = useWarnaMode(mode);

  const { hariIni, tanggal, tagihan, kalender, peristiwa, riwayat } = useDataTagihan(jenis);

  const [cari, setCari] = useState("");
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const kunciCari = kunciWilayah(useDeferredValue(cari));
  const [tab, setTab] = useState<TabKerja>(segmenAwal === "droping" ? "droping" : "aktif");
  useEffect(() => {
    if (segmenAwal === "droping") setTab("droping");
  }, [segmenAwal]);

  // ---- data → kartu → segmen → baris -------------------------------------
  const { bahan, partisi, baris, maju, jatuhTempo, droping } = useDaftarTagihan({
    mode,
    jenis,
    tab,
    kunciCari,
    tanggal,
    tagihan,
    kalender,
    peristiwa,
    riwayat,
  });

  // Kelompok kampung bisa dilipat; baris yang tampil (bukan `baris`) jadi data daftar.
  const { tampil, ubah: ubahLipat } = useLipatKelompok(baris, tab, kunciCari !== "");

  // ---- transaksi ----------------------------------------------------------
  const { stempel, sibuk, aksi, gerbang } = useAksiKartu(hariIni);
  const statusKartu = useMemo(() => ({ stempel, sibuk }), [stempel, sibuk]);

  // ---- gulungan & kepala melayang ---------------------------------------
  const { lipat, terangkat, tinggiLipat, onScroll, tinggiKepala, setTinggiKepala, daftar, keAtas } =
    useKepalaMelayang(cariTerbuka);
  const gantiTab = useCallback(
    (t: TabKerja) => {
      setTab(t);
      keAtas();
    },
    [keAtas],
  );

  // ---- tampilan -----------------------------------------------------------
  const renderItem = useCallback(
    ({ item }: { item: Baris }) => {
      if (item.jenis === "judul") {
        return <JudulKelompok baris={item} onLipat={ubahLipat} />;
      }
      if (item.jenis === "sudah") return <KartuSudah vm={item.vm} aksen={aksen} />;
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
    [aksi, aksen, bahan, stempel, sibuk, ubahLipat],
  );

  if (hariIni.isError || tagihan.isError) {
    return (
      <View style={[gaya.layar, gaya.galat, { paddingTop: insets.top + RUANG[6] }]}>
        <PesanGalat pesan={(hariIni.error ?? tagihan.error)?.message} />
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
  const tutup =
    gerbang && !gerbang.buka
      ? gerbang.perluAbsen
        ? { judul: "Belum absen", isi: "Absen pagi di Beranda dulu supaya transaksi bisa dicatat." }
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
            refreshing={tagihan.isRefetching}
            onRefresh={() => {
              void hariIni.refetch();
              void tagihan.refetch();
              void peristiwa.refetch();
            }}
            progressViewOffset={tinggiKepala}
            tintColor={aksen.teks}
            colors={[aksen.teks]}
          />
        }
        ListHeaderComponent={
          !memuat && tab === "droping" && droping.baru + droping.gulung > 0 ? (
            <KartuDroping baru={droping.baru} gulung={droping.gulung} />
          ) : undefined
        }
        ListEmptyComponent={
          memuat ? (
            <>
              <KerangkaKartu />
              <KerangkaKartu />
            </>
          ) : (
            <Kosong tab={tab} mencari={kunciCari !== ""} aksen={aksen} />
          )
        }
      />

      <KepalaTagihan
        lipat={lipat}
        terangkat={terangkat}
        onUkurLipat={(t) => tinggiLipat.set(t)}
        onUkur={setTinggiKepala}
        mode={{ label: MODE[mode].label, warna: aksen }}
        kartuAtas={
          jatuhTempo ? (
            <KartuJatuhTempo r={jatuhTempo} aksen={aksen} />
          ) : (
            <KartuRasio
              bayar={maju.bayar}
              libur={maju.libur}
              sisa={maju.sisa}
              aksen={aksen}
              onLaporan={() => router.navigate("/kolektor")}
            />
          )
        }
        tab={tab}
        jumlah={jumlahSegmen(partisi)}
        onGantiTab={gantiTab}
        cari={cari}
        onCari={setCari}
        cariTerbuka={cariTerbuka}
        onCariTerbuka={setCariTerbuka}
        tutup={tutup}
      />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
  });
