import type { KartuPinjaman } from "@opennael/contracts";
import {
  LABEL_JENIS,
  LABEL_STATUS_PINJAMAN,
  namaTenor,
  rupiah,
  tanggalPendek,
} from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { useZonaKantor } from "@/lib/kantor";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/tema";
import { pinjamanAktif, teksAkad } from "../inti/nasabah";

const WARNA_STATUS = {
  berjalan: "hijau",
  macet: "merah",
  lunas: "abu",
  digulung: "abu",
  batal: "abu",
  diputihkan: "kuning",
} as const;

/**
 * Satu pinjaman di Detail Nasabah — rinciannya LENGKAP di sini (tak ada layar rincian
 * lagi dari daftar ini). Kepala dua baris:
 *   Pinjaman Ke-3                       [Berjalan]
 *   Harian 24×            Akad: 27 Okt 26 14.00
 * Pinjaman aktif memuat sisa saldo besar dan kemajuan angsuran; semuanya memuat pokok,
 * total kembali, angsuran, jatuh tempo (atau tanggal selesai), pencairan, dan
 * masuk tabungan.
 */
export function BarisPinjaman({ p }: { p: KartuPinjaman }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const zona = useZonaKantor();
  const aktif = pinjamanAktif(p);
  const tempoan = p.jenis === "tempoan";
  const macet = p.status === "macet";
  const kemajuan = p.tenor > 0 ? Math.min(1, Math.max(0, p.angsuranKe / p.tenor)) : 0;

  const fakta: { label: string; nilai: string }[] = [
    { label: "Pokok", nilai: rupiah(p.pokok) },
    { label: "Total Kembali", nilai: rupiah(p.totalKembali) },
    { label: tempoan ? "Dibayar Sekali" : "Angsuran", nilai: rupiah(p.angsuran) },
    ...(aktif
      ? p.jatuhTempo
        ? [{ label: "Jatuh Tempo", nilai: tanggalPendek(p.jatuhTempo) }]
        : []
      : p.tanggalSelesai
        ? [{ label: "Selesai", nilai: tanggalPendek(p.tanggalSelesai) }]
        : []),
    { label: "Pencairan", nilai: rupiah(p.pencairan) },
    { label: "Masuk Tabungan", nilai: rupiah(p.tabunganMasuk) },
  ];

  return (
    <Kartu>
      <View style={gaya.judul}>
        <View style={gaya.deret}>
          <Text style={gaya.nomor}>Pinjaman Ke-{p.pinjamanKe}</Text>
          <Lencana teks={LABEL_STATUS_PINJAMAN[p.status]} warna={WARNA_STATUS[p.status]} />
        </View>
        <View style={gaya.deret}>
          <Text style={gaya.sub}>
            {LABEL_JENIS[p.jenis]} {namaTenor(p.jenis, p.tenor)}
          </Text>
          <Text style={gaya.akad}>{teksAkad(p.tanggalAkad, p.waktuAkad, zona)}</Text>
        </View>
      </View>

      {aktif ? (
        <>
          <View style={gaya.saldo}>
            <Text style={gaya.label}>Sisa Saldo</Text>
            <Text style={[gaya.saldoNilai, macet ? { color: WARNA.bahayaTeks } : null]}>
              {rupiah(p.saldo)}
            </Text>
          </View>

          {tempoan ? null : (
            <View style={gaya.kemajuan}>
              <View style={gaya.kemajuanTeks}>
                <Text style={gaya.label}>
                  Angsuran ke-{p.angsuranKe} dari {p.tenor}
                </Text>
                <Text style={gaya.label}>{Math.round(kemajuan * 100)}%</Text>
              </View>
              <View style={gaya.jalur}>
                <View
                  style={[
                    gaya.isiJalur,
                    {
                      width: `${kemajuan * 100}%`,
                      backgroundColor: macet ? WARNA.bahayaBingkai : WARNA.utamaIsi,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </>
      ) : null}

      <View style={gaya.garis} />
      <View style={gaya.fakta}>
        {fakta.map((f) => (
          <View key={f.label} style={gaya.faktaButir}>
            <Text style={gaya.label}>{f.label}</Text>
            <Text style={gaya.faktaNilai}>{f.nilai}</Text>
          </View>
        ))}
      </View>
    </Kartu>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    judul: { gap: RUANG[1] },
    // Kiri & kanan selebar baris: nomor | status, lalu jenis & tenor | waktu akad.
    deret: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: RUANG[2],
    },
    nomor: { ...HURUF.lg, flexShrink: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    sub: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
    akad: { ...HURUF.sm, color: WARNA.redup, fontVariant: ["tabular-nums"] },
    label: { ...HURUF.xs, fontWeight: TEBAL.sedang, color: WARNA.redup },
    saldo: { gap: RUANG[0.5] },
    saldoNilai: {
      ...HURUF["2xl"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: -0.4,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    kemajuan: { gap: RUANG[1.5] },
    kemajuanTeks: { flexDirection: "row", justifyContent: "space-between" },
    jalur: {
      height: 6,
      overflow: "hidden",
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abuTua,
    },
    isiJalur: { height: 6, borderRadius: SUDUT.bulat },
    garis: { height: 1, backgroundColor: WARNA.garis },
    fakta: { flexDirection: "row", flexWrap: "wrap", rowGap: RUANG[3], columnGap: RUANG[4] },
    faktaButir: { flexGrow: 1, flexBasis: "40%", gap: RUANG[0.5] },
    faktaNilai: {
      ...HURUF.sm,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
  });
