import { rupiah, tampilNama } from "@opennael/format";
import { type Href, router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { KepalaPeran, TombolKeluar } from "@/fitur/akun";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Lencana } from "@/komponen/ui/lencana";
import { Tekan } from "@/komponen/ui/tekan";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { WARNA } from "@/tema";
import { type HariKolektor, useHariKolektor } from "./data";
import { keadaanHari } from "./inti";
import { RincianKas } from "./komponen/rincian-kas";

/**
 * BERANDA PENGAWAS — pemeriksa: mencocokkan kas kantor (hitung buta), melihat
 * pinjaman yang menunggak, dan membaca setoran sore hari ini.
 */
export function LayarPengawas() {
  const hari = useHariKolektor();
  const { refetch } = hari;
  const segarkan = useCallback(() => refetch(), [refetch]);
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      <KepalaPeran />
      <Menu
        ikon="calculator"
        judul="Cocokkan Kas"
        isi="Hitung isi brankas atau periksa saldo rekening, lalu bandingkan dengan buku."
        ke="/pengawas/cocokkan"
      />
      <Menu
        ikon="circle-alert"
        judul="Pinjaman Menunggak"
        isi="Nasabah yang tertinggal angsuran, per kolektor."
        ke="/pengawas/tunggakan"
      />

      <View style={g.bagian}>
        <Text style={g.judulBagian}>SETORAN SORE HARI INI</Text>
        {hari.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
        <PesanGalat pesan={hari.error?.message} />
        {hari.data && hari.data.length === 0 ? (
          <KotakKosong
            ikon="users"
            judul="Belum ada yang absen"
            isi="Kolektor yang sudah absen hari ini akan muncul di sini."
          />
        ) : null}
        {hari.data?.map((h) => (
          <BarisHari key={h.id} h={h} />
        ))}
      </View>
      <TombolKeluar />
    </ScrollView>
  );
}

function Menu(props: { ikon: NamaIkon; judul: string; isi: string; ke: Href }) {
  return (
    <Tekan
      onPress={() => router.push(props.ke)}
      style={({ pressed }) => [g.butirDaftar, g.baris3, pressed ? g.butirDitekan : null]}
    >
      <Ikon nama={props.ikon} ukuran={24} warna={WARNA.utama} />
      <View style={[g.isi, g.tumpuk05]}>
        <Text style={g.teksTebal}>{props.judul}</Text>
        <Text style={g.teksKecil}>{props.isi}</Text>
      </View>
      <Ikon nama="chevron-right" ukuran={18} warna={WARNA.samar} />
    </Tekan>
  );
}

/** Satu kolektor hari ini; yang kasnya sudah diterima bisa dibuka rinciannya. */
function BarisHari({ h }: { h: HariKolektor }) {
  const [buka, setBuka] = useState(false);
  const k = keadaanHari(h);
  return (
    <View style={g.tumpuk2}>
      <Tekan
        disabled={!h.serahTerima}
        onPress={() => setBuka(!buka)}
        style={({ pressed }) => [g.butirDaftar, g.baris3, pressed ? g.butirDitekan : null]}
      >
        <View style={[g.isi, g.tumpuk1]}>
          <Text style={g.teksTebal}>{tampilNama(h.kolektor.nama)}</Text>
          <Lencana teks={k.teks} warna={k.warna} />
        </View>
        {h.serahTerima ? (
          <>
            <Text
              style={[
                g.teksTebal,
                h.serahTerima.selisihSetor < 0 ? { color: WARNA.bahayaTeks } : null,
              ]}
            >
              {rupiah(h.serahTerima.selisihSetor)}
            </Text>
            <Ikon nama={buka ? "chevron-up" : "chevron-down"} ukuran={18} warna={WARNA.samar} />
          </>
        ) : null}
      </Tekan>
      {buka ? <RincianKas hari={h} /> : null}
    </View>
  );
}
