import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { TombolKeluar } from "../../../komponen/keluar";
import { PilihTampilan } from "../../../komponen/pilih-tampilan";
import { useRuangTab } from "../../../komponen/tab-mengambang";
import { useGaya } from "../../../komponen/tampilan";
import { HURUF, RUANG, TEBAL, type Warna } from "../../../komponen/tema";
import {
  Isian,
  IsianUang,
  Kartu,
  KotakAngka,
  Memuat,
  PesanGalat,
  Pilihan,
  Spanduk,
  Tombol,
  useG,
} from "../../../komponen/ui";
import { rupiah, tanggalPanjang } from "../../../lib/format";
import { bacaGerbang, tulis, useHariIni, useTagihan, useTulis } from "../../../lib/lapangan";
import { useSesi } from "../../../lib/sesi";

/**
 * BERANDA KOLEKTOR — absen pagi, ringkasan setoran hari ini, dan buka laporan
 * sore. Daftar tagih ada di tab Tagihan; akad baru lewat tombol (+).
 */
export default function Beranda() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const s = useSesi();
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const ruangTab = useRuangTab();

  const segarkan = () => {
    void hariIni.refetch();
    void tagihan.refetch();
  };

  if (hariIni.isPending) return <Memuat teks="Memuat kerja hari ini…" />;
  if (hariIni.isError) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={segarkan} />
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
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        <RefreshControl
          refreshing={hariIni.isRefetching || tagihan.isRefetching}
          onRefresh={segarkan}
        />
      }
    >
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
            ikon="check-check"
            nilai={`${dicatat.length} / ${semua.length}`}
          />
          <KotakAngka label="Setoran" ikon="banknote" nilai={rupiah(storting)} />
        </View>
      ) : null}
      {tagihan.isError ? <PesanGalat pesan={tagihan.error.message} /> : null}

      <KakiKerja laporanBisa={gerbang.buka} />
    </ScrollView>
  );
}

function FormulirAbsen() {
  const g = useG();
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
        ikon="circle-check"
        memuat={absen.isPending}
        nonaktif={absensi === "tidak_kerja" && !alasan.trim()}
        onPress={simpan}
      />
    </Kartu>
  );
}

function KakiKerja({ laporanBisa }: { laporanBisa: boolean }) {
  const gaya = useGaya(buatGaya);
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
            ikon="file-text"
            memuat={laporan.isPending}
            onPress={bukaLaporan}
          />
        </>
      ) : null}
      <PilihTampilan />
      <TombolKeluar />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
    isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
    tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utama },
    kaki: { gap: RUANG[3], paddingTop: RUANG[4] },
  });
