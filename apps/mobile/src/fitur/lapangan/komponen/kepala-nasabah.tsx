import { StyleSheet, Text, View } from "react-native";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useGaya } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { TabunganRahasia } from "./tabungan-rahasia";

/**
 * KEPALA NASABAH — kartu identitas di Detail Nasabah:
 *   budi santoso                       [Diblokir]
 *   PULE BARAT
 *   Tabungan  ••••   │   Sisa Pinjaman  Rp 1.250.000
 *   ──────────────────────────────────────────────
 *   Nomor HP · NIK (bila ada)
 * Tabungan rahasia sampai diketuk (layar sering terbuka di depan orang lain).
 * `saldoPinjaman` null = belum termuat ("—").
 */
export function KepalaNasabah(props: {
  nama: string;
  kampung: string | null;
  diblokir: boolean;
  tabungan: string | null;
  saldoPinjaman: string | null;
  nomorHp: string | null;
  nik: string | null;
}) {
  const gaya = useGaya(buatGaya);
  const adaKontak = props.nomorHp !== null || props.nik !== null;
  return (
    <Kartu>
      <View style={gaya.judul}>
        <Text style={gaya.nama} numberOfLines={2}>
          {props.nama}
        </Text>
        {props.diblokir ? <Lencana teks="Diblokir" warna="merah" /> : null}
      </View>
      {props.kampung ? <Text style={gaya.kampung}>{props.kampung}</Text> : null}

      <View style={gaya.angka}>
        {props.tabungan !== null ? (
          <View style={gaya.kolom}>
            <Text style={gaya.label}>Tabungan</Text>
            <TabunganRahasia nilai={props.tabungan} besar />
          </View>
        ) : null}
        {props.tabungan !== null ? <View style={gaya.pemisah} /> : null}
        <View style={gaya.kolom}>
          <Text style={gaya.label}>Sisa Pinjaman</Text>
          <Text style={gaya.nilai}>{props.saldoPinjaman ?? "—"}</Text>
        </View>
      </View>

      {adaKontak ? (
        <>
          <View style={gaya.garis} />
          {props.nomorHp ? <Baris label="Nomor HP" nilai={props.nomorHp} /> : null}
          {props.nik ? <Baris label="NIK" nilai={props.nik} /> : null}
        </>
      ) : null}
    </Kartu>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    judul: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    nama: {
      ...HURUF.xl,
      flexShrink: 1,
      fontWeight: TEBAL.tebal,
      letterSpacing: -0.2,
      color: WARNA.teks,
    },
    // Seperti judul kelompok di daftar tagih: kampung HURUF BESAR berjarak huruf.
    kampung: {
      ...HURUF.xs,
      marginTop: -RUANG[2],
      fontWeight: TEBAL.tebal,
      letterSpacing: 0.6,
      color: WARNA.redup,
    },
    angka: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: RUANG[4],
      paddingVertical: RUANG[3],
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.sedang,
      backgroundColor: WARNA.abu,
    },
    kolom: { flex: 1, gap: RUANG[0.5] },
    pemisah: { width: 1, backgroundColor: WARNA.garisTegas },
    label: { ...HURUF.xs, fontWeight: TEBAL.sedang, color: WARNA.redup },
    nilai: {
      ...HURUF.base,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    garis: { height: 1, backgroundColor: WARNA.garis },
  });
