import { kunciWilayah } from "@opennael/domain";
import { router } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import {
  KartuTagihan,
  type KartuVM,
  KerangkaKartu,
  susunKartu,
} from "../../../komponen/kartu-tagihan";
import { LembarSetor } from "../../../komponen/lembar-setor";
import { useRuangTab } from "../../../komponen/tab-mengambang";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import { Ikon, Isian, Keterangan, PesanGalat, Spanduk, Tombol } from "../../../komponen/ui";
import { rupiah } from "../../../lib/format";
import { bacaGerbang, useHariIni, usePosisiTagih, useTagihan } from "../../../lib/lapangan";

type Saringan = "belum" | "telat" | "sudah" | "semua";

const SARINGAN: { nilai: Saringan; teks: string }[] = [
  { nilai: "belum", teks: "Belum" },
  { nilai: "telat", teks: "Telat" },
  { nilai: "sudah", teks: "Sudah" },
  { nilai: "semua", teks: "Semua" },
];

const sudahDicatat = (vm: KartuVM) => vm.keadaan === "setor" || vm.keadaan === "libur";

const cocokSaringan: Record<Saringan, (vm: KartuVM) => boolean> = {
  belum: (vm) => vm.keadaan === "belum",
  telat: (vm) => vm.p.status === "macet" || (vm.telat ?? 0) > 0,
  sudah: sudahDicatat,
  semua: () => true,
};

const KOSONG: Record<Saringan, string> = {
  belum: "Semua yang wajib ditagih hari ini sudah dicatat — laporan bisa dibuka.",
  telat: "Tidak ada nasabah yang telat atau macet.",
  sudah: "Belum ada setoran atau libur yang dicatat hari ini.",
  semua: "Belum ada pinjaman aktif di pegangan Anda.",
};

/**
 * TAGIHAN — kerja lapangan kolektor dalam satu layar: ringkasan hari ini,
 * cari, saring (Belum · Telat · Sudah · Semua), daftar per kampung urut rute,
 * dan setor cepat dari kartu. Di tiap kampung yang belum dicatat di atas;
 * yang sudah turun ringkas ke bawah.
 *
 * Cepat: daftar tagih & posisi tagih dimuat sejajar (kartu tampil dulu,
 * penanda telat menyusul); view model kartu di-cache per objek data; kolom
 * cari memakai nilai tertunda supaya ketikan tak tersendat.
 */
export default function Tagihan() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const ruangTab = useRuangTab();
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const posisi = usePosisiTagih();
  const [cari, setCari] = useState("");
  const kunci = kunciWilayah(useDeferredValue(cari));
  const [saring, setSaring] = useState<Saringan>("belum");
  const [setor, setSetor] = useState<KartuVM | null>(null);

  const tanggal = hariIni.data?.kalender.tanggal ?? "";
  const semua = useMemo(
    () => (tagihan.data ?? []).map((p) => susunKartu(p, posisi.data?.get(p.id), tanggal)),
    [tagihan.data, posisi.data, tanggal],
  );

  const ringkasan = useMemo(() => {
    let dicatat = 0;
    let libur = 0;
    let setoran = 0;
    let wajib = 0;
    for (const vm of semua) {
      // Setoran dijumlah semuanya; dicatat/wajib hanya yang wajib hari ini (B6)
      // — sama dengan yang diperiksa server sebelum laporan dibuka (C6).
      if (vm.p.hariIni?.jenis === "angsuran") setoran += vm.p.hariIni.storting;
      if (vm.p.hariIni?.jenis === "libur") libur++;
      if (!vm.wajib) continue;
      wajib++;
      if (vm.p.hariIni) dicatat++;
    }
    const jumlah = {} as Record<Saringan, number>;
    for (const s of SARINGAN) jumlah[s.nilai] = semua.filter(cocokSaringan[s.nilai]).length;
    return { dicatat, libur, setoran, wajib, jumlah };
  }, [semua]);

  const bagian = useMemo(() => {
    const perKampung = new Map<string, KartuVM[]>();
    for (const vm of semua) {
      if (!cocokSaringan[saring](vm)) continue;
      const { nama, kampung } = vm.p.nasabah;
      if (kunci && !kunciWilayah(nama).includes(kunci) && !kunciWilayah(kampung).includes(kunci))
        continue;
      perKampung.set(kampung, [...(perKampung.get(kampung) ?? []), vm]);
    }
    return [...perKampung].map(([title, data]) => ({
      title,
      // Urutan rute dari server dipertahankan; yang sudah dicatat turun ke bawah.
      data: [...data.filter((vm) => !sudahDicatat(vm)), ...data.filter(sudahDicatat)],
      dicatat: data.filter(sudahDicatat).length,
    }));
  }, [semua, saring, kunci]);

  const gerbang = hariIni.data ? bacaGerbang(hariIni.data) : null;
  const buka = useCallback(
    (id: string) => router.push({ pathname: "/kolektor/pinjaman/[id]", params: { id } }),
    [],
  );
  const segarkan = () => {
    void hariIni.refetch();
    void tagihan.refetch();
    void posisi.refetch();
  };

  if (hariIni.isError || tagihan.isError) {
    return (
      <View style={[gaya.layar, gaya.galat]}>
        <PesanGalat pesan={(hariIni.error ?? tagihan.error)?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={segarkan} />
      </View>
    );
  }

  const memuat = hariIni.isPending || tagihan.isPending;
  const persen = ringkasan.wajib > 0 ? ringkasan.dicatat / ringkasan.wajib : 0;

  return (
    <View style={gaya.layar}>
      <View style={gaya.alat}>
        <Isian
          ikon="search"
          value={cari}
          onChangeText={setCari}
          placeholder="Cari nama atau kampung"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <View style={gaya.cipDeret}>
          {SARINGAN.map((s) => {
            const aktif = s.nilai === saring;
            return (
              <Pressable
                key={s.nilai}
                onPress={() => setSaring(s.nilai)}
                accessibilityRole="tab"
                accessibilityState={{ selected: aktif }}
                style={[gaya.cip, aktif ? gaya.cipAktif : null]}
              >
                <Text style={[gaya.cipTeks, aktif ? gaya.cipTeksAktif : null]}>{s.teks}</Text>
                <Text style={[gaya.cipJumlah, aktif ? gaya.cipTeksAktif : null]}>
                  {memuat ? "–" : ringkasan.jumlah[s.nilai]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionList
        style={gaya.layar}
        contentContainerStyle={{ paddingBottom: ruangTab }}
        sections={memuat ? [] : bagian}
        keyExtractor={(vm) => vm.p.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled
        initialNumToRender={8}
        windowSize={9}
        refreshControl={
          <RefreshControl
            refreshing={hariIni.isRefetching || tagihan.isRefetching}
            onRefresh={segarkan}
            tintColor={WARNA.utama}
            colors={[WARNA.utama]}
          />
        }
        ListHeaderComponent={
          <View style={gaya.kepalaDaftar}>
            {gerbang && !gerbang.buka ? (
              <Spanduk
                judul={gerbang.perluAbsen ? "Absen dulu" : (gerbang.judul ?? "Lapangan tutup")}
                isi={
                  gerbang.perluAbsen
                    ? "Setoran bisa dicatat sesudah absen pagi di Beranda."
                    : gerbang.isi
                }
              />
            ) : null}
            {memuat ? (
              <>
                <KerangkaKartu />
                <KerangkaKartu />
                <KerangkaKartu />
              </>
            ) : (
              <View style={gaya.ringkasan}>
                <View style={gaya.ringkasanAtas}>
                  <View>
                    <Text style={gaya.ringkasanLabel}>Dicatat hari ini</Text>
                    <Text style={gaya.ringkasanAngka}>
                      {ringkasan.dicatat}
                      <Text style={gaya.ringkasanDari}> / {ringkasan.wajib}</Text>
                    </Text>
                  </View>
                  <View style={gaya.ringkasanKanan}>
                    <Text style={gaya.ringkasanLabel}>Setoran</Text>
                    <Text style={gaya.ringkasanUang}>{rupiah(ringkasan.setoran)}</Text>
                  </View>
                </View>
                <View style={gaya.rel}>
                  <View style={[gaya.isiRel, { width: `${Math.round(persen * 100)}%` }]} />
                </View>
                <Text style={gaya.ringkasanKaki}>
                  {ringkasan.wajib - ringkasan.dicatat} belum · {ringkasan.libur} libur ·{" "}
                  {ringkasan.jumlah.telat} telat/macet
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          memuat ? undefined : (
            <View style={gaya.kosong}>
              <Ikon
                nama={kunci ? "search-x" : saring === "belum" ? "circle-check" : "users"}
                ukuran={28}
                warna={WARNA.redup}
              />
              <Keterangan>
                {kunci ? "Tidak ada yang cocok dengan pencarian ini." : KOSONG[saring]}
              </Keterangan>
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={gaya.kampung}>
            <Ikon nama="map-pin" ukuran={14} warna={WARNA.redup} />
            <Text style={gaya.kampungTeks} numberOfLines={1}>
              {section.title}
            </Text>
            <Text style={gaya.kampungJumlah}>
              {section.dicatat}/{section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <KartuTagihan
            vm={item}
            bukaSetor={gerbang?.buka ?? false}
            onBuka={buka}
            onSetor={setSetor}
          />
        )}
      />

      <LembarSetor
        vm={setor}
        onTutup={() => setSetor(null)}
        onKartuLengkap={(id) => {
          setSetor(null);
          buka(id);
        }}
      />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
    alat: {
      gap: RUANG[3],
      paddingHorizontal: RUANG[4],
      paddingTop: RUANG[2],
      paddingBottom: RUANG[3],
      borderBottomWidth: 1,
      borderBottomColor: WARNA.garis,
      backgroundColor: WARNA.latar,
    },
    cipDeret: { flexDirection: "row", gap: RUANG[2] },
    cip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1.5],
      height: 36,
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    cipAktif: { borderColor: WARNA.utamaIsi, backgroundColor: WARNA.utamaIsi },
    cipTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.teksKedua },
    cipJumlah: {
      ...HURUF.xs,
      fontWeight: TEBAL.tebal,
      fontVariant: ["tabular-nums"],
      color: WARNA.redup,
    },
    cipTeksAktif: { color: WARNA.teksAtasUtama },
    kepalaDaftar: { gap: RUANG[3], paddingTop: RUANG[3] },
    ringkasan: {
      gap: RUANG[3],
      marginHorizontal: RUANG[4],
      padding: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.utamaGaris,
      backgroundColor: WARNA.utamaLembut,
    },
    ringkasanAtas: { flexDirection: "row", justifyContent: "space-between" },
    ringkasanKanan: { alignItems: "flex-end" },
    ringkasanLabel: { ...HURUF.xs, fontWeight: TEBAL.sedang, color: WARNA.utamaTua },
    ringkasanAngka: {
      ...HURUF["3xl"],
      fontWeight: TEBAL.ekstra,
      fontVariant: ["tabular-nums"],
      color: WARNA.utamaTua,
    },
    ringkasanDari: { ...HURUF.lg, fontWeight: TEBAL.semi, color: WARNA.utama },
    ringkasanUang: {
      ...HURUF.xl,
      paddingTop: RUANG[1.5],
      fontWeight: TEBAL.tebal,
      fontVariant: ["tabular-nums"],
      color: WARNA.utamaTua,
    },
    rel: { height: 8, borderRadius: SUDUT.bulat, backgroundColor: WARNA.utamaMuda },
    isiRel: { height: "100%", borderRadius: SUDUT.bulat, backgroundColor: WARNA.utamaIsi },
    ringkasanKaki: { ...HURUF.xs, color: WARNA.utamaTua },
    kampung: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1.5],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[4],
      paddingBottom: RUANG[2],
      backgroundColor: WARNA.latar,
    },
    kampungTeks: {
      ...HURUF.xs,
      flex: 1,
      fontWeight: TEBAL.tebal,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: WARNA.redup,
    },
    kampungJumlah: {
      ...HURUF.xs,
      fontWeight: TEBAL.semi,
      fontVariant: ["tabular-nums"],
      color: WARNA.redup,
    },
    kosong: {
      alignItems: "center",
      gap: RUANG[2],
      marginHorizontal: RUANG[4],
      marginTop: RUANG[3],
      paddingHorizontal: RUANG[4],
      paddingVertical: RUANG[8],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: WARNA.garisTegas,
    },
  });
