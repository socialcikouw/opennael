import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LembarBawah } from "@/komponen/lembar-bawah";
import { Isian } from "@/komponen/ui/isian";
import { useGaya } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import type { KartuVM } from "../inti/kartu";

/** Alasan yang paling sering — sekali ketuk mengisi kolom alasan. */
const ALASAN_CEPAT = ["Belum ada uang", "Tidak di rumah", "Sakit", "Minta waktu"];

/**
 * LIBUR BERALASAN — tempoan yang sudah jatuh tempo tetapi belum bisa melunasi
 * (aturan-usaha G1): libur dicatat dengan alasan wajib, supaya tidak lagi
 * menahan Mutasi kas & laporan hari ini. Jatuh tempo tidak bergeser.
 */
export function LembarAlasanLibur(props: {
  vm: KartuVM | null;
  onTutup: () => void;
  onKirim: (alasan: string) => void;
}) {
  const gaya = useGaya(buatGaya);
  const [alasan, setAlasan] = useState("");
  const id = props.vm?.id;
  // Kartu lain = kolom alasan kosong lagi.
  useEffect(() => {
    if (id) setAlasan("");
  }, [id]);
  const isi = alasan.trim();

  return (
    <LembarBawah
      terbuka={props.vm !== null}
      onTutup={props.onTutup}
      judul={props.vm ? `Libur — ${props.vm.namaTampil}` : "Libur"}
    >
      <View style={gaya.isi}>
        <Text style={gaya.keterangan}>
          Tempoan ini sudah jatuh tempo. Bila nasabah belum bisa melunasi hari ini, catat libur
          dengan alasannya — jatuh tempo tidak bergeser.
        </Text>
        <View style={gaya.cepat}>
          {ALASAN_CEPAT.map((a) => {
            const pilih = isi === a;
            return (
              <Pressable
                key={a}
                accessibilityRole="button"
                accessibilityState={{ selected: pilih }}
                onPress={() => setAlasan(a)}
                style={[gaya.keping, pilih ? gaya.kepingPilih : null]}
              >
                <Text style={[gaya.kepingTeks, pilih ? gaya.kepingTeksPilih : null]}>{a}</Text>
              </Pressable>
            );
          })}
        </View>
        <Isian
          label="Alasan"
          value={alasan}
          onChangeText={setAlasan}
          placeholder="Tulis alasannya"
          maxLength={100}
        />
        <Tombol
          judul="Catat libur"
          ikon="circle-pause"
          nonaktif={!isi}
          onPress={() => props.onKirim(isi)}
        />
      </View>
    </LembarBawah>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    isi: { gap: RUANG[4] },
    keterangan: { ...HURUF.sm, color: WARNA.teksKedua },
    cepat: { flexDirection: "row", flexWrap: "wrap", gap: RUANG[2] },
    keping: {
      height: 34,
      justifyContent: "center",
      paddingHorizontal: RUANG[3],
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    kepingPilih: { borderColor: WARNA.utama, backgroundColor: WARNA.utamaLembut },
    kepingTeks: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
    kepingTeksPilih: { color: WARNA.utama },
  });
