import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";
import type { AksiKartu } from "./kartu-nasabah";

/**
 * Kaki kartu: Gulung · Libur tonal di atas, lalu Bayar — satu-satunya bidang
 * berwarna pekat, selebar kartu, mencetak nominalnya (tempoan: Lunasi seharga
 * saldo). Gulung & Libur mati beserta alasannya bila belum boleh.
 */
export function KakiKartu({ vm, aksi, aksen }: { vm: KartuVM; aksi: AksiKartu; aksen: WarnaMode }) {
  const gaya = useGaya(buatGaya);
  const status = vm.progres?.status ?? (vm.sekaliBayar ? "boleh" : "terkunci");
  return (
    <View style={gaya.kaki}>
      <View style={gaya.barisTonal}>
        <TombolTonal
          label="Gulung"
          ikon="repeat"
          sorot={status === "boleh"}
          mati={status === "belum" ? "merah" : status === "terkunci" ? "abu" : null}
          alasan={vm.progres?.petunjuk ?? null}
          onPress={() => aksi.gulung(vm)}
        />
        {vm.tampilkanLibur ? (
          <TombolTonal
            label="Libur"
            ikon="circle-pause"
            sorot={false}
            mati={vm.alasanLibur ? "merah" : null}
            alasan={vm.alasanLibur}
            onPress={() => aksi.libur(vm)}
          />
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          vm.sekaliBayar ? `Lunasi ${vm.bayarTeks}` : `Bayar angsuran ${vm.bayarTeks}`
        }
        onPress={() => (vm.sekaliBayar ? aksi.lunas(vm) : aksi.bayar(vm))}
        style={({ pressed }) => [
          gaya.bayar,
          { backgroundColor: aksen.isi },
          pressed ? gaya.ditekan : null,
        ]}
      >
        <View style={gaya.bayarKiri}>
          <Ikon
            nama={vm.sekaliBayar ? "circle-check" : "hand-coins"}
            ukuran={18}
            warna={aksen.teksIsi}
          />
          <Text style={[gaya.bayarLabel, { color: aksen.teksIsi }]}>
            {vm.sekaliBayar ? "Lunasi" : "Bayar"}
          </Text>
        </View>
        <Text style={[gaya.bayarNominal, { color: aksen.teksIsi }]} numberOfLines={1}>
          {vm.bayarTeks}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Tombol tonal kaki kartu: abu biasa · `sorot` hijau (mis. Gulung yang sudah
 * boleh) · mati merah (belum waktunya — terbuka sendiri nanti) · mati abu
 * (tak mungkin, mis. gulung pinjaman macet). Yang mati tetap bisa diketuk
 * untuk membaca alasannya.
 */
function TombolTonal(props: {
  label: string;
  ikon: NamaIkon;
  sorot: boolean;
  mati: "merah" | "abu" | null;
  alasan: string | null;
  onPress: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const warna =
    props.mati === "merah"
      ? WARNA.bahayaTeks
      : props.mati === "abu"
        ? WARNA.samar
        : props.sorot
          ? WARNA.utama
          : WARNA.teksTombol;
  const latar =
    props.mati === "merah" ? WARNA.bahayaLembut : props.sorot ? WARNA.utamaLembut : WARNA.abu;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: props.mati !== null }}
      accessibilityLabel={
        props.mati ? `${props.label}, tidak tersedia. ${props.alasan ?? ""}` : props.label
      }
      onPress={props.onPress}
      style={({ pressed }) => [
        gaya.tonal,
        { backgroundColor: latar },
        props.mati ? gaya.tonalMati : null,
        pressed ? gaya.ditekan : null,
      ]}
    >
      <Ikon nama={props.ikon} ukuran={15} warna={warna} />
      <Text style={[gaya.tonalTeks, { color: warna }]} numberOfLines={1}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const buatGaya = (_WARNA: Warna) =>
  StyleSheet.create({
    ditekan: { opacity: 0.8 },
    kaki: { gap: RUANG[2] },
    barisTonal: { flexDirection: "row", gap: RUANG[2] },
    tonal: {
      flex: 1,
      height: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1.5],
      borderRadius: SUDUT.sedang,
    },
    tonalMati: { opacity: 0.75 },
    tonalTeks: { ...HURUF.sm, fontWeight: TEBAL.semi },
    bayar: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.sedang,
    },
    bayarKiri: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    bayarLabel: { ...HURUF.base, fontWeight: TEBAL.tebal },
    bayarNominal: { ...HURUF.sm, fontWeight: TEBAL.semi, fontVariant: ["tabular-nums"] },
  });
