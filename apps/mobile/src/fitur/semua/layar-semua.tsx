import { kunciWilayah } from "@opennael/domain";
import { router } from "expo-router";
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRuangTab } from "../../komponen/tab-mengambang";
import { useGaya, useGelap, useWarna, useWarnaMode } from "../../komponen/tampilan";
import {
  HURUF,
  MODE_GELAP,
  MODE_TERANG,
  RUANG,
  SUDUT,
  TEBAL,
  type Warna,
} from "../../komponen/tema";
import { Ikon, PesanGalat, Tombol } from "../../komponen/ui";
import { rupiah } from "../../lib/format";
import { useHariIni, useTagihan } from "../../lib/lapangan";
import { MODE } from "../mode/mode";
import { susunBahanGrid } from "../tagihan/inti/grid";
import { kartuVM, rupiahPendek } from "../tagihan/inti/kartu";
import {
  type BarisSemua,
  jumlahSaringan,
  type KeadaanSemua,
  LABEL_URUTAN,
  SARINGAN,
  type SaringanSemua,
  saringSemua,
  susunBarisSemua,
  URUTAN_SEMUA,
  type UrutanSemua,
} from "./inti";

/**
 * Tab Tagihan mode SEMUA — DIREKTORI hanya-baca seluruh pinjaman aktif
 * ketiga jenis (klon "Nasabah Semua" aplikasi lama): kolom cari, pil saring
 * berangka, ringkasan jumlah & saldo hasil saring, dan urutan yang diketuk
 * bergiliran (Rute · Paling mendesak · Saldo terbesar · Nama A–Z). Diketuk →
 * rincian pinjaman tanpa tombol transaksi; menagih dari mode jenisnya.
 */
export function LayarSemua() {
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  const aksen = useWarnaMode("semua");
  const insets = useSafeAreaInsets();
  const ruangTab = useRuangTab();

  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const tagihan = useTagihan();

  const [saringan, setSaringan] = useState<SaringanSemua>("semua");
  const [urutan, setUrutan] = useState<UrutanSemua>("rute");
  const [cari, setCari] = useState("");
  const kunci = kunciWilayah(useDeferredValue(cari));

  // Kartu Tagihan yang sama (tanpa grid: riwayat bulan tak dimuat di sini).
  const baris = useMemo(() => {
    if (!tagihan.data || !tanggal) return [];
    const bahan = susunBahanGrid(tanggal, undefined, undefined);
    return tagihan.data.map((p) => susunBarisSemua(kartuVM(p, tanggal, bahan)));
  }, [tagihan.data, tanggal]);
  const jumlah = useMemo(() => jumlahSaringan(baris), [baris]);
  const data = useMemo(
    () => saringSemua(baris, saringan, kunci, urutan),
    [baris, saringan, kunci, urutan],
  );
  const totalSaldo = useMemo(() => data.reduce((t, b) => t + b.saldo, 0), [data]);

  const daftar = useRef<FlatList<BarisSemua>>(null);
  const pilih = (s: SaringanSemua) => {
    setSaringan(s);
    daftar.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const gantiUrutan = () =>
    setUrutan((u) => URUTAN_SEMUA[(URUTAN_SEMUA.indexOf(u) + 1) % URUTAN_SEMUA.length] ?? "rute");

  const renderItem = useCallback(({ item }: { item: BarisSemua }) => <BarisNasabah b={item} />, []);

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

  return (
    <View style={gaya.layar}>
      <View style={[gaya.kepala, { paddingTop: insets.top + RUANG[2] }]}>
        <View style={gaya.barisJudul}>
          <Text style={gaya.merek}>OpenNael</Text>
          <View style={[gaya.lencanaMode, { backgroundColor: aksen.lembut }]}>
            <Text style={[gaya.lencanaModeTeks, { color: aksen.teks }]}>{MODE.semua.label}</Text>
          </View>
        </View>
        <Text style={gaya.subjudul} numberOfLines={1}>
          {memuat
            ? "Memuat…"
            : `${jumlah.semua} aktif · ${jumlah.tagih} perlu ditagih · ${jumlah.macet} macet`}
        </Text>
        <View style={gaya.kolomCari}>
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
          {cari ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
              hitSlop={8}
              onPress={() => setCari("")}
            >
              <Ikon nama="x" ukuran={16} warna={WARNA.samar} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={gaya.pil}
          style={gaya.pilBingkai}
        >
          {SARINGAN.map((s) => {
            const aktif = s.nilai === saringan;
            return (
              <Pressable
                key={s.nilai}
                accessibilityRole="tab"
                accessibilityState={{ selected: aktif }}
                onPress={() => pilih(s.nilai)}
                style={[
                  gaya.keping,
                  aktif ? { backgroundColor: aksen.isi, borderColor: aksen.isi } : null,
                ]}
              >
                <Text style={[gaya.kepingTeks, aktif ? { color: aksen.teksIsi } : null]}>
                  {s.label}
                </Text>
                <Text style={[gaya.kepingAngka, aktif ? { color: aksen.teksIsi } : null]}>
                  {jumlah[s.nilai]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        ref={daftar}
        data={memuat ? [] : data}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        initialNumToRender={12}
        windowSize={9}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: RUANG[2], paddingBottom: ruangTab }}
        refreshControl={
          <RefreshControl
            refreshing={tagihan.isRefetching}
            onRefresh={() => {
              void hariIni.refetch();
              void tagihan.refetch();
            }}
            tintColor={aksen.teks}
            colors={[aksen.teks]}
          />
        }
        ListHeaderComponent={
          !memuat && data.length > 0 ? (
            <View style={gaya.kepalaDaftar}>
              <Text style={gaya.ringkas} numberOfLines={1}>
                {data.length} nasabah · saldo {rupiahPendek(totalSaldo)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Urutan: ${LABEL_URUTAN[urutan]}. Ketuk untuk ganti.`}
                hitSlop={8}
                onPress={gantiUrutan}
                style={({ pressed }) => [gaya.urut, pressed ? gaya.ditekan : null]}
              >
                <Ikon nama="arrow-up-down" ukuran={13} warna={aksen.teks} />
                <Text style={[gaya.urutTeks, { color: aksen.teks }]}>{LABEL_URUTAN[urutan]}</Text>
              </Pressable>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          memuat ? (
            <>
              <KerangkaBaris />
              <KerangkaBaris />
              <KerangkaBaris />
            </>
          ) : (
            <View style={gaya.kosong}>
              <View style={[gaya.kosongIkon, { backgroundColor: aksen.lembut }]}>
                <Ikon nama="search-x" ukuran={24} warna={aksen.teks} />
              </View>
              <Text style={gaya.kosongJudul}>Tidak ada nasabah</Text>
              <Text style={gaya.kosongIsi}>
                Tak ada yang cocok dengan pilihan atau pencarian ini.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const BarisNasabah = memo(function BarisNasabah({ b }: { b: BarisSemua }) {
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  const w = (useGelap() ? MODE_GELAP : MODE_TERANG)[b.jenis];
  const rupaKeadaan: Record<KeadaanSemua, { teks: string; latar: string }> = {
    baru: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    sudah: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    libur: { teks: WARNA.teksKedua, latar: WARNA.abu },
    macet: { teks: WARNA.putih, latar: WARNA.bahaya },
    belum: { teks: WARNA.waspadaTua, latar: WARNA.waspadaLembut },
    hariini: { teks: w.teks, latar: w.lembut },
    lewat: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
    nanti: { teks: WARNA.teksKedua, latar: WARNA.abu },
  };
  const k = rupaKeadaan[b.keadaan];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${b.nama}, ${MODE[b.jenis].label}, ${b.keadaanTeks}, saldo ${rupiah(b.saldo)}. Buka rincian.`}
      onPress={() =>
        router.push({ pathname: "/kolektor/pinjaman/[id]", params: { id: b.id, lihat: "1" } })
      }
      style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
    >
      <View style={[gaya.pita, { backgroundColor: w.teks }]} />
      <View style={[gaya.huruf, { backgroundColor: w.lembut }]}>
        <Text style={[gaya.hurufTeks, { color: w.teks }]}>{MODE[b.jenis].huruf}</Text>
      </View>
      <View style={gaya.tengah}>
        <View style={gaya.barisAtas}>
          <Text style={gaya.nama} numberOfLines={1}>
            {b.nama}
          </Text>
          <Text style={gaya.saldo} numberOfLines={1}>
            {rupiahPendek(b.saldo)}
          </Text>
        </View>
        <View style={gaya.barisAtas}>
          <Text style={gaya.sub} numberOfLines={1}>
            {b.subjudul}
          </Text>
          <View style={[gaya.lencana, { backgroundColor: k.latar }]}>
            <Text style={[gaya.lencanaTeks, { color: k.teks }]} numberOfLines={1}>
              {b.keadaanTeks}
            </Text>
          </View>
        </View>
        <View style={gaya.barisProgres}>
          <View style={gaya.rel}>
            <View
              style={[
                gaya.isiRel,
                { width: `${Math.round(b.progres * 100)}%`, backgroundColor: w.teks },
              ]}
            />
          </View>
          <Text style={[gaya.kemajuan, { color: w.teks }]} numberOfLines={1}>
            {b.kemajuan}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function KerangkaBaris() {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.baris}>
      <View style={[gaya.huruf, gaya.kerangka]} />
      <View style={gaya.tengah}>
        <View style={[gaya.kerangkaGaris, { width: "55%" }]} />
        <View style={[gaya.kerangkaGaris, { width: "35%" }]} />
        <View style={gaya.rel} />
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
    kepala: {
      gap: RUANG[2],
      paddingHorizontal: RUANG[4],
      paddingBottom: RUANG[3],
      borderBottomWidth: 1,
      borderBottomColor: WARNA.garis,
      backgroundColor: WARNA.latar,
    },
    barisJudul: { flexDirection: "row", alignItems: "center", gap: RUANG[2], minHeight: 40 },
    merek: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, color: WARNA.teks },
    lencanaMode: { paddingHorizontal: RUANG[2.5], paddingVertical: 2, borderRadius: SUDUT.bulat },
    lencanaModeTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal },
    subjudul: { ...HURUF.sm, color: WARNA.redup, fontVariant: ["tabular-nums"] },
    kolomCari: {
      height: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
      marginTop: RUANG[1],
      paddingHorizontal: RUANG[3],
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    teksCari: { ...HURUF.base, flex: 1, paddingVertical: 0, color: WARNA.teks },
    pilBingkai: { marginHorizontal: -RUANG[4] },
    pil: { gap: RUANG[1.5], paddingHorizontal: RUANG[4] },
    keping: {
      height: 34,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1.5],
      paddingHorizontal: RUANG[3],
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    kepingTeks: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
    kepingAngka: {
      ...HURUF.xs,
      fontWeight: TEBAL.tebal,
      color: WARNA.samar,
      fontVariant: ["tabular-nums"],
    },
    kepalaDaftar: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[3],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[2],
      paddingBottom: RUANG[2],
    },
    ringkas: {
      ...HURUF.xs,
      flex: 1,
      fontWeight: TEBAL.semi,
      color: WARNA.redup,
      fontVariant: ["tabular-nums"],
    },
    urut: { flexDirection: "row", alignItems: "center", gap: RUANG[1] },
    urutTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal },
    ditekan: { opacity: 0.7 },
    baris: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[3],
      marginHorizontal: RUANG[4],
      marginBottom: RUANG[2],
      paddingVertical: RUANG[3],
      paddingLeft: RUANG[4],
      paddingRight: RUANG[3],
      overflow: "hidden",
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    pita: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
    huruf: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
    },
    hurufTeks: { ...HURUF.sm, fontWeight: TEBAL.ekstra },
    tengah: { flex: 1, gap: RUANG[1] },
    barisAtas: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    nama: { ...HURUF.base, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    saldo: {
      ...HURUF.sm,
      fontWeight: TEBAL.tebal,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    sub: { ...HURUF.xs, flex: 1, color: WARNA.redup },
    lencana: { paddingHorizontal: RUANG[2], paddingVertical: 2, borderRadius: SUDUT.bulat },
    lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.tebal },
    barisProgres: { flexDirection: "row", alignItems: "center", gap: RUANG[2], marginTop: 2 },
    rel: { flex: 1, height: 4, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    isiRel: { height: 4, borderRadius: SUDUT.bulat },
    kemajuan: { ...HURUF["2xs"], fontWeight: TEBAL.semi, fontVariant: ["tabular-nums"] },
    kerangka: { backgroundColor: WARNA.abu },
    kerangkaGaris: { height: 10, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kosong: {
      alignItems: "center",
      gap: RUANG[2],
      marginHorizontal: RUANG[4],
      marginTop: RUANG[6],
      padding: RUANG[6],
    },
    kosongIkon: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
    },
    kosongJudul: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
    kosongIsi: { ...HURUF.sm, textAlign: "center", color: WARNA.redup },
  });
