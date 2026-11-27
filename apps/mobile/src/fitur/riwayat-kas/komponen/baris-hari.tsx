import { rupiah, tanggal } from "@opennael/format";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { type BarisHariVM, type KeadaanHari, LABEL_KEADAAN } from "../inti/riwayat-kas";

/** Warna lencana keadaan: diterima hijau, belum diterima amber, tidak kerja netral. */
const WARNA_KEADAAN: Record<KeadaanHari, { latar: string; teks: string }> = {
  diterima: { latar: WARNA.suksesLembut, teks: WARNA.sukses },
  laporan: { latar: AKSEN.lembut, teks: AKSEN.teks },
  lapangan: { latar: AKSEN.lembut, teks: AKSEN.teks },
  "belum-diterima": { latar: WARNA.waspadaLembut, teks: WARNA.waspada },
  "tidak-kerja": { latar: WARNA.isiNetral, teks: WARNA.redup },
};

/**
 * Satu hari di Riwayat Kas: tanggal, lencana keadaan, tunai diterima kasir, dan catatan
 * (tekor merah, lebih setor hijau, pas, alasan tidak kerja). Diketuk → rincian hari itu.
 */
export const BarisHari = memo(function BarisHari({
  vm,
  onPress,
}: {
  vm: BarisHariVM;
  onPress: () => void;
}) {
  const w = WARNA_KEADAAN[vm.keadaan];
  const warnaCatatan =
    vm.nada === "bahaya" ? WARNA.bahayaTeks : vm.nada === "sukses" ? WARNA.sukses : WARNA.redup;
  return (
    <Tekan
      accessibilityRole="button"
      accessibilityLabel={`${tanggal(vm.tanggal, "panjang")}, ${LABEL_KEADAAN[vm.keadaan]}${
        vm.diterima !== null ? `, diterima ${rupiah(vm.diterima)}` : ""
      }${vm.catatan ? `, ${vm.catatan}` : ""}`}
      onPress={onPress}
      style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
    >
      <View style={gaya.kiri}>
        <Text style={gaya.tanggal}>{tanggal(vm.tanggal, "panjang").replace(/ \d{4}$/, "")}</Text>
        <View style={[gaya.lencana, { backgroundColor: w.latar }]}>
          <Text style={[gaya.lencanaTeks, { color: w.teks }]}>{LABEL_KEADAAN[vm.keadaan]}</Text>
        </View>
      </View>
      <View style={gaya.kanan}>
        <Text style={gaya.nilai}>{vm.diterima !== null ? rupiah(vm.diterima) : "—"}</Text>
        {vm.catatan ? (
          <Text style={[gaya.catatan, { color: warnaCatatan }]} numberOfLines={1}>
            {vm.catatan}
          </Text>
        ) : null}
      </View>
      <Ikon nama="chevron-right" ukuran={16} warna={WARNA.samar} />
    </Tekan>
  );
});

const gaya = StyleSheet.create({
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    padding: RUANG[3],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  ditekan: { opacity: 0.8 },
  kiri: { flex: 1, minWidth: 0, gap: RUANG[1], alignItems: "flex-start" },
  tanggal: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.teks },
  lencana: { paddingHorizontal: RUANG[2], paddingVertical: 2, borderRadius: SUDUT.bulat },
  lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra },
  kanan: { alignItems: "flex-end", gap: RUANG[0.5], maxWidth: "50%" },
  nilai: {
    ...HURUF.base,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  catatan: { ...HURUF.xs, fontWeight: TEBAL.semi },
});
