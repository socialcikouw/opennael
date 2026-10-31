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
import { CABANG_INFO, InfoKartu } from "./info-kartu";
import { KakiKartu } from "./kaki-kartu";
import { BarisRel, JARAK_KARTU, JARAK_KOTAK, LEBAR_REL } from "./rel-kartu";
import { BlokMinggu, BlokTempo } from "./slot-khusus";

/** Aksi kartu — SATU objek stabil dari layar, diteruskan ke kartu-kartu ber-memo. */
export interface AksiKartu {
  bayar: (vm: KartuVM) => void;
  gulung: (vm: KartuVM) => void;
  libur: (vm: KartuVM) => void;
  lunas: (vm: KartuVM) => void;
}

const LEBAR_PANEL = 92;
const ISIAN_KOTAK = RUANG[3];
/** Garis tengah baris pertama kotak kedua: judul hari grid (nampan 6 + setengah baris 24) atau teks pertama. */
const CABANG_GRID = 1 + ISIAN_KOTAK + RUANG[1.5] + 12;
const CABANG_BIASA = 1 + ISIAN_KOTAK + 8;

/**
 * KARTU NASABAH — anak dari rel pohon kelompoknya (judul kampung di atas):
 * kotak info (lingkaran angsuran ke-, nama, pinjaman ke-, Tabungan rahasia,
 * sinyal gulung, jam akad), kotak grid sebulan + Pokok · Sisa Saldo, lalu pil
 * GULUNG dan BAYAR. Geser kartu ke kiri = Lunasi, ke kanan = Libur (rel ikut
 * bergeser karena dipotong kontainer geser). Kartu tanpa aksi (droping,
 * baru tercatat) tak bisa digeser.
 */
export const KartuNasabah = memo(function KartuNasabah(props: {
  vm: KartuVM;
  aksi: AksiKartu;
  aksen: WarnaMode;
  kolomHariIni: number;
  /** Transaksi yang baru tercatat: kartu menampilkan stempelnya sebentar sebelum turun ke "Sudah ditagih". */
  stempel: Stempel | null;
  /** Kartu terakhir kelompoknya: rel berhenti di baris terakhirnya. */
  terakhir: boolean;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const { vm } = props;
  const geser = useRef<SwipeableMethods>(null);
  const bisaAksi = vm.aksi && props.stempel === null;

  const kartu = (
    <View>
      <BarisRel cabang={CABANG_INFO} akhir={false} jarak={JARAK_KOTAK}>
        <View style={gaya.kotak}>
          <InfoKartu vm={vm} aksen={props.aksen} />
        </View>
      </BarisRel>
      <BarisRel
        cabang={vm.grid ? CABANG_GRID : CABANG_BIASA}
        akhir={props.terakhir && !bisaAksi}
        jarak={bisaAksi ? JARAK_KOTAK : JARAK_KARTU}
      >
        <View style={[gaya.kotak, gaya.badan]}>
          {vm.grid ? (
            <GridBulan pekan={vm.grid} kolomHariIni={props.kolomHariIni} aksen={props.aksen} />
          ) : vm.mingguan ? (
            <BlokMinggu m={vm.mingguan} hariTagih={vm.hariTagih} aksen={props.aksen} />
          ) : vm.tempo ? (
            <BlokTempo t={vm.tempo} aksen={props.aksen} />
          ) : null}
          <AngkaKartu vm={vm} tanpaAngsuran={bisaAksi} />
        </View>
      </BarisRel>
      {bisaAksi ? (
        <BarisRel cabang={null} akhir={props.terakhir} jarak={JARAK_KARTU}>
          <KakiKartu vm={vm} aksi={props.aksi} aksen={props.aksen} />
        </BarisRel>
      ) : null}
      {props.stempel ? <StempelKartu jenis={props.stempel} aksen={props.aksen} /> : null}
    </View>
  );

  if (!bisaAksi) return <View style={gaya.wadah}>{kartu}</View>;
  return (
    <View style={gaya.wadah}>
      <ReanimatedSwipeable
        ref={geser}
        friction={1.6}
        rightThreshold={LEBAR_PANEL / 2}
        leftThreshold={LEBAR_PANEL / 2}
        overshootRight={false}
        overshootLeft={false}
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
        renderLeftActions={
          vm.tampilkanLibur
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: vm.alasanLibur !== null }}
                  accessibilityLabel={
                    vm.alasanLibur
                      ? `Libur ${vm.nama}, tidak tersedia. ${vm.alasanLibur}`
                      : `Libur ${vm.nama}`
                  }
                  onPress={() => {
                    geser.current?.close();
                    props.aksi.libur(vm);
                  }}
                  style={({ pressed }) => [
                    gaya.libur,
                    vm.alasanLibur ? gaya.liburMati : null,
                    pressed ? gaya.ditekan : null,
                  ]}
                >
                  <Ikon
                    nama="circle-pause"
                    ukuran={22}
                    warna={vm.alasanLibur ? WARNA.samar : gaya.liburTeks.color}
                  />
                  <Text style={[gaya.liburTeks, vm.alasanLibur ? { color: WARNA.samar } : null]}>
                    Libur
                  </Text>
                </Pressable>
              )
            : undefined
        }
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
    wadah: { marginHorizontal: RUANG[4] },
    ditekan: { opacity: 0.8 },
    kotak: {
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    badan: { gap: RUANG[3], padding: ISIAN_KOTAK },
    lunasi: {
      width: LEBAR_PANEL,
      marginLeft: RUANG[2],
      marginBottom: JARAK_KARTU,
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1],
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.bahayaLembut,
      borderWidth: 1,
      borderColor: WARNA.bahayaGaris,
    },
    lunasiTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.bahayaTeks },
    libur: {
      width: LEBAR_PANEL,
      marginRight: RUANG[2],
      marginBottom: JARAK_KARTU,
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1],
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.waspadaLembut,
      borderWidth: 1,
      borderColor: WARNA.waspadaGaris,
    },
    liburMati: { backgroundColor: WARNA.abu, borderColor: WARNA.garis },
    liburTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.waspada },
    // Hanya menutup kolom kotak (rel di kiri tetap terlihat) dan berhenti sebelum jarak antarkartu.
    selubung: {
      ...StyleSheet.absoluteFill,
      left: LEBAR_REL,
      bottom: JARAK_KARTU,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.besar,
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
