import { tanggal as formatTanggal, jam, rupiah } from "@opennael/format";
import { Stack } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KartuRincian } from "@/komponen/statistik/kartu-rincian";
import { KartuSorot } from "@/komponen/statistik/kartu-sorot";
import { KerangkaStatistik } from "@/komponen/statistik/kerangka-statistik";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Tombol } from "@/komponen/ui/tombol";
import { useZonaKantor } from "@/lib/kantor";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG } from "@/tema";
import { useHariKas } from "./data";
import { kartuArus, sorotHari } from "./inti/riwayat-kas";

/**
 * KAS SATU HARI (dari Riwayat Kas) — kartu hitam tunai seharusnya & hasil serah terima
 * (angka yang dibekukan saat kasir menerima), arus kas I1, waktu laporan & penerimaan, dan
 * biaya tak terduga yang dicatat kasir hari itu.
 */
export function LayarHariKas({ tanggal }: { tanggal: string }) {
  const bawah = useSafeAreaInsets().bottom;
  const zona = useZonaKantor();
  const { kas, biaya } = useHariKas(tanggal);
  const segarkan = useCallback(() => Promise.all([kas.refetch(), biaya.refetch()]), [kas, biaya]);
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const hari = kas.data?.[0];
  const daftarBiaya = biaya.data?.biaya.filter((b) => !b.dibatalkanAt) ?? [];

  let isi: React.ReactNode;
  if (kas.isPending) isi = <KerangkaStatistik kartu={1} />;
  else if (!kas.data) {
    isi = (
      <View style={g.tumpuk3}>
        <PesanGalat pesan={kas.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  } else if (!hari) {
    isi = (
      <KotakKosong ikon="calendar-days" judul="Tidak ada catatan" isi="Belum absen hari itu." />
    );
  } else if (hari.absensi === "tidak_kerja") {
    isi = (
      <KotakKosong
        ikon="calendar-days"
        judul="Tidak kerja"
        isi={hari.alasanTidakKerja ? `Alasan: ${hari.alasanTidakKerja}.` : "Tak ada arus kas."}
      />
    );
  } else {
    const arus = kartuArus(hari);
    const st = hari.serahTerima;
    isi = (
      <>
        <KartuSorot vm={sorotHari(hari)} />
        {arus ? <KartuRincian vm={arus} /> : null}
        <View style={g.bagian}>
          <Text style={g.judulBagian}>WAKTU</Text>
          <Kartu>
            <Baris
              label="Laporan dibuka"
              nilai={hari.laporanDibukaAt ? jam(hari.laporanDibukaAt, zona) : "—"}
            />
            <Baris
              label="Kas diterima"
              nilai={st ? `${jam(st.dibuatAt, zona)} · ${st.diterimaOleh.nama}` : "Belum"}
            />
          </Kartu>
        </View>
        <View style={g.bagian}>
          <Text style={g.judulBagian}>BIAYA TAK TERDUGA</Text>
          {daftarBiaya.length > 0 ? (
            <Kartu>
              {daftarBiaya.map((b) => (
                <Baris key={b.id} label={b.keterangan} nilai={rupiah(b.nominal)} />
              ))}
            </Kartu>
          ) : (
            <Text style={g.teksRedup}>
              {biaya.isError ? "Gagal memuat biaya." : "Tidak ada biaya tak terduga hari itu."}
            </Text>
          )}
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: formatTanggal(tanggal, "pendek") }} />
      <ScrollView
        style={g.layar}
        contentContainerStyle={[gaya.isi, { paddingBottom: bawah + RUANG[6] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={menarik}
            onRefresh={tarik}
            tintColor={AKSEN.teks}
            colors={[AKSEN.teks]}
          />
        }
      >
        {isi}
      </ScrollView>
    </>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[3], paddingHorizontal: RUANG[5], paddingTop: RUANG[3] },
});
