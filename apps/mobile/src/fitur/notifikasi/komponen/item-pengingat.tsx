import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Spanduk } from "@/komponen/ui/spanduk";
import { RUANG } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import type { Pengingat } from "../inti/pengingat";
import { AksiLaporan } from "./aksi-laporan";
import { FormulirAbsen } from "./formulir-absen";

/**
 * Satu pengingat beserta tindakannya (formulir absen, lihat yang belum, buka
 * laporan). `tautanTagihan` = tombol "Lihat yang belum" ke tab Tagihan — mati
 * di mode Semua (tab Tagihan tak ada di sana).
 */
export function ItemPengingat({
  p,
  jumlahBelum,
  tautanTagihan = true,
}: {
  p: Pengingat;
  jumlahBelum: number;
  tautanTagihan?: boolean;
}) {
  return (
    <View style={gaya.item}>
      <Spanduk
        judul={p.judul}
        isi={p.isi ?? undefined}
        warna={p.jenis === "laporan" ? "hijau" : "kuning"}
      />
      {p.jenis === "absen" ? <FormulirAbsen /> : null}
      {p.jenis === "belum" && tautanTagihan ? (
        <Tombol
          judul={`Lihat yang belum (${jumlahBelum})`}
          ikon="users"
          onPress={() => router.navigate("/kolektor/tagihan")}
        />
      ) : null}
      {p.jenis === "laporan" ? <AksiLaporan /> : null}
    </View>
  );
}

const gaya = StyleSheet.create({
  item: { gap: RUANG[3] },
});
