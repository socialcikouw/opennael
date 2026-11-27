import { memo } from "react";
import { StyleSheet, View } from "react-native";
import type { Stempel } from "@/fitur/lapangan";
import { BarisRel, JARAK_KARTU } from "@/komponen/rel-kartu";
import { SelubungMencatat } from "@/komponen/ui/selubung-mencatat";
import { StempelBerhasil } from "@/komponen/ui/stempel-berhasil";
import { RUANG, SUDUT, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import { AngkaKartu } from "./angka-kartu";
import { GeserKartu } from "./geser-kartu";
import { GridBulan } from "./grid-bulan";
import { CABANG_INFO, InfoKartu, ISIAN_KOTAK } from "./info-kartu";
import { InfoTempo } from "./info-tempo";
import { KakiKartu } from "./kaki-kartu";
import { BlokMinggu, BlokTempo } from "./slot-khusus";

/** Tulisan di bawah "Berhasil" pada stempel kartu. */
const KETERANGAN_STEMPEL: Record<Stempel, string> = {
  bayar: "Dibayar",
  libur: "Libur Dicatat",
  janji: "Janji Dicatat",
  lunas: "Lunas",
};

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
 * sinyal gulung, lalu tombol Libur · Gulung dan Bayar. Lunasi harian & mingguan: GESER
 * KARTU KE KIRI → tombol LUNASI di belakangnya (`GeserKartu`, 28 Nov 2026; dulu tahan
 * lama); tempoan lewat tombol Lunasi di kaki. Kartu tanpa aksi (droping, baru tercatat)
 * tak punya tombol maupun geser.
 */
export const KartuNasabah = memo(function KartuNasabah(props: {
  vm: KartuVM;
  aksi: AksiKartu;
  aksen: WarnaAksen;
  kolomHariIni: number;
  /** Transaksi yang baru tercatat: kartu menampilkan stempelnya sebentar sebelum turun ke "Sudah ditagih". */
  stempel: Stempel | null;
  /** Kartu terakhir kelompoknya: rel menekuk jadi siku ke kartu ini lalu berhenti. */
  terakhir: boolean;
  /** Libur/Lunasi kartu ini masih berjalan: selubung "Mencatat…", tanpa geser Lunasi. */
  sibuk: boolean;
}) {
  const { vm } = props;
  // `bisaAksi` menentukan susunan kartu (kaki tombol ada/tidak) — tetap saat sibuk supaya
  // kartu tak melompat; sibuk hanya mematikan geser Lunasi dan menutup tombol dengan selubung.
  const bisaAksi = vm.aksi && props.stempel === null;
  const lunasi = bisaAksi && !props.sibuk ? () => props.aksi.lunas(vm) : null;
  // Geser kiri → LUNASI hanya harian & mingguan; tempoan punya tombol Lunasi sendiri di kaki.
  const geser = lunasi && !vm.sekaliBayar ? lunasi : null;
  // Tempoan sejak jatuh tempo: JANJI BESOK di belakang kartu (geser kiri); tombol LUNASI di kaki.
  const janji =
    bisaAksi && !props.sibuk && vm.sekaliBayar && vm.tampilkanLibur
      ? () => props.aksi.libur(vm)
      : null;

  // Tempoan yang masih ditagih: kepala khusus (hitung mundur & jatuh tempo, tanpa angsuran ke-,
  // tanpa baris Pokok/Sisa Saldo — nominal ada di tombol LUNASI). Rombak 28 Nov 2026.
  const tempo = vm.sekaliBayar && vm.tempo && bisaAksi ? vm.tempo : null;
  const kotak = tempo ? (
    <View style={gaya.kotak}>
      <InfoTempo
        vm={vm}
        t={tempo}
        aksen={props.aksen}
        onLunasi={lunasi}
        onBuka={() => props.aksi.nasabah(vm)}
        onSiap={() => props.aksi.siapNasabah(vm)}
      />
      <KakiKartu vm={vm} aksi={props.aksi} aksen={props.aksen} />
      {props.sibuk ? <SelubungMencatat warna={props.aksen.teks} /> : null}
    </View>
  ) : (
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
      <AngkaKartu vm={vm} tanpaAngsuran={bisaAksi} aksen={props.aksen} />
      {bisaAksi ? <KakiKartu vm={vm} aksi={props.aksi} aksen={props.aksen} /> : null}
      {props.stempel ? (
        <StempelBerhasil keterangan={KETERANGAN_STEMPEL[props.stempel]} />
      ) : props.sibuk ? (
        // Selama tulisan berjalan: menutup kartu (tombol tak terjangkau sentuhan).
        <SelubungMencatat warna={props.aksen.teks} />
      ) : null}
    </View>
  );

  return (
    <View style={gaya.wadah}>
      <BarisRel cabang={CABANG_INFO} akhir={props.terakhir} jarak={JARAK_KARTU}>
        {geser ? (
          // Aksi Lunasi untuk pembaca layar tetap di baris nama (aksi aksesibilitas).
          <GeserKartu
            judul="LUNASI"
            keterangan={vm.saldoRp}
            ikon="check-check"
            latar={WARNA.bahayaBingkai}
            aksesLabel={`Lunasi, sisa saldo ${vm.saldoRp}`}
            onPress={geser}
          >
            {kotak}
          </GeserKartu>
        ) : janji ? (
          <GeserKartu
            judul="JANJI BESOK"
            keterangan={null}
            ikon="calendar-clock"
            latar={vm.alasanLibur ? WARNA.redup : WARNA.waspada}
            aksesLabel={
              vm.alasanLibur ? `Janji besok, tidak tersedia. ${vm.alasanLibur}` : "Janji besok"
            }
            onPress={janji}
          >
            {kotak}
          </GeserKartu>
        ) : (
          kotak
        )}
      </BarisRel>
    </View>
  );
});

const gaya = StyleSheet.create({
  wadah: { marginHorizontal: RUANG[4] },
  // Rapat tetapi terbaca (permintaan pemilik 28 Nov 2026): isian 10, jarak 6.
  kotak: {
    gap: RUANG[1.5],
    padding: ISIAN_KOTAK,
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
});
