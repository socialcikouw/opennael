import type { KartuPinjaman } from "@opennael/contracts";
import {
  LABEL_JENIS,
  LABEL_STATUS_PINJAMAN,
  namaTenor,
  rupiah,
  tanggalPendek,
} from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
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
 * Satu pinjaman di Detail Nasabah — rinciannya LENGKAP di sini (tak ada layar rincian
 * lagi dari daftar ini): nomor, status, jenis & tenor, akad; pinjaman aktif memuat sisa
 * saldo besar, kemajuan angsuran, dan tunggakan; semuanya memuat pokok, total kembali,
 * angsuran, jatuh tempo (atau tanggal selesai), tunai yang diterima, dan masuk tabungan.
 */
export function BarisPinjaman({ p }: { p: KartuPinjaman }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const aktif = pinjamanAktif(p);
  const tempoan = p.jenis === "tempoan";
  const macet = p.status === "macet";
  const tunggakan = p.tagih && p.tagih.tunggakan > 0 ? p.tagih : null;
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
    { label: "Tunai Diterima", nilai: rupiah(p.pencairan) },
    { label: "Masuk Tabungan", nilai: rupiah(p.tabunganMasuk) },
  ];

  return (
    <Kartu>
      <View style={gaya.judul}>
        <View style={gaya.judulIsi}>
          <Text style={gaya.nomor}>Pinjaman Ke-{p.pinjamanKe}</Text>
          <Text style={gaya.sub}>
            {LABEL_JENIS[p.jenis]} · {namaTenor(p.jenis, p.tenor)} · akad{" "}
            {tanggalPendek(p.tanggalAkad)}
          </Text>
        </View>
        <Lencana teks={LABEL_STATUS_PINJAMAN[p.status]} warna={WARNA_STATUS[p.status]} />
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

          {tunggakan ? (
            <View style={gaya.tunggakan}>
              <Ikon nama="triangle-alert" ukuran={14} warna={WARNA.bahayaTeks} />
              <Text style={gaya.tunggakanTeks}>
                {tempoan
                  ? `Lewat jatuh tempo · tunggakan ${rupiah(tunggakan.tunggakan)}`
                  : `Tertinggal ${tunggakan.tertinggal} angsuran · tunggakan ${rupiah(tunggakan.tunggakan)}`}
              </Text>
            </View>
          ) : null}
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
    judul: { flexDirection: "row", alignItems: "flex-start", gap: RUANG[2] },
    judulIsi: { flex: 1, gap: RUANG[0.5] },
    nomor: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.teks },
    sub: { ...HURUF.sm, color: WARNA.teksKedua },
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
    tunggakan: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
      paddingVertical: RUANG[2],
      paddingHorizontal: RUANG[3],
      borderRadius: SUDUT.sedang,
      borderWidth: 1,
      borderColor: WARNA.bahayaGaris,
      backgroundColor: WARNA.bahayaLembut,
    },
    tunggakanTeks: { ...HURUF.sm, flex: 1, fontWeight: TEBAL.semi, color: WARNA.bahayaTeks },
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
