import { kunci } from "@opennael/api-client";
import { kunciWilayah } from "@opennael/domain";
import { useQueryClient } from "@tanstack/react-query";
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
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useAksiKartu } from "./aksi-kartu";
import { useDaftarTagihan, useDataTagihan } from "./data-tagihan";
import { type Baris, jumlahSegmen, type TabKerja } from "./inti/daftar";
import { useKepalaMelayang } from "./kepala-melayang";
import { JudulKelompok, KerangkaKartu, Kosong } from "./komponen/daftar-bagian";
import { GagalSegar } from "./komponen/gagal-segar";
import { KartuNasabah } from "./komponen/kartu-nasabah";
import { KartuDroping, KartuSudah } from "./komponen/kartu-sudah";
import { KepalaTagihan } from "./komponen/kepala-tagihan";
import { LembarAlasanLibur } from "./komponen/lembar-alasan-libur";
import { KartuJatuhTempo } from "./komponen/ringkasan";
import { useLipatKelompok } from "./lipat-kelompok";
import { jenisDariMode, MODE, useMode } from "./mode";

/**
 * TAGIHAN — klon layar Kerja aplikasi lama (naelcapital): kepala melayang
 * yang melipat, segmen Aktif · Macet · Droping, daftar per kampung (urut rute), kartu
 * nasabah lengkap, dan transaksi langsung dari kartu. Isinya mengikuti mode
 * aplikasi (Harian · Mingguan · Tempoan). Mode Semua tak punya tab Tagihan
 * (tab pantau di `fitur/pantau`); tab bar memindahkan kolektor ke Dasbor.
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
      {mode === "semua" ? null : <LayarTagihanKerja segmenAwal={segmen} />}
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
  const [tab, setTab] = useState<TabKerja>(segmenAwal === "droping" ? "droping" : "aktif");

  // ---- data → kartu → segmen → baris -------------------------------------
  const { bahan, partisi, baris, jatuhTempo, droping } = useDaftarTagihan({
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
  const { stempel, sibuk, aksi, gerbang, lembarLibur } = useAksiKartu(hariIni);
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

  // Parameter `segmen=droping` (dari layar Gulung) dipakai sekali lalu dibuang — kalau
  // dibiarkan, gulung berikutnya tak mengubah nilainya (efek tak jalan) dan ganti mode
  // (layar dipasang ulang) membuka Droping lagi.
  useEffect(() => {
    if (segmenAwal !== "droping") return;
    setTab("droping");
    keAtas();
    router.setParams({ segmen: undefined });
  }, [segmenAwal, keAtas]);

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
  const tampilDroping = !memuat && tab === "droping" && droping.baru + droping.gulung > 0;
  const tutup =
    gerbang && !gerbang.buka
      ? gerbang.perluAbsen
        ? {
            judul: "Belum absen",
            isi: "Absen pagi di tab Notifikasi dulu supaya transaksi bisa dicatat.",
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
        kartuAtas={jatuhTempo ? <KartuJatuhTempo r={jatuhTempo} aksen={aksen} /> : null}
        tab={tab}
        jumlah={jumlahSegmen(partisi)}
        onGantiTab={gantiTab}
        cari={cari}
        onCari={setCari}
        cariTerbuka={cariTerbuka}
        onCariTerbuka={setCariTerbuka}
        tutup={tutup}
      />

      <LembarAlasanLibur
        vm={lembarLibur.vm}
        onTutup={lembarLibur.tutup}
        onKirim={lembarLibur.kirim}
      />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
  });
