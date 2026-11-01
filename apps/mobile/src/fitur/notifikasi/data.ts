import { jam } from "@opennael/format";
import { useMemo } from "react";
import {
  bacaGerbang,
  useGerbangMutasi,
  useHariIni,
  useKasHariIni,
  useTagihan,
} from "@/fitur/lapangan";
import { useZonaKantor } from "@/lib/kantor";
import { jumlahTindakan, susunPengingat } from "./inti/pengingat";

/**
 * Pengingat kolektor dari bacaan lapangan yang SUDAH dimuat layar lain (hari
 * ini, daftar tagih, hari kas — cache yang sama). SATU untuk ketiga mode kerja:
 * tak membaca mode, jadi isi & angka lonceng sama di Harian, Mingguan, Tempoan.
 * `pengingat` null selama keadaan hari ini belum ada.
 */
export function usePengingat() {
  const hariIni = useHariIni();
  const tagihan = useTagihan();
  const kas = useKasHariIni();
  const zona = useZonaKantor();
  const { gerbang: gerbangMutasi } = useGerbangMutasi();
  const keadaan = hariIni.data;
  const pinjaman = tagihan.data;
  const hari = kas.data;
  const pengingat = useMemo(() => {
    if (!keadaan) return null;
    const dibuka = keadaan.hari?.laporanDibukaAt ?? null;
    const st = hari?.serahTerima ?? null;
    return susunPengingat({
      gerbang: bacaGerbang(keadaan),
      tanggal: keadaan.kalender.tanggal,
      pinjaman: pinjaman ?? null,
      gerbangMutasi,
      laporanJam: dibuka ? jam(dibuka, zona) : null,
      tunaiSeharusnya: st?.tunaiSeharusnya ?? hari?.rincian?.tunaiSeharusnya ?? null,
      serahTerima: st ? { tunaiDiterima: st.tunaiDiterima, selisihSetor: st.selisihSetor } : null,
    });
  }, [keadaan, pinjaman, hari, gerbangMutasi, zona]);
  return { hariIni, tagihan, kas, pengingat };
}

/** Angka lonceng: pengingat yang menunggu tindakan — sama di semua mode kerja. */
export function useJumlahPengingat(): number {
  const { pengingat } = usePengingat();
  return pengingat ? jumlahTindakan(pengingat) : 0;
}
