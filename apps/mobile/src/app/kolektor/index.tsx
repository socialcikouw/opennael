import type { KartuTagih } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TombolKeluar } from "../../komponen/keluar";
import { HURUF, RUANG, SUDUT, TEBAL } from "../../komponen/tema";
import {
  g,
  Ikon,
  Isian,
  IsianUang,
  Kartu,
  Keterangan,
  KotakAngka,
  Lencana,
  Memuat,
  PesanGalat,
  Pilihan,
  Spanduk,
  Tombol,
  WARNA,
} from "../../komponen/ui";
import { NAMA_JENIS, rupiah, tanggalPanjang } from "../../lib/format";
import { bacaGerbang, tulis, useHariIni, useTagihan, useTulis } from "../../lib/lapangan";
import { useSesi } from "../../lib/sesi";

/**
 * KERJA HARIAN KOLEKTOR — absen pagi, lalu daftar tagih pegangan per kampung.
 * Kartu yang sudah dicatat hari ini (setoran / libur) ditandai (C3).
 */
export default function KerjaHarian() {
  const s = useSesi();
  const hariIni = useHariIni();
  const tagihan = useTagihan();
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

  if (hariIni.isPending) return <Memuat teks="Memuat kerja hari ini…" />;
  if (hariIni.isError) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error.message} />
        <Tombol judul="Coba lagi" ikon="refresh" onPress={segarkan} />
      </View>
    );
  }

  const keadaan = hariIni.data;
  const gerbang = bacaGerbang(keadaan);
  const semua = tagihan.data ?? [];
  const dicatat = semua.filter((p) => p.hariIni);
  const storting = dicatat.reduce(
    (n, p) => n + (p.hariIni?.jenis === "angsuran" ? p.hariIni.storting : 0),
    0,
  );

  return (
    <SectionList
      style={g.layar}
      contentContainerStyle={gaya.daftar}
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
          <View style={g.tumpuk05}>
            <Text style={gaya.tanggal}>{tanggalPanjang(keadaan.kalender.tanggal)}</Text>
            <Text style={g.judul}>Halo, {s?.pengguna.nama}</Text>
            <Text style={g.teksRedup}>{s?.pengguna.kantor.nama}</Text>
          </View>

          {gerbang.judul ? <Spanduk judul={gerbang.judul} isi={gerbang.isi} /> : null}
          {gerbang.perluAbsen ? <FormulirAbsen /> : null}

          {keadaan.hari?.absensi === "masuk_kerja" ? (
            <View style={g.baris3}>
              <KotakAngka
                label="Dicatat"
                ikon="checkmark-done"
                nilai={`${dicatat.length} / ${semua.length}`}
              />
              <KotakAngka label="Setoran" ikon="cash-outline" nilai={rupiah(storting)} />
            </View>
          ) : null}

          {gerbang.buka ? (
            <Tombol
              judul="Akad baru"
              ikon="add-circle-outline"
              onPress={() => router.push("/kolektor/akad")}
            />
          ) : null}

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
              <Ikon nama="people-outline" ukuran={28} warna={WARNA.redup} />
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
          <Ikon nama="location-outline" ukuran={14} warna={WARNA.redup} />
          <Text style={gaya.kampungTeks}>
            {section.title} · {section.data.length}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <BarisTagih p={item} tanggal={keadaan.kalender.tanggal} />}
      ListFooterComponent={<KakiKerja laporanBisa={gerbang.buka} />}
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
      <View style={[gaya.inisial, p.hariIni ? gaya.inisialDicatat : null]}>
        {p.hariIni ? (
          <Ikon nama="checkmark" ukuran={18} warna={WARNA.utama} />
        ) : (
          <Text style={gaya.inisialHuruf}>{p.nasabah.nama.charAt(0).toUpperCase()}</Text>
        )}
      </View>
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
      <Ikon nama="chevron-forward" ukuran={18} warna={WARNA.samar} />
    </Pressable>
  );
}

function FormulirAbsen() {
  const [absensi, setAbsensi] = useState<"masuk_kerja" | "tidak_kerja">("masuk_kerja");
  const [kasLapangan, setKasLapangan] = useState(0);
  const [uangJalan, setUangJalan] = useState(0);
  const [alasan, setAlasan] = useState("");
  const absen = useTulis(tulis.absen);

  const simpan = () =>
    absen.mutate(
      absensi === "masuk_kerja"
        ? { absensi, kasLapangan, uangJalan }
        : { absensi, alasan: alasan.trim() },
    );

  return (
    <Kartu>
      <Text style={g.subjudul}>Absen pagi</Text>
      <Pilihan
        segmen
        pilihan={[
          { nilai: "masuk_kerja", teks: "Masuk kerja" },
          { nilai: "tidak_kerja", teks: "Tidak kerja" },
        ]}
        nilai={absensi}
        onPilih={setAbsensi}
      />
      {absensi === "masuk_kerja" ? (
        <>
          <IsianUang
            label="Kas lapangan (modal dari bos)"
            nilai={kasLapangan}
            onUbah={setKasLapangan}
          />
          <IsianUang label="Uang jalan" nilai={uangJalan} onUbah={setUangJalan} />
        </>
      ) : (
        <Isian
          label="Alasan"
          value={alasan}
          onChangeText={setAlasan}
          placeholder="Sakit, urusan keluarga, …"
          maxLength={100}
        />
      )}
      <PesanGalat pesan={absen.error?.message} />
      <Tombol
        judul="Simpan absen"
        ikon="checkmark-circle-outline"
        memuat={absen.isPending}
        nonaktif={absensi === "tidak_kerja" && !alasan.trim()}
        onPress={simpan}
      />
    </Kartu>
  );
}

function KakiKerja({ laporanBisa }: { laporanBisa: boolean }) {
  const laporan = useTulis(tulis.laporan);

  const bukaLaporan = () =>
    Alert.alert(
      "Buka laporan?",
      "Sesudah laporan dibuka, setoran, akad, gulung, dan libur hari ini tidak bisa dicatat lagi.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Buka laporan", style: "destructive", onPress: () => laporan.mutate() },
      ],
    );

  return (
    <View style={gaya.kaki}>
      {laporanBisa ? (
        <>
          <PesanGalat pesan={laporan.error?.message} />
          <Tombol
            judul="Buka laporan hari ini"
            jenis="kedua"
            ikon="document-text-outline"
            memuat={laporan.isPending}
            onPress={bukaLaporan}
          />
        </>
      ) : null}
      <TombolKeluar />
    </View>
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  daftar: { paddingBottom: RUANG[10] },
  kepala: {
    gap: RUANG[4],
    paddingHorizontal: RUANG[5],
    paddingTop: RUANG[2],
    paddingBottom: RUANG[3],
  },
  tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utama },
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
  inisial: {
    width: 36,
    height: 36,
    borderRadius: SUDUT.bulat,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.abu,
  },
  inisialDicatat: { backgroundColor: WARNA.utamaMuda },
  inisialHuruf: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.teksKedua },
  rincian: { gap: RUANG[1] },
  angka: { alignItems: "flex-end" },
  angsuran: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
  kaki: { gap: RUANG[3], paddingHorizontal: RUANG[5], paddingTop: RUANG[6] },
});
