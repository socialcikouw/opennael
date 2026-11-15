import { tampilNama } from "@opennael/format";
import { Stack } from "expo-router";
import { PesanGalat } from "@/komponen/ui/isian";
import { Kerangka } from "@/komponen/ui/kerangka";
import { Gulir } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useHariKolektor } from "./data";
import { Biaya } from "./komponen/biaya";
import { RincianKas } from "./komponen/rincian-kas";
import { TerimaKas } from "./komponen/terima-kas";
import { Transfer } from "./komponen/transfer";

/**
 * SATU KOLEKTOR (kasir) — urutan kerja sore: catat transfer & biaya tak
 * terduga, lalu terima kas dengan HITUNG BUTA (angka seharusnya baru tampil
 * sesudah disimpan). Kasir hanya mencatat; pembatalan oleh bos di web.
 */
export function LayarKasKolektor({ kolektorId }: { kolektorId: string }) {
  const hari = useHariKolektor();
  const h = hari.data?.find((x) => x.kolektor.id === kolektorId);

  if (hari.isPending) return <Kerangka jenis="daftar" teks="Memuat setoran sore…" />;
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
      <Stack.Screen options={{ title: tampilNama(h.kolektor.nama) }} />
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
