import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import { RUANG, type Warna } from "@/tema";

/**
 * REL POHON — garis tegak di kiri yang menyambungkan judul kelompok dengan
 * semua kartu di bawahnya; tiap kotak kartu bercabang ke rel itu. Lajur kiri
 * selebar `LEBAR_REL`, garis di tengah lajur (`TENGAH_REL`). Judul kelompok
 * (`daftar-bagian`) memakai ukuran yang sama supaya garisnya bertemu.
 */
export const LEBAR_REL = 38;
/** Garis tengah rel (pt dari tepi kiri) — sama dengan garis tengah lencana jumlah di judul. */
export const TENGAH_REL = 15;
export const TEBAL_REL = 2;
/** Jari-jari lengkung siku rel di kartu terakhir kelompok (pt). */
const RADIUS_SIKU = 12;

/** Jarak sesudah kartu, sebelum kartu/judul berikutnya (rel melewatinya, kecuali kartu terakhir kelompok). */
export const JARAK_KARTU = RUANG[3];

/**
 * Satu baris kartu di samping rel. `cabang` = jarak (pt) dari atas baris ke
 * garis tengah cabang yang masuk ke kotak; null = tanpa cabang (mis. tombol).
 * `akhir` = baris terakhir kartu terakhir kelompok: rel menekuk jadi siku
 * melengkung (╰) — turun dari judul, berbelok mulus ke kotak, dan berhenti di
 * cabang tanpa ekor di bawahnya. Tanpa cabang, rel berhenti di dasar kotak
 * (tidak menjalar ke jarak sesudahnya).
 */
export function BarisRel(props: {
  cabang: number | null;
  akhir: boolean;
  jarak: number;
  children: ReactNode;
}) {
  const gaya = useGaya(buatGaya);
  const { cabang, akhir, jarak } = props;
  return (
    <View style={gaya.baris}>
      <View style={gaya.lajur} pointerEvents="none">
        {akhir && cabang !== null ? (
          // Satu kotak bergaris kiri + bawah: sudut bawah-kiri membulat jadi tikungan rel → cabang.
          <View
            style={[
              gaya.siku,
              {
                height: cabang + TEBAL_REL / 2,
                borderBottomLeftRadius: Math.min(RADIUS_SIKU, cabang),
              },
            ]}
          />
        ) : (
          <>
            <View style={[gaya.rel, akhir ? { bottom: jarak } : null]} />
            {cabang !== null ? (
              <View style={[gaya.cabang, { top: cabang - TEBAL_REL / 2 }]} />
            ) : null}
          </>
        )}
      </View>
      {/* Jarak di kolom isi, bukan di baris: lajur rel ikut memanjang melewatinya. */}
      <View style={[gaya.isi, { paddingBottom: jarak }]}>{props.children}</View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    baris: { flexDirection: "row" },
    lajur: { width: LEBAR_REL },
    isi: { flex: 1, minWidth: 0 },
    rel: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: TENGAH_REL - TEBAL_REL / 2,
      width: TEBAL_REL,
      backgroundColor: WARNA.garisTegas,
    },
    // Tikungan kartu terakhir: dari atas baris, sepanjang rel, melengkung, lalu sampai tepi kiri kotak.
    siku: {
      position: "absolute",
      top: 0,
      left: TENGAH_REL - TEBAL_REL / 2,
      width: LEBAR_REL - TENGAH_REL + TEBAL_REL / 2,
      borderLeftWidth: TEBAL_REL,
      borderBottomWidth: TEBAL_REL,
      borderColor: WARNA.garisTegas,
    },
    // Dari garis tengah rel sampai tepi kiri kotak.
    cabang: {
      position: "absolute",
      left: TENGAH_REL,
      width: LEBAR_REL - TENGAH_REL,
      height: TEBAL_REL,
      backgroundColor: WARNA.garisTegas,
    },
  });
