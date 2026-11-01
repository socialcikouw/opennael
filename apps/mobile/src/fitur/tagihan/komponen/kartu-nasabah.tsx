import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { Stempel } from "@/fitur/lapangan";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";
import { AngkaKartu } from "./angka-kartu";
import { GridBulan } from "./grid-bulan";
import { CABANG_INFO, InfoKartu, ISIAN_KOTAK } from "./info-kartu";
import { KakiKartu } from "./kaki-kartu";
import { BarisRel, JARAK_KARTU } from "./rel-kartu";
import { BlokMinggu, BlokTempo } from "./slot-khusus";

/** Aksi kartu — SATU objek stabil dari layar, diteruskan ke kartu-kartu ber-memo. */
export interface AksiKartu {
  bayar: (vm: KartuVM) => void;
  gulung: (vm: KartuVM) => void;
  libur: (vm: KartuVM) => void;
  lunas: (vm: KartuVM) => void;
}

/** Lama kartu ditahan sebelum Lunasi (konfirmasinya tetap ditanyakan layar). */
const TAHAN_LUNASI_MS = 600;

/**
 * KARTU NASABAH — anak dari rel pohon kelompoknya (judul kampung di atas),
 * satu kotak: lingkaran angsuran ke- + nama + jam akad, Pinjaman Ke- +
 * lencana + Tabungan rahasia, grid sebulan, Pokok Pinjaman · Sisa Saldo,
 * sinyal gulung, lalu tombol Libur · Gulung dan Bayar. Lunasi: TAHAN LAMA
 * kartunya (bukan tombol). Kartu tanpa aksi (droping, baru tercatat) tak
 * punya tombol maupun tahan-lama.
 */
export const KartuNasabah = memo(function KartuNasabah(props: {
  vm: KartuVM;
  aksi: AksiKartu;
  aksen: WarnaMode;
  kolomHariIni: number;
  /** Transaksi yang baru tercatat: kartu menampilkan stempelnya sebentar sebelum turun ke "Sudah ditagih". */
  stempel: Stempel | null;
  /** Kartu terakhir kelompoknya: rel berhenti di akhir kartu ini. */
  terakhir: boolean;
}) {
  const gaya = useGaya(buatGaya);
  const { vm } = props;
  const bisaAksi = vm.aksi && props.stempel === null;
  const lunasi = bisaAksi ? () => props.aksi.lunas(vm) : null;

  const kotak = (
    <View style={gaya.kotak}>
      <InfoKartu vm={vm} aksen={props.aksen} onLunasi={lunasi} />
      {vm.grid ? (
        <GridBulan pekan={vm.grid} kolomHariIni={props.kolomHariIni} aksen={props.aksen} />
      ) : vm.mingguan ? (
        <BlokMinggu m={vm.mingguan} hariTagih={vm.hariTagih} aksen={props.aksen} />
      ) : vm.tempo ? (
        <BlokTempo t={vm.tempo} aksen={props.aksen} />
      ) : null}
      <AngkaKartu vm={vm} tanpaAngsuran={bisaAksi} />
      {bisaAksi ? <KakiKartu vm={vm} aksi={props.aksi} aksen={props.aksen} /> : null}
      {props.stempel ? <StempelKartu jenis={props.stempel} aksen={props.aksen} /> : null}
    </View>
  );

  return (
    <View style={gaya.wadah}>
      <BarisRel cabang={CABANG_INFO} akhir={props.terakhir} jarak={JARAK_KARTU}>
        {lunasi ? (
          // Pembungkus tahan-lama tidak menjadi satu elemen aksesibilitas: tombol di dalamnya
          // tetap terjangkau; aksi Lunasi untuk pembaca layar ada di baris nama.
          <Pressable accessible={false} delayLongPress={TAHAN_LUNASI_MS} onLongPress={lunasi}>
            {kotak}
          </Pressable>
        ) : (
          kotak
        )}
      </BarisRel>
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
    kotak: {
      gap: RUANG[3],
      padding: ISIAN_KOTAK,
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    // Menutup seluruh kotak (rel di kiri tetap terlihat).
    selubung: {
      ...StyleSheet.absoluteFill,
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
