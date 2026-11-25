import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { Pilihan } from "@/komponen/ui/pilihan";
import { RUANG } from "@/tema";
import { SegmenDroping } from "./segmen-droping";
import { SegmenMutasiKas } from "./segmen-mutasi-kas";
import { SegmenStorting } from "./segmen-storting";

type Segmen = "mutasi-kas" | "storting" | "droping";

const SEGMEN: readonly { nilai: Segmen; teks: string }[] = [
  { nilai: "mutasi-kas", teks: "Mutasi Kas" },
  { nilai: "storting", teks: "Storting" },
  { nilai: "droping", teks: "Droping" },
];

/**
 * RINGKASAN (tab pertama Mode Rekap) — uang hari ini dalam tiga segmen, nama berkas = label:
 *   Mutasi Kas (`segmen-mutasi-kas.tsx`) — arus kas & Buka Laporan sore (bergembok selama
 *     masih ada nasabah wajib yang belum ditagih);
 *   Storting (`segmen-storting.tsx`) — setoran masuk, saring jenis;
 *   Droping (`segmen-droping.tsx`) — pokok yang cair hari ini, saring jenis.
 * Selalu dibuka di Mutasi Kas (tujuan "Buka Mutasi Kas" dari Notifikasi).
 */
export function LayarRingkasan() {
  const [segmen, setSegmen] = useState<Segmen>("mutasi-kas");
  return (
    <View style={g.layar}>
      <View style={gaya.segmen}>
        <Pilihan segmen pilihan={SEGMEN} nilai={segmen} onPilih={setSegmen} />
      </View>
      {segmen === "mutasi-kas" ? (
        <SegmenMutasiKas />
      ) : segmen === "storting" ? (
        <SegmenStorting />
      ) : (
        <SegmenDroping />
      )}
    </View>
  );
}

const gaya = StyleSheet.create({
  segmen: { paddingHorizontal: RUANG[5], paddingTop: RUANG[2], paddingBottom: RUANG[3] },
});
