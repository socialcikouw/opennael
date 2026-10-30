import { Stack } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useHariKolektor } from "@/fitur/setoran-sore/data";
import { RincianKas } from "@/fitur/setoran-sore/komponen/rincian-kas";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Gulir } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useWarna } from "@/komponen/ui/tampilan";
import { Biaya } from "./komponen/biaya";
import { TerimaKas } from "./komponen/terima-kas";
import { Transfer } from "./komponen/transfer";

/**
 * SATU KOLEKTOR (kasir) — urutan kerja sore: catat transfer & biaya tak
 * terduga, lalu terima kas dengan HITUNG BUTA (angka seharusnya baru tampil
 * sesudah disimpan). Kasir hanya mencatat; pembatalan oleh bos di web.
 */
export function LayarKasKolektor({ kolektorId }: { kolektorId: string }) {
  const WARNA = useWarna();
  const g = useG();
  const hari = useHariKolektor();
  const h = hari.data?.find((x) => x.kolektor.id === kolektorId);

  if (hari.isPending) return <ActivityIndicator style={g.memuat} color={WARNA.utama} />;
  if (!h) {
    return (
      <Gulir>
        <PesanGalat pesan={hari.error?.message ?? "Kolektor ini belum absen hari ini."} />
      </Gulir>
    );
  }
  const terkunci = Boolean(h.serahTerima);

  return (
    <Gulir>
      <Stack.Screen options={{ title: h.kolektor.nama }} />
      {terkunci ? (
        <>
          <Spanduk
            warna="hijau"
            judul="Kas sudah diterima"
            isi="Hari kolektor ini terkunci. Salah catat dibetulkan bos dari web."
          />
          <RincianKas hari={h} />
        </>
      ) : h.laporanDibukaAt ? null : (
        <Spanduk
          judul="Kolektor belum membuka laporan"
          isi="Transfer & biaya boleh dicatat sekarang; kas diterima sesudah ia membuka laporan."
        />
      )}
      <Transfer kolektorId={h.kolektor.id} terkunci={terkunci} />
      <Biaya hari={h} terkunci={terkunci} />
      {h.laporanDibukaAt && !terkunci ? <TerimaKas hari={h} /> : null}
    </Gulir>
  );
}
