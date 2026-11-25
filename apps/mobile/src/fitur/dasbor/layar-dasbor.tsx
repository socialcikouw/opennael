import { kunci } from "@opennael/api-client";
import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { KartuJatuhTempo, MODE } from "@/fitur/tagihan";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Kerangka } from "@/komponen/ui/kerangka";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { useSesi } from "@/lib/sesi";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL } from "@/tema";
import { useDataDasbor } from "./data";
import { KartuPerforma } from "./komponen/kartu-performa";
import { KartuRasio } from "./komponen/kartu-rasio";
import { Portofolio } from "./komponen/portofolio";

/**
 * DASBOR KOLEKTOR — angka kerja sekilas, MENGIKUTI MODE aktif (Harian ·
 * Mingguan · Tempoan · Laporan): bentuk layarnya sama, isinya tidak. Di mode kerja
 * tampil sebagai tab Analitik (paling kanan), di mode Laporan sebagai Dasbor. Rasio bayar
 * hari ini (Tempoan: jatuh tempo), performa tagihan murni, portofolio (saldo
 * berjalan, macet, diputihkan, piutang aktif), dan setoran hari ini — semuanya
 * dari pinjaman jenis mode itu. Pengingat (belum absen, belum dicatat, laporan)
 * satu untuk semua mode dan ada di tab Notifikasi (mode Laporan: di Mutasi);
 * daftar tagih di tab Tagihan. Tanpa pengaturan akun: mode tampilan & keluar hanya di
 * tab Setelan (mode Laporan).
 */
export function LayarDasbor() {
  const s = useSesi();
  const ruangTab = useRuangTab();
  const klien = useQueryClient();
  const {
    mode,
    hariIni,
    tagihan,
    deret,
    portofolioSemua,
    portofolio,
    rasio,
    jatuhTempo,
    performa,
  } = useDataDasbor();
  const aksen = AKSEN;
  const namaMode = MODE[mode].label;

  // Semua bacaan Dasbor berawalan `lapangan`: satu invalidasi menyegarkan semuanya, dan
  // pemutarnya hanya menyala karena ditarik (bukan karena penyegaran di latar).
  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (hariIni.isPending) return <Kerangka jenis="daftar" teks="Memuat dasbor…" />;
  // Layar galat penuh hanya bila keadaan hari ini belum pernah berhasil dimuat; gagal
  // menyegarkan data yang sudah ada cukup spanduk di atas isi.
  const keadaan = hariIni.data;
  if (!keadaan) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  }

  const gagalSegar = hariIni.isError || tagihan.isError;
  const dicatat = rasio ? rasio.bayar + rasio.libur : 0;
  const wajibTotal = rasio ? dicatat + rasio.sisa : 0;
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      <View style={g.tumpuk05}>
        <View style={gaya.barisTanggal}>
          <Text style={[gaya.tanggal, { color: aksen.teks }]}>
            {formatTanggal(keadaan.kalender.tanggal, "panjang")}
          </Text>
          <View
            style={[gaya.lencanaMode, { backgroundColor: aksen.lembut }]}
            accessible
            accessibilityLabel={`Mode ${namaMode}`}
          >
            <Text style={[gaya.lencanaModeTeks, { color: aksen.teks }]}>{namaMode}</Text>
          </View>
        </View>
        <Text style={g.judul}>Halo, {s?.pengguna.nama}</Text>
        <Text style={g.teksRedup}>{s?.pengguna.kantor.nama}</Text>
      </View>

      {gagalSegar ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}

      {mode === "tempoan" ? (
        // Tempoan tak ditagih setiap hari: jatuh tempo menggantikan rasio bayar (seperti di Tagihan).
        jatuhTempo ? (
          <KartuJatuhTempo r={jatuhTempo} aksen={aksen} />
        ) : null
      ) : (
        <KartuRasio
          r={rasio}
          gagal={tagihan.isError && !tagihan.data}
          aksen={aksen}
          // Mode Laporan tak punya tab Notifikasi: buka laporan dari Mutasi.
          onLaporan={() =>
            router.navigate(mode === "laporan" ? "/kolektor/mutasi" : "/kolektor/notifikasi")
          }
        />
      )}
      <KartuPerforma
        p={performa}
        gagal={deret.isError && !deret.data}
        jenis={mode === "laporan" ? "semua jenis" : `pinjaman ${namaMode.toLowerCase()}`}
        aksen={aksen}
      />

      <View style={g.bagian}>
        <Text style={g.judulBagian}>PORTOFOLIO · {namaMode.toUpperCase()}</Text>
        <Portofolio data={portofolio} gagal={portofolioSemua.isError && !portofolioSemua.data} />
      </View>

      {keadaan.hari?.absensi === "masuk_kerja" && rasio ? (
        <View style={g.bagian}>
          <Text style={g.judulBagian}>HARI INI · {namaMode.toUpperCase()}</Text>
          <View style={g.baris3}>
            <KotakAngka
              label="Dicatat"
              ikon="check-check"
              nilai={wajibTotal > 0 ? `${dicatat} / ${wajibTotal}` : "—"}
            />
            <KotakAngka label="Setoran" ikon="banknote" nilai={rupiah(rasio.setoran)} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  barisTanggal: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang },
  lencanaMode: { paddingHorizontal: RUANG[2.5], paddingVertical: 2, borderRadius: SUDUT.bulat },
  lencanaModeTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal },
});
