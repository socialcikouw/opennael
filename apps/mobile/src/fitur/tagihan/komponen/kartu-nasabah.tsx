import { memo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { Stempel } from "@/fitur/lapangan";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaMode } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import { AngkaKartu } from "./angka-kartu";
import { GridBulan } from "./grid-bulan";
import { CABANG_INFO, InfoKartu, ISIAN_KOTAK, TAHAN_LUNASI_MS } from "./info-kartu";
import { KakiKartu } from "./kaki-kartu";
import { BarisRel, JARAK_KARTU } from "./rel-kartu";
import { BlokMinggu, BlokTempo } from "./slot-khusus";
import { StempelBerhasil } from "./stempel-berhasil";

/** Aksi kartu — SATU objek stabil dari layar, diteruskan ke kartu-kartu ber-memo. */
export interface AksiKartu {
  bayar: (vm: KartuVM) => void;
  gulung: (vm: KartuVM) => void;
  libur: (vm: KartuVM) => void;
  lunas: (vm: KartuVM) => void;
  /** Buka detail nasabah (ketuk baris nama). */
  nasabah: (vm: KartuVM) => void;
  /** Mulai mengambil detail nasabah sebelum layarnya dibuka (jari menekan baris nama). */
  siapNasabah: (vm: KartuVM) => void;
}

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
  /** Kartu terakhir kelompoknya: rel menekuk jadi siku ke kartu ini lalu berhenti. */
  terakhir: boolean;
  /** Libur/Lunasi kartu ini masih berjalan: selubung "Mencatat…", tanpa tahan-lama. */
  sibuk: boolean;
}) {
  const { vm } = props;
  // `bisaAksi` menentukan susunan kartu (kaki tombol ada/tidak) — tetap saat sibuk supaya
  // kartu tak melompat; sibuk hanya mematikan tahan-lama dan menutup tombol dengan selubung.
  const bisaAksi = vm.aksi && props.stempel === null;
  const lunasi = bisaAksi && !props.sibuk ? () => props.aksi.lunas(vm) : null;

  const kotak = (
    <View style={gaya.kotak}>
      <InfoKartu
        vm={vm}
        aksen={props.aksen}
        onLunasi={lunasi}
        onBuka={() => props.aksi.nasabah(vm)}
        onSiap={() => props.aksi.siapNasabah(vm)}
      />
      {vm.grid ? (
        <GridBulan pekan={vm.grid} kolomHariIni={props.kolomHariIni} aksen={props.aksen} />
      ) : vm.mingguan ? (
        <BlokMinggu m={vm.mingguan} hariTagih={vm.hariTagih} aksen={props.aksen} />
      ) : vm.tempo ? (
        <BlokTempo t={vm.tempo} aksen={props.aksen} />
      ) : null}
      <AngkaKartu vm={vm} tanpaAngsuran={bisaAksi} />
      {bisaAksi ? <KakiKartu vm={vm} aksi={props.aksi} aksen={props.aksen} /> : null}
      {props.stempel ? (
        <StempelBerhasil jenis={props.stempel} />
      ) : props.sibuk ? (
        <SelubungSibuk aksen={props.aksen} />
      ) : null}
    </View>
  );

  return (
    <View style={gaya.wadah}>
      <BarisRel cabang={CABANG_INFO} akhir={props.terakhir} jarak={JARAK_KARTU}>
        {lunasi ? (
          // Pembungkus tahan-lama tidak menjadi satu elemen aksesibilitas: tombol di dalamnya
          // tetap terjangkau; aksi Lunasi untuk pembaca layar ada di baris nama.
          <Tekan accessible={false} delayLongPress={TAHAN_LUNASI_MS} onLongPress={lunasi}>
            {kotak}
          </Tekan>
        ) : (
          kotak
        )}
      </BarisRel>
    </View>
  );
});

/** Selama tulisan berjalan: menutup kartu (tombol tak terjangkau sentuhan) dengan penanda tunggu. */
function SelubungSibuk({ aksen }: { aksen: WarnaMode }) {
  return (
    <View style={gaya.selubung} accessibilityLiveRegion="polite">
      <ActivityIndicator color={aksen.teks} />
      <Text style={[gaya.sibukTeks, { color: aksen.teks }]}>Mencatat…</Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  wadah: { marginHorizontal: RUANG[4] },
  kotak: {
    gap: RUANG[2],
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
    gap: RUANG[2],
    borderRadius: SUDUT.besar,
    backgroundColor: WARNA.tiraiSibuk,
  },
  sibukTeks: { ...HURUF.sm, fontWeight: TEBAL.semi },
});
