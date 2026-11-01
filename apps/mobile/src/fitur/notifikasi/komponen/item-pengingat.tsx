import { judul, tampilKampung, tampilNama } from "@opennael/format";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MODE, modeAktif, useMode } from "@/fitur/tagihan";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import type { Pengingat } from "../inti/pengingat";
import { FormulirAbsen } from "./formulir-absen";

/** Banyaknya nasabah yang tampil sebelum "Lihat semua". */
const RINGKAS = 5;

const IKON: Record<Pengingat["jenis"], NamaIkon> = {
  absen: "clock",
  gerbang: "calendar",
  belum: "users-round",
  "tempo-besok": "calendar",
  "tanpa-nasabah": "user-plus",
  "mutasi-siap": "circle-check",
  laporan: "file-text",
  "kas-diterima": "banknote",
};

/**
 * Satu pemberitahuan: judul jelas ("Nasabah harian yang belum ditagih: 5"),
 * penjelasan, daftar nasabahnya (nama, kampung, nominal), dan tindakannya —
 * formulir absen, "Tagih di mode …" (pindah mode lalu ke Tagihan), atau "Buka
 * Mutasi kas" (pindah ke mode Semua). `tanpaMutasi` menyembunyikan tombol
 * Mutasi (dipakai di layar Mutasi sendiri).
 */
export function ItemPengingat({ p, tanpaMutasi = false }: { p: Pengingat; tanpaMutasi?: boolean }) {
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  const mode = useMode();
  const [semua, setSemua] = useState(false);
  const nada = {
    kuning: { latar: WARNA.waspadaLembut, garis: WARNA.waspadaGaris, ikon: WARNA.waspada },
    merah: { latar: WARNA.bahayaLembut, garis: WARNA.bahayaGaris, ikon: WARNA.bahaya },
    hijau: { latar: WARNA.utamaLembut, garis: WARNA.utamaGaris, ikon: WARNA.utama },
  }[p.nada];
  const tampil = semua ? p.nasabah : p.nasabah.slice(0, RINGKAS);
  const sisa = p.nasabah.length - tampil.length;

  const keTagihan = () => {
    if (p.jenisPinjaman) modeAktif.ganti(p.jenisPinjaman);
    router.navigate("/kolektor/tagihan");
  };
  const keMutasi = () => {
    modeAktif.ganti("semua");
    router.navigate("/kolektor/mutasi");
  };

  return (
    <View style={gaya.wadah}>
      <View style={[gaya.kartu, { backgroundColor: nada.latar, borderColor: nada.garis }]}>
        <View style={gaya.kepala}>
          <Ikon nama={IKON[p.jenis]} ukuran={20} warna={nada.ikon} />
          <View style={gaya.teks}>
            <Text style={gaya.judul}>{judul(p.judul)}</Text>
            {p.isi ? <Text style={gaya.isi}>{p.isi}</Text> : null}
          </View>
        </View>

        {tampil.length > 0 ? (
          <View style={gaya.daftar}>
            {tampil.map((n, i) => (
              <View key={n.id} style={[gaya.baris, i > 0 ? gaya.garisAtas : null]}>
                <View style={gaya.teks}>
                  <Text style={gaya.nama} numberOfLines={1}>
                    {tampilNama(n.nama)}
                  </Text>
                  <Text style={gaya.kampung} numberOfLines={1}>
                    {tampilKampung(n.kampung)}
                  </Text>
                </View>
                <Text style={gaya.keterangan} numberOfLines={1}>
                  {n.keterangan}
                </Text>
              </View>
            ))}
            {sisa > 0 || semua ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSemua((s) => !s)}
                style={[gaya.lihat, gaya.garisAtas]}
              >
                <Text style={gaya.lihatTeks}>
                  {semua ? "Ringkas" : `Lihat semua (${p.nasabah.length})`}
                </Text>
                <Ikon
                  nama={semua ? "chevron-up" : "chevron-down"}
                  ukuran={16}
                  warna={WARNA.redup}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {p.jenis === "absen" ? <FormulirAbsen /> : null}
      {p.jenis === "belum" && p.jenisPinjaman ? (
        <TombolMode jenis={p.jenisPinjaman} aktif={mode === p.jenisPinjaman} onPress={keTagihan} />
      ) : null}
      {p.jenis === "mutasi-siap" && !tanpaMutasi ? (
        <Tombol judul="Buka Mutasi kas" ikon="arrow-left-right" onPress={keMutasi} />
      ) : null}
    </View>
  );
}

/** "Tagih di mode Harian" (pindah mode) atau "Buka Tagihan" (sudah di mode itu), warna mode jenisnya. */
function TombolMode(props: {
  jenis: NonNullable<Pengingat["jenisPinjaman"]>;
  aktif: boolean;
  onPress: () => void;
}) {
  const gaya = useGaya(buatGaya);
  const w = useWarnaMode(props.jenis);
  const judul = props.aktif ? "Buka Tagihan" : `Tagih di mode ${MODE[props.jenis].label}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={judul}
      onPress={props.onPress}
      style={({ pressed }) => [
        gaya.tombolMode,
        { backgroundColor: w.isi },
        pressed ? gaya.ditekan : null,
      ]}
    >
      <Text style={[gaya.tombolModeHuruf, { color: w.teksIsi, borderColor: w.teksIsi }]}>
        {MODE[props.jenis].huruf}
      </Text>
      <Text style={[gaya.tombolModeTeks, { color: w.teksIsi }]}>{judul}</Text>
      <Ikon nama="chevron-right" ukuran={18} warna={w.teksIsi} />
    </Pressable>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    wadah: { gap: RUANG[3] },
    kartu: { gap: RUANG[3], borderRadius: SUDUT.besar, borderWidth: 1, padding: RUANG[4] },
    kepala: { flexDirection: "row", alignItems: "flex-start", gap: RUANG[3] },
    teks: { flex: 1, gap: RUANG[0.5] },
    judul: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
    isi: { ...HURUF.sm, color: WARNA.teksLabel },
    daftar: {
      borderRadius: SUDUT.sedang,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
      paddingHorizontal: RUANG[3],
    },
    baris: { flexDirection: "row", alignItems: "center", gap: RUANG[3], paddingVertical: RUANG[2] },
    garisAtas: { borderTopWidth: 1, borderTopColor: WARNA.garis },
    nama: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teks },
    kampung: { ...HURUF.xs, color: WARNA.redup },
    keterangan: {
      ...HURUF.sm,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    lihat: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1],
      paddingVertical: RUANG[2],
    },
    lihatTeks: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.redup },
    tombolMode: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[3],
      borderRadius: SUDUT.besar,
      paddingHorizontal: RUANG[4],
    },
    tombolModeHuruf: {
      ...HURUF.sm,
      width: 28,
      height: 28,
      lineHeight: 26,
      textAlign: "center",
      fontWeight: TEBAL.ekstra,
      borderWidth: 1.5,
      borderRadius: SUDUT.bulat,
    },
    tombolModeTeks: { ...HURUF.base, flex: 1, fontWeight: TEBAL.semi },
    ditekan: { opacity: 0.8 },
  });
