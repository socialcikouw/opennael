import { rupiah } from "@opennael/format";
import { type Href, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { TombolKeluar } from "@/komponen/keluar";
import { KepalaPeran } from "@/komponen/kepala-peran";
import { PilihTampilan } from "@/komponen/pilih-tampilan";
import { RincianKas } from "@/komponen/rincian-kas";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Lencana } from "@/komponen/ui/lencana";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { type HariKolektor, keadaanHari, useHariKolektor } from "@/lib/setoran";

/**
 * BERANDA PENGAWAS — pemeriksa: mencocokkan kas kantor (hitung buta), melihat
 * pinjaman yang menunggak, dan membaca setoran sore hari ini.
 */
export default function BerandaPengawas() {
  const WARNA = useWarna();
  const g = useG();
  const hari = useHariKolektor();
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      refreshControl={
        <RefreshControl refreshing={hari.isRefetching} onRefresh={() => void hari.refetch()} />
      }
    >
      <KepalaPeran />
      <Menu
        ikon="calculator"
        judul="Cocokkan kas"
        isi="Hitung isi brankas atau periksa saldo rekening, lalu bandingkan dengan buku."
        ke="/pengawas/cocokkan"
      />
      <Menu
        ikon="circle-alert"
        judul="Pinjaman menunggak"
        isi="Nasabah yang tertinggal angsuran, per kolektor."
        ke="/pengawas/tunggakan"
      />

      <Text style={g.subjudul}>Setoran sore hari ini</Text>
      {hari.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={hari.error?.message} />
      {hari.data && hari.data.length === 0 ? (
        <Keterangan>Belum ada kolektor yang absen hari ini.</Keterangan>
      ) : null}
      {hari.data?.map((h) => (
        <BarisHari key={h.id} h={h} />
      ))}
      <PilihTampilan />
      <TombolKeluar />
    </ScrollView>
  );
}

function Menu(props: { ikon: NamaIkon; judul: string; isi: string; ke: Href }) {
  const WARNA = useWarna();
  const g = useG();
  return (
    <Pressable
      onPress={() => router.push(props.ke)}
      style={({ pressed }) => [g.butirDaftar, g.baris3, pressed ? g.butirDitekan : null]}
    >
      <Ikon nama={props.ikon} ukuran={24} warna={WARNA.utama} />
      <View style={[g.isi, g.tumpuk05]}>
        <Text style={g.teksTebal}>{props.judul}</Text>
        <Text style={g.teksKecil}>{props.isi}</Text>
      </View>
      <Ikon nama="chevron-right" ukuran={18} warna={WARNA.samar} />
    </Pressable>
  );
}

/** Satu kolektor hari ini; yang kasnya sudah diterima bisa dibuka rinciannya. */
function BarisHari({ h }: { h: HariKolektor }) {
  const WARNA = useWarna();
  const g = useG();
  const [buka, setBuka] = useState(false);
  const k = keadaanHari(h);
  return (
    <View style={g.tumpuk2}>
      <Pressable
        disabled={!h.serahTerima}
        onPress={() => setBuka(!buka)}
        style={({ pressed }) => [g.butirDaftar, g.baris3, pressed ? g.butirDitekan : null]}
      >
        <View style={[g.isi, g.tumpuk1]}>
          <Text style={g.teksTebal}>{h.kolektor.nama}</Text>
          <Lencana teks={k.teks} warna={k.warna} />
        </View>
        {h.serahTerima ? (
          <>
            <Text
              style={[g.teksTebal, h.serahTerima.selisihSetor < 0 ? { color: WARNA.bahaya } : null]}
            >
              {rupiah(h.serahTerima.selisihSetor)}
            </Text>
            <Ikon nama={buka ? "chevron-up" : "chevron-down"} ukuran={18} warna={WARNA.samar} />
          </>
        ) : null}
      </Pressable>
      {buka ? <RincianKas hari={h} /> : null}
    </View>
  );
}
