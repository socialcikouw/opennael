import { rupiah } from "@opennael/format";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { TombolKeluar } from "@/komponen/keluar";
import { KepalaPeran } from "@/komponen/kepala-peran";
import { PilihTampilan } from "@/komponen/pilih-tampilan";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { type HariKolektor, keadaanHari, useHariKolektor } from "@/lib/setoran";

/** Urutan kerja kasir: siap diterima → di lapangan → sudah diterima → tidak kerja. */
function urutan(h: HariKolektor): number {
  if (h.absensi === "tidak_kerja") return 3;
  if (h.serahTerima) return 2;
  return h.laporanDibukaAt ? 0 : 1;
}

/**
 * SETORAN SORE (kasir) — kolektor hari ini; ketuk untuk mencatat transfer,
 * biaya tak terduga, dan menerima kas (hitung buta).
 */
export default function SetoranSore() {
  const WARNA = useWarna();
  const g = useG();
  const hari = useHariKolektor();
  const daftar = [...(hari.data ?? [])].sort(
    (a, b) => urutan(a) - urutan(b) || a.kolektor.nama.localeCompare(b.kolektor.nama),
  );
  const masukKerja = daftar.filter((h) => h.absensi === "masuk_kerja");
  const siap = masukKerja.filter((h) => h.laporanDibukaAt && !h.serahTerima).length;
  const diterima = masukKerja.filter((h) => h.serahTerima).length;

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      refreshControl={
        <RefreshControl refreshing={hari.isRefetching} onRefresh={() => void hari.refetch()} />
      }
    >
      <KepalaPeran />
      {hari.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      {hari.isError ? (
        <>
          <PesanGalat pesan={hari.error.message} />
          <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void hari.refetch()} />
        </>
      ) : null}
      {hari.data ? (
        <>
          <View style={g.baris3}>
            <KotakAngka label="Siap diterima" ikon="clock" nilai={String(siap)} />
            <KotakAngka
              label="Kas diterima"
              ikon="check-check"
              nilai={`${diterima} / ${masukKerja.length}`}
            />
          </View>
          {daftar.length === 0 ? (
            <Keterangan>Belum ada kolektor yang absen hari ini.</Keterangan>
          ) : null}
          {daftar.map((h) => (
            <BarisKolektor key={h.id} h={h} />
          ))}
        </>
      ) : null}
      <PilihTampilan />
      <TombolKeluar />
    </ScrollView>
  );
}

function BarisKolektor({ h }: { h: HariKolektor }) {
  const WARNA = useWarna();
  const g = useG();
  const k = keadaanHari(h);
  const bisaDibuka = h.absensi === "masuk_kerja";
  return (
    <Pressable
      disabled={!bisaDibuka}
      onPress={() =>
        router.push({ pathname: "/kasir/[kolektorId]", params: { kolektorId: h.kolektor.id } })
      }
      style={({ pressed }) => [g.butirDaftar, g.baris3, pressed ? g.butirDitekan : null]}
    >
      <View style={g.avatar}>
        <Text style={g.avatarHuruf}>{h.kolektor.nama.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={[g.isi, g.tumpuk1]}>
        <Text style={g.teksTebal}>{h.kolektor.nama}</Text>
        <Lencana teks={k.teks} warna={k.warna} />
        {h.absensi === "tidak_kerja" && h.alasanTidakKerja ? (
          <Text style={g.teksKecil}>{h.alasanTidakKerja}</Text>
        ) : null}
      </View>
      {h.serahTerima ? (
        <Text style={g.teksTebal}>{rupiah(h.serahTerima.tunaiDiterima)}</Text>
      ) : null}
      {bisaDibuka ? <Ikon nama="chevron-right" ukuran={18} warna={WARNA.samar} /> : null}
    </Pressable>
  );
}
