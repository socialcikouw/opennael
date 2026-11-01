import { wajibDitagihHariIni } from "@opennael/domain";
import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useCallback } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useGaya } from "@/komponen/ui/tampilan";
import { Tombol } from "@/komponen/ui/tombol";
import { useSesi } from "@/lib/sesi";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useHariIni, useTagihan } from "./data";
import { buatGaya } from "./gaya-beranda";
import { bacaGerbang } from "./gerbang";
import { FormulirAbsen } from "./komponen/formulir-absen";
import { KakiKerja } from "./komponen/kaki-kerja";

/**
 * BERANDA KOLEKTOR — absen pagi, ringkasan setoran hari ini, dan buka laporan
 * sore. Daftar tagih ada di tab Tagihan; akad baru lewat tombol (+).
 */
export function LayarBeranda() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const s = useSesi();
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const ruangTab = useRuangTab();

  // Pemutar tarik-segarkan hanya menyala karena ditarik, bukan karena penyegaran di latar.
  const { refetch: segarHariIni } = hariIni;
  const { refetch: segarTagihan } = tagihan;
  const segarkan = useCallback(
    () => Promise.all([segarHariIni(), segarTagihan()]),
    [segarHariIni, segarTagihan],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (hariIni.isPending) return <Memuat teks="Memuat kerja hari ini…" />;
  // Layar galat penuh hanya bila belum ada data; gagal menyegarkan data yang sudah ada
  // cukup spanduk di atas isi (kolektor tetap melihat Beranda terakhirnya).
  const keadaan = hariIni.data;
  if (!keadaan) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  }

  const gerbang = bacaGerbang(keadaan);
  const semua = tagihan.data ?? [];
  // Wajib ditagih hari ini (aturan-usaha B6) — yang menahan laporan (C6).
  const wajib = semua.filter((p) => wajibDitagihHariIni(p, keadaan.kalender.tanggal));
  const sisa = wajib.filter((p) => !p.hariIni);
  const storting = semua.reduce(
    (n, p) => n + (p.hariIni?.jenis === "angsuran" ? p.hariIni.storting : 0),
    0,
  );

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      <View style={g.tumpuk05}>
        <Text style={gaya.tanggal}>{formatTanggal(keadaan.kalender.tanggal, "panjang")}</Text>
        <Text style={g.judul}>Halo, {s?.pengguna.nama}</Text>
        <Text style={g.teksRedup}>{s?.pengguna.kantor.nama}</Text>
      </View>

      {hariIni.isError ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}
      {gerbang.judul ? <Spanduk judul={gerbang.judul} isi={gerbang.isi} /> : null}
      {gerbang.perluAbsen ? <FormulirAbsen /> : null}

      {keadaan.hari?.absensi === "masuk_kerja" ? (
        <View style={g.baris3}>
          <KotakAngka
            label="Dicatat"
            ikon="check-check"
            nilai={`${wajib.length - sisa.length} / ${wajib.length}`}
          />
          <KotakAngka label="Setoran" ikon="banknote" nilai={rupiah(storting)} />
        </View>
      ) : null}
      {tagihan.isError ? <PesanGalat pesan={tagihan.error.message} /> : null}

      <KakiKerja
        laporanBisa={gerbang.buka}
        sisa={tagihan.data ? sisa.map((p) => p.nasabah.nama) : null}
      />
    </ScrollView>
  );
}
