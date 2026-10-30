import { hitungLunas, kunciWilayah } from "@opennael/domain";
import { rupiah } from "@opennael/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  type FlatList,
  LayoutAnimation,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { jenisDariMode, MODE, useMode } from "@/fitur/mode/mode";
import { LayarSemua } from "@/fitur/semua/layar-semua";
import {
  type Baris,
  daftarLompat,
  jumlahSegmen,
  kemajuan,
  type LompatRute,
  pilah,
  ringkasDroping,
  susunBaris,
  type TabKerja,
} from "@/fitur/tagihan/inti/daftar";
import { susunBahanGrid } from "@/fitur/tagihan/inti/grid";
import { kabarTercatat } from "@/fitur/tagihan/inti/kabar-tercatat";
import { kartuVM } from "@/fitur/tagihan/inti/kartu";
import { ringkasJatuhTempo } from "@/fitur/tagihan/inti/khusus";
import { JudulKelompok, KerangkaKartu, Kosong } from "@/fitur/tagihan/ui/daftar-bagian";
import { type AksiKartu, KartuNasabah, type Stempel } from "@/fitur/tagihan/ui/kartu-nasabah";
import { KartuDroping, KartuSudah } from "@/fitur/tagihan/ui/kartu-sudah";
import { buatSimpananRute, KepalaTagihan } from "@/fitur/tagihan/ui/kepala-tagihan";
import { KartuJatuhTempo, KartuRasio, LembarRute } from "@/fitur/tagihan/ui/ringkasan";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useGaya, useWarnaMode } from "@/komponen/tampilan";
import { RUANG, type Warna } from "@/komponen/tema";
import { PesanGalat, Tombol } from "@/komponen/ui";
import {
  bacaGerbang,
  tulis,
  useHariIni,
  useKalenderBulan,
  usePeristiwaBulan,
  useRiwayatPinjaman,
  useTagihan,
} from "@/lib/lapangan";

const gagal = (judul: string) => (e: Error) => Alert.alert(judul, e.message);

/** Lama stempel tampil di kartu sebelum kartu turun ke "Sudah ditagih". */
const LAMA_STEMPEL_MS = 900;
/** Gulir searah (pt) sebelum bagian lipat kepala disembunyikan / dimunculkan lagi. */
const AMBANG_ARAH = 24;

/**
 * TAGIHAN — klon layar Kerja aplikasi lama (naelcapital): kepala melayang
 * yang melipat, segmen Aktif · Macet · Droping, daftar per rute, kartu
 * nasabah lengkap, dan transaksi langsung dari kartu. Isinya mengikuti mode
 * aplikasi (Harian · Mingguan · Tempoan); mode Semua = direktori hanya-baca
 * (`fitur/semua`).
 *
 * Data tetap satu sumber (`lib/lapangan`): sesudah transaksi kartu
 * menampilkan stempel sebentar, lalu data disegarkan dan kartunya turun ke
 * "Sudah ditagih".
 */
export default function Tagihan() {
  const mode = useMode();
  // Ganti mode = seluruh wajah berganti: dipasang ulang dengan pudar singkat.
  return (
    <Animated.View key={mode} entering={FadeIn.duration(200)} style={{ flex: 1 }}>
      {mode === "semua" ? <LayarSemua /> : <LayarTagihan />}
    </Animated.View>
  );
}

function LayarTagihan() {
  const gaya = useGaya(buatGaya);
  const insets = useSafeAreaInsets();
  const ruangTab = useRuangTab();
  const mode = useMode();
  const jenis = jenisDariMode(mode);
  const aksen = useWarnaMode(mode);
  const klien = useQueryClient();

  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const tagihan = useTagihan();
  const kalender = useKalenderBulan(tanggal?.slice(0, 7));
  const peristiwa = usePeristiwaBulan(tanggal);
  const idMingguan = useMemo(
    () =>
      jenis === null || jenis === "mingguan"
        ? (tagihan.data ?? []).filter((p) => p.jenis === "mingguan").map((p) => p.id)
        : [],
    [tagihan.data, jenis],
  );
  const riwayat = useRiwayatPinjaman(idMingguan);

  const [cari, setCari] = useState("");
  const [cariTerbuka, setCariTerbuka] = useState(false);
  const kunci = kunciWilayah(useDeferredValue(cari));
  const segmenAwal = useLocalSearchParams<{ segmen?: string }>().segmen;
  const [tab, setTab] = useState<TabKerja>(segmenAwal === "droping" ? "droping" : "aktif");
  useEffect(() => {
    if (segmenAwal === "droping") setTab("droping");
  }, [segmenAwal]);

  // ---- data → kartu → segmen → baris -------------------------------------
  const bahan = useMemo(
    () => (tanggal ? susunBahanGrid(tanggal, peristiwa.data, kalender.data, riwayat) : null),
    [tanggal, peristiwa.data, kalender.data, riwayat],
  );
  const semua = useMemo(() => {
    if (!tagihan.data || !tanggal || !bahan) return [];
    return tagihan.data
      .filter((p) => jenis === null || p.jenis === jenis)
      .map((p) => kartuVM(p, tanggal, bahan));
  }, [tagihan.data, tanggal, bahan, jenis]);
  const partisi = useMemo(() => pilah(semua, kunci), [semua, kunci]);
  const baris = useMemo(
    () => susunBaris(partisi[tab], tab === "droping" ? [] : partisi.sudah[tab]),
    [partisi, tab],
  );
  const maju = useMemo(() => kemajuan(semua), [semua]);
  const jatuhTempo = useMemo(
    () =>
      mode === "tempoan"
        ? ringkasJatuhTempo(semua.flatMap((vm) => (vm.tempo ? [vm.tempo] : [])))
        : null,
    [mode, semua],
  );
  const droping = useMemo(
    () => ringkasDroping(semua.filter((vm) => vm.ember === "droping")),
    [semua],
  );

  // ---- transaksi ----------------------------------------------------------
  const [stempel, setStempel] = useState<ReadonlyMap<string, Stempel>>(new Map());
  const { mutate: catatLibur } = useMutation({ mutationFn: tulis.libur });
  const { mutate: catatLunas } = useMutation({ mutationFn: tulis.lunas });

  /** Stempel di kartu sebentar, lalu data disegarkan & kartunya turun ke "Sudah ditagih". */
  const tercatat = useCallback(
    (id: string, jenisStempel: Stempel) => {
      setStempel((m) => new Map(m).set(id, jenisStempel));
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        void klien.invalidateQueries({ queryKey: ["lapangan"] }).finally(() =>
          setStempel((m) => {
            const baru = new Map(m);
            baru.delete(id);
            return baru;
          }),
        );
      }, LAMA_STEMPEL_MS);
    },
    [klien],
  );

  // Bayar dicatat di layarnya sendiri: stempel dipasang di sini sesudah kembali.
  useEffect(() => kabarTercatat.dengar(tercatat), [tercatat]);

  const gerbang = useMemo(() => (hariIni.data ? bacaGerbang(hariIni.data) : null), [hariIni.data]);
  /** Gerbang lapangan (C4) dijelaskan di tempat — server tetap memutuskan. */
  const gerbangTutup = useCallback((): boolean => {
    if (!gerbang || gerbang.buka) return false;
    Alert.alert(
      gerbang.perluAbsen ? "Absen dulu" : (gerbang.judul ?? "Lapangan tutup"),
      gerbang.perluAbsen ? "Transaksi bisa dicatat sesudah absen pagi di Beranda." : gerbang.isi,
    );
    return true;
  }, [gerbang]);

  const aksi: AksiKartu = useMemo(
    () => ({
      bayar: (vm) => {
        if (gerbangTutup()) return;
        router.push({ pathname: "/kolektor/bayar/[id]", params: { id: vm.id } });
      },
      gulung: (vm) => {
        const status = vm.progres?.status ?? "boleh";
        if (status !== "boleh") {
          Alert.alert("Belum bisa digulung", vm.progres?.petunjuk);
          return;
        }
        if (gerbangTutup()) return;
        router.push({ pathname: "/kolektor/gulung/[id]", params: { id: vm.id } });
      },
      libur: (vm) => {
        if (vm.alasanLibur) {
          Alert.alert("Belum bisa libur", vm.alasanLibur);
          return;
        }
        if (gerbangTutup()) return;
        Alert.alert("Tandai libur", `Yakin ${vm.nama} libur hari ini?`, [
          { text: "Batal", style: "cancel" },
          {
            text: "Yakin",
            style: "destructive",
            onPress: () =>
              catatLibur(
                { pinjamanId: vm.id },
                {
                  onSuccess: () => tercatat(vm.id, "libur"),
                  onError: gagal("Gagal mencatat libur"),
                },
              ),
          },
        ]);
      },
      lunas: (vm) => {
        if (gerbangTutup()) return;
        const r = hitungLunas(vm.p.saldo, vm.p.tabungan);
        const kembali = -r.storting;
        Alert.alert(
          "Pelunasan",
          `Yakin melunasi ${vm.nama}?\n\nSaldo: ${rupiah(vm.p.saldo)}\nTabungan: ${rupiah(vm.p.tabungan)}\n\n${
            kembali > 0
              ? `Tabungan keluar ke ${vm.nama}: ${rupiah(kembali)}`
              : `Sisa yang harus disetor ${vm.nama}: ${rupiah(r.setoranMurni)}`
          }`,
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Yakin",
              style: "destructive",
              onPress: () =>
                catatLunas(vm.id, {
                  onSuccess: () => tercatat(vm.id, "lunas"),
                  onError: gagal("Gagal melunasi"),
                }),
            },
          ],
        );
      },
    }),
    [gerbangTutup, catatLibur, catatLunas, tercatat],
  );

  // ---- gulungan & kepala melayang ---------------------------------------
  const lipat = useSharedValue(0);
  const terangkat = useSharedValue(0);
  const tinggiLipat = useSharedValue(0);
  const terakhir = useSharedValue(0);
  const arah = useSharedValue(0);
  const cariSV = useSharedValue(0);
  useEffect(() => {
    cariSV.set(cariTerbuka ? 1 : 0);
    if (cariTerbuka) lipat.set(withTiming(0, { duration: 180 }));
  }, [cariTerbuka, cariSV, lipat]);

  const onScroll = useAnimatedScrollHandler((e) => {
    const y = Math.max(e.contentOffset.y, 0);
    const dy = y - terakhir.get();
    terakhir.set(y);
    terangkat.set(withTiming(y > 4 ? 1 : 0, { duration: 150 }));
    if (cariSV.get()) return;
    const L = tinggiLipat.get();
    if (y <= L) {
      lipat.set(y);
      arah.set(0);
      return;
    }
    const kumpul = Math.sign(dy) === Math.sign(arah.get()) ? arah.get() + dy : dy;
    arah.set(kumpul);
    if (kumpul > AMBANG_ARAH && lipat.get() < L) lipat.set(withTiming(L, { duration: 180 }));
    else if (kumpul < -AMBANG_ARAH && lipat.get() > 0) lipat.set(withTiming(0, { duration: 180 }));
  });

  const [tinggiKepala, setTinggiKepala] = useState(insets.top + 220);
  const [lipatPt, setLipatPt] = useState(0);
  const daftar = useRef<FlatList<Baris>>(null);
  const keAtas = useCallback(() => {
    lipat.set(0);
    daftar.current?.scrollToOffset({ offset: 0, animated: false });
  }, [lipat]);
  const gantiTab = useCallback(
    (t: TabKerja) => {
      setTab(t);
      keAtas();
    },
    [keAtas],
  );

  // ---- chip & lompat rute -------------------------------------------------
  const [simpananRute] = useState(buatSimpananRute);
  useEffect(() => {
    simpananRute.tulis(baris[0]?.rute ?? null);
  }, [baris, simpananRute]);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: Baris }[] }) => {
      const pertama = viewableItems[0]?.item;
      if (pertama) simpananRute.tulis(pertama.rute);
    },
  ).current;
  const [lembarRute, setLembarRute] = useState(false);
  const sasaranRute = useRef<number | null>(null);
  const lompat = useMemo(() => (lembarRute ? daftarLompat(baris) : []), [lembarRute, baris]);
  const offsetRute = tinggiKepala - lipatPt;
  const gulirKeRute = () => {
    const indeks = sasaranRute.current;
    sasaranRute.current = null;
    if (indeks !== null)
      daftar.current?.scrollToIndex({ index: indeks, animated: true, viewOffset: offsetRute });
  };

  // ---- tampilan -----------------------------------------------------------
  const renderItem = useCallback(
    ({ item }: { item: Baris }) => {
      if (item.jenis === "judul") return <JudulKelompok baris={item} aksen={aksen} />;
      if (item.jenis === "sudah") return <KartuSudah vm={item.vm} aksen={aksen} />;
      return (
        <KartuNasabah
          vm={item.vm}
          aksi={aksi}
          aksen={aksen}
          kolomHariIni={bahan?.kerangka.kolomHariIni ?? -1}
          stempel={stempel.get(item.vm.id) ?? null}
        />
      );
    },
    [aksi, aksen, bahan, stempel],
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
        data={memuat ? [] : baris}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        extraData={stempel}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={6}
        windowSize={7}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        onScrollToIndexFailed={(info) => {
          daftar.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(
            () =>
              daftar.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewOffset: offsetRute,
              }),
            120,
          );
        }}
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
            <Kosong tab={tab} mencari={kunci !== ""} aksen={aksen} />
          )
        }
      />

      <KepalaTagihan
        lipat={lipat}
        terangkat={terangkat}
        onUkurLipat={(t) => {
          tinggiLipat.set(t);
          setLipatPt(t);
        }}
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
        simpananRute={simpananRute}
        onBukaRute={() => setLembarRute(true)}
      />

      <LembarRute
        terbuka={lembarRute}
        rute={lompat}
        ruteKini={simpananRute.ambil()}
        aksen={aksen}
        onPilih={(r: LompatRute) => {
          sasaranRute.current = r.indeks;
          setLembarRute(false);
        }}
        onTutup={() => setLembarRute(false)}
        onSelesaiTutup={gulirKeRute}
      />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
  });
