import type { KartuPinjaman } from "@opennael/contracts";
import {
  LABEL_JENIS,
  LABEL_STATUS_PINJAMAN,
  namaTenor,
  rupiah,
  tanggalPendek,
} from "@opennael/format";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useWarna } from "@/komponen/ui/tampilan";
import { pinjamanAktif } from "../inti/nasabah";

const WARNA_STATUS = {
  berjalan: "hijau",
  macet: "merah",
  lunas: "abu",
  digulung: "abu",
  batal: "abu",
  diputihkan: "kuning",
} as const;

/**
 * Satu pinjaman di detail nasabah: nomor, status, jenis & tenor, akad, lalu
 * saldo (aktif) atau pokok (selesai). Yang aktif bisa diketuk — membuka
 * rincian pinjamannya (hanya baca); yang selesai tak ada di daftar tagih.
 */
export function BarisPinjaman({ p }: { p: KartuPinjaman }) {
  const g = useG();
  const WARNA = useWarna();
  const aktif = pinjamanAktif(p);
  const isi = (
    <Kartu>
      <View style={g.baris1}>
        <View style={[g.tumpuk05, { flex: 1 }]}>
          <View style={g.bungkus}>
            <Text style={g.teksTebal}>Pinjaman Ke-{p.pinjamanKe}</Text>
            <Lencana teks={LABEL_STATUS_PINJAMAN[p.status]} warna={WARNA_STATUS[p.status]} />
          </View>
          <Text style={g.teksKecil}>
            {LABEL_JENIS[p.jenis]} {namaTenor(p.jenis, p.tenor)} · akad{" "}
            {tanggalPendek(p.tanggalAkad)}
          </Text>
          <Text style={g.teksKecil}>
            {aktif
              ? `Saldo ${rupiah(p.saldo)} · angsuran ke-${p.angsuranKe}`
              : `Pokok ${rupiah(p.pokok)}${p.tanggalSelesai ? ` · selesai ${tanggalPendek(p.tanggalSelesai)}` : ""}`}
          </Text>
        </View>
        {aktif ? <Ikon nama="chevron-right" ukuran={18} warna={WARNA.redup} /> : null}
      </View>
    </Kartu>
  );
  if (!aktif) return isi;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Buka rincian pinjaman"
      onPress={() =>
        router.push({ pathname: "/kolektor/pinjaman/[id]", params: { id: p.id, lihat: "1" } })
      }
      style={({ pressed }) => (pressed ? g.ditekan : null)}
    >
      {isi}
    </Pressable>
  );
}
