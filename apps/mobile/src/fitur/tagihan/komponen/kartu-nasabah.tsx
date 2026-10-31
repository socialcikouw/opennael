import { memo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { Stempel } from "@/fitur/lapangan";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";
import { AngkaKartu } from "./angka-kartu";
import { GridBulan } from "./grid-bulan";
import { InfoKartu } from "./info-kartu";
import { KakiKartu } from "./kaki-kartu";
import { KepalaKartu, LEBAR_REL, SikuRel } from "./kepala-kartu";
import { BlokMinggu, BlokTempo } from "./slot-khusus";

/** Aksi kartu — SATU objek stabil dari layar, diteruskan ke kartu-kartu ber-memo. */
export interface AksiKartu {
  bayar: (vm: KartuVM) => void;
  gulung: (vm: KartuVM) => void;
  libur: (vm: KartuVM) => void;
  lunas: (vm: KartuVM) => void;
}

const LEBAR_LUNASI = 92;

/**
 * KARTU NASABAH — kepala di luar kotak (lingkaran angsuran ke-, nama, lencana)
 * dengan rel yang membelok masuk ke kotak. Kotak: info (kampung · tanggal &
 * jam akad, pinjaman ke- · Tabungan rahasia, sinyal gulung), grid sebulan,
 * Pokok · Sisa Saldo, lalu tombol. Bayar — tindakan di hampir tiap rumah —
 * satu-satunya bidang berwarna pekat, selebar kotak, mencetak nominalnya.
 * Gulung & Libur tonal di atasnya; mati beserta alasannya bila belum boleh.
 * Lunasi di BALIK kartu: geser kartu ke kiri.
 */
export const KartuNasabah = memo(function KartuNasabah(props: {
  vm: KartuVM;
  aksi: AksiKartu;
  aksen: WarnaMode;
  kolomHariIni: number;
  /** Transaksi yang baru tercatat: kartu menampilkan stempelnya sebentar sebelum turun ke "Sudah ditagih". */
  stempel: Stempel | null;
}) {
  const gaya = useGaya(buatGaya);
  const { vm } = props;
  const geser = useRef<SwipeableMethods>(null);
  const bisaAksi = vm.aksi && props.stempel === null;

  const kartu = (
    <View>
      <KepalaKartu vm={vm} aksen={props.aksen} />
      <View style={gaya.isi}>
        <SikuRel />
        <View style={gaya.kotak}>
          <InfoKartu vm={vm} />
          <View style={gaya.pemisah} />
          <View style={gaya.badan}>
            {vm.grid ? (
              <GridBulan pekan={vm.grid} kolomHariIni={props.kolomHariIni} aksen={props.aksen} />
            ) : vm.mingguan ? (
              <BlokMinggu m={vm.mingguan} hariTagih={vm.hariTagih} aksen={props.aksen} />
            ) : vm.tempo ? (
              <BlokTempo t={vm.tempo} aksen={props.aksen} />
            ) : null}
            <AngkaKartu vm={vm} tanpaAngsuran={bisaAksi} />
            {bisaAksi ? <KakiKartu vm={vm} aksi={props.aksi} aksen={props.aksen} /> : null}
          </View>
          {props.stempel ? <StempelKartu jenis={props.stempel} aksen={props.aksen} /> : null}
        </View>
      </View>
    </View>
  );

  if (!bisaAksi) return <View style={gaya.wadah}>{kartu}</View>;
  return (
    <View style={gaya.wadah}>
      <ReanimatedSwipeable
        ref={geser}
        friction={1.6}
        rightThreshold={LEBAR_LUNASI / 2}
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lunasi ${vm.nama}`}
            onPress={() => {
              geser.current?.close();
              props.aksi.lunas(vm);
            }}
            style={({ pressed }) => [gaya.lunasi, pressed ? gaya.ditekan : null]}
          >
            <Ikon nama="badge-check" ukuran={22} warna={gaya.lunasiTeks.color} />
            <Text style={gaya.lunasiTeks}>Lunasi</Text>
          </Pressable>
        )}
      >
        {kartu}
      </ReanimatedSwipeable>
    </View>
  );
});

const TEKS_STEMPEL: Record<Stempel, string> = { bayar: "DIBAYAR", libur: "LIBUR", lunas: "LUNAS" };

function StempelKartu({ jenis, aksen }: { jenis: Stempel; aksen: WarnaMode }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const warna = jenis === "libur" ? WARNA.bahaya : aksen.teks;
  return (
    <View pointerEvents="none" style={gaya.selubung}>
      <Animated.View
        entering={ZoomIn.springify().damping(12)}
        style={[gaya.stempel, { borderColor: warna }]}
      >
        <Text style={[gaya.stempelTeks, { color: warna }]}>{TEKS_STEMPEL[jenis]}</Text>
      </Animated.View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    wadah: { marginHorizontal: RUANG[4], marginBottom: RUANG[3] },
    ditekan: { opacity: 0.8 },
    // Kotak mulai sesudah lajur lingkaran; rel (SikuRel) menjemput tepi kirinya.
    isi: { paddingLeft: LEBAR_REL },
    kotak: {
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    pemisah: { height: 1, backgroundColor: WARNA.garis },
    badan: { gap: RUANG[3], padding: RUANG[3] },
    lunasi: {
      width: LEBAR_LUNASI,
      marginLeft: RUANG[2],
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1],
      borderRadius: SUDUT.lebar,
      backgroundColor: WARNA.bahayaLembut,
      borderWidth: 1,
      borderColor: WARNA.bahayaGaris,
    },
    lunasiTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.bahayaTeks },
    selubung: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.lebar,
      backgroundColor: WARNA.tiraiTerang,
    },
    stempel: {
      paddingHorizontal: RUANG[5],
      paddingVertical: RUANG[2],
      borderWidth: 3,
      borderRadius: SUDUT.sedang,
      transform: [{ rotate: "-8deg" }],
      backgroundColor: WARNA.permukaan,
    },
    stempelTeks: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, letterSpacing: 2 },
  });
