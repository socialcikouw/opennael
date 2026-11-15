import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

/** Pengganti judul & nominal yang disembunyikan (sama dengan tabungan di kartu tagih). */
const TITIK = "••••";

/**
 * KEPALA NASABAH — kartu identitas di Detail Nasabah:
 *   budi santoso                          [Diblokir]
 *   PULE BARAT
 *   ┌───────────────────────────────────┐
 *   │            Sisa Saldo             │
 *   │           Rp 1.000.000            │
 *   ├───────────────────────────────────┤
 *   │ Tabungan                 Hutang 👁 │   ← disembunyikan: •••• ••••
 *   │ Rp 50.000             Rp 950.000  │   ← disembunyikan: •••• ••••
 *   └───────────────────────────────────┘
 *   Nomor HP · NIK (bila ada)
 * Sisa Saldo selalu tampil. Tabungan & Hutang — judul dan nominalnya — "••••" sampai
 * ikon mata (atau barisnya) diketuk, lalu keduanya terbuka bersama (layar sering terbuka
 * di depan orang lain); keluar dari layar = tersembunyi lagi. Nilai null = belum termuat ("—").
 */
export function KepalaNasabah(props: {
  nama: string;
  kampung: string | null;
  diblokir: boolean;
  sisaSaldo: string | null;
  tabungan: string | null;
  hutang: string | null;
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

      <KotakAngka sisaSaldo={props.sisaSaldo} tabungan={props.tabungan} hutang={props.hutang} />

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

function KotakAngka(props: {
  sisaSaldo: string | null;
  tabungan: string | null;
  hutang: string | null;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const [tampil, setTampil] = useState(false);
  const nilai = (teks: string | null) => (tampil ? (teks ?? "—") : TITIK);
  return (
    <View style={gaya.angka}>
      <View style={gaya.saldo}>
        <Text style={gaya.label}>Sisa Saldo</Text>
        <Text style={gaya.saldoNilai}>{props.sisaSaldo ?? "—"}</Text>
      </View>
      <View style={gaya.pemisah} />
      <Pressable
        onPress={() => setTampil((t) => !t)}
        accessibilityRole="button"
        accessibilityLabel={
          tampil ? "Sembunyikan tabungan dan hutang" : "Tampilkan tabungan dan hutang"
        }
        style={({ pressed }) => [gaya.rahasia, pressed ? gaya.ditekan : null]}
      >
        <View style={gaya.deret}>
          <Text style={gaya.label}>{tampil ? "Tabungan" : TITIK}</Text>
          <View style={gaya.hutangJudul}>
            <Text style={gaya.label}>{tampil ? "Hutang" : TITIK}</Text>
            <Ikon nama={tampil ? "eye" : "eye-off"} ukuran={18} warna={WARNA.redup} />
          </View>
        </View>
        <View style={gaya.deret}>
          <Text style={gaya.nilai}>{nilai(props.tabungan)}</Text>
          <Text style={gaya.nilai}>{nilai(props.hutang)}</Text>
        </View>
      </Pressable>
    </View>
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
    angka: { overflow: "hidden", borderRadius: SUDUT.sedang, backgroundColor: WARNA.abu },
    saldo: {
      alignItems: "center",
      gap: RUANG[0.5],
      paddingVertical: RUANG[3],
      paddingHorizontal: RUANG[4],
    },
    saldoNilai: {
      ...HURUF["2xl"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: -0.4,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    pemisah: { height: 1, backgroundColor: WARNA.garisTegas },
    rahasia: { gap: RUANG[0.5], paddingVertical: RUANG[3], paddingHorizontal: RUANG[4] },
    ditekan: { opacity: 0.6 },
    deret: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    hutangJudul: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    label: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.redup },
    nilai: {
      ...HURUF.base,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    garis: { height: 1, backgroundColor: WARNA.garis },
  });
