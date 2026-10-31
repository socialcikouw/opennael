import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";
import type { AksiKartu } from "./kartu-nasabah";

/**
 * Kaki kartu — dua pil zig-zag yang disambung garis tipis:
 *   ( GULUNG  Rp 300.000 )──────────────────
 *   ──────────────────( BAYAR  Rp 15.000 )
 * GULUNG tonal (hijau bila boleh, merah belum waktunya, abu terkunci; yang
 * mati tetap bisa diketuk untuk membaca alasannya) memuat pokok sekarang;
 * BAYAR pekat memuat angsuran (tempoan: LUNASI seharga saldo). Libur lewat
 * geser kartu ke kanan, Lunasi ke kiri.
 */
export function KakiKartu({ vm, aksi, aksen }: { vm: KartuVM; aksi: AksiKartu; aksen: WarnaMode }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const status = vm.progres?.status ?? (vm.sekaliBayar ? "boleh" : "terkunci");
  const mati = status === "belum" ? "merah" : status === "terkunci" ? "abu" : null;
  const warnaGulung =
    mati === "merah" ? WARNA.bahayaTeks : mati === "abu" ? WARNA.samar : WARNA.utama;
  const latarGulung =
    mati === "merah" ? WARNA.bahayaLembut : mati === "abu" ? WARNA.abu : WARNA.utamaLembut;
  const alasan = vm.progres?.petunjuk ?? null;

  return (
    <View style={gaya.kaki}>
      <View style={gaya.baris}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: mati !== null }}
          accessibilityLabel={
            mati ? `Gulung, tidak tersedia. ${alasan ?? ""}` : `Gulung, pokok ${vm.pokokRp}`
          }
          onPress={() => aksi.gulung(vm)}
          style={({ pressed }) => [
            gaya.pil,
            { backgroundColor: latarGulung },
            mati ? gaya.pilMati : null,
            pressed ? gaya.ditekan : null,
          ]}
        >
          <Ikon nama="repeat" ukuran={15} warna={warnaGulung} />
          <Text style={[gaya.label, { color: warnaGulung }]}>GULUNG</Text>
          <Text style={[gaya.nominal, { color: warnaGulung }]} numberOfLines={1}>
            {vm.pokokRp}
          </Text>
        </Pressable>
        <View style={gaya.garis} />
      </View>
      <View style={gaya.baris}>
        <View style={gaya.garis} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            vm.sekaliBayar ? `Lunasi ${vm.bayarTeks}` : `Bayar angsuran ${vm.bayarTeks}`
          }
          onPress={() => (vm.sekaliBayar ? aksi.lunas(vm) : aksi.bayar(vm))}
          style={({ pressed }) => [
            gaya.pil,
            gaya.pilBayar,
            { backgroundColor: aksen.isi },
            pressed ? gaya.ditekan : null,
          ]}
        >
          <Ikon
            nama={vm.sekaliBayar ? "circle-check" : "hand-coins"}
            ukuran={17}
            warna={aksen.teksIsi}
          />
          <Text style={[gaya.label, { color: aksen.teksIsi }]}>
            {vm.sekaliBayar ? "LUNASI" : "BAYAR"}
          </Text>
          <Text style={[gaya.nominal, { color: aksen.teksIsi }]} numberOfLines={1}>
            {vm.bayarTeks}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    ditekan: { opacity: 0.8 },
    kaki: { gap: RUANG[2] },
    baris: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    garis: { flex: 1, height: 2, borderRadius: 1, backgroundColor: WARNA.garisTegas },
    pil: {
      height: 40,
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.bulat,
    },
    pilMati: { opacity: 0.8 },
    pilBayar: { height: 44 },
    label: { ...HURUF.sm, fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
    nominal: { ...HURUF.sm, fontWeight: TEBAL.semi, fontVariant: ["tabular-nums"] },
  });
