import { memo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "../../../komponen/tema";
import { Ikon, type NamaIkon } from "../../../komponen/ui";
import type { KartuVM, Nada } from "../inti/kartu";
import { GridBulan } from "./grid-bulan";
import { BlokMinggu, BlokTempo } from "./slot-khusus";

/** Aksi kartu — SATU objek stabil dari layar, diteruskan ke kartu-kartu ber-memo. */
export interface AksiKartu {
  bayar: (vm: KartuVM) => void;
  gulung: (vm: KartuVM) => void;
  libur: (vm: KartuVM) => void;
  lunas: (vm: KartuVM) => void;
}

/** Transaksi yang baru tercatat: kartu menampilkan stempelnya sebentar sebelum turun ke "Sudah ditagih". */
export type Stempel = "bayar" | "libur" | "lunas";

const LEBAR_LUNASI = 92;

/**
 * KARTU NASABAH — empat lapis (lihat `inti/kartu.ts`): siapa, sejauh mana,
 * grid sebulan, lalu angka & tombol. Bayar — tindakan di hampir tiap rumah —
 * satu-satunya bidang berwarna pekat, selebar kartu, mencetak nominalnya.
 * Gulung & Libur tonal di atasnya; mati beserta alasannya bila belum boleh.
 * Lunasi di BALIK kartu: geser kartu ke kiri.
 */
export const KartuNasabah = memo(function KartuNasabah(props: {
  vm: KartuVM;
  aksi: AksiKartu;
  aksen: WarnaMode;
  kolomHariIni: number;
  /** Mode Semua (pantau): tanpa tombol & tanpa geser. */
  stempel: Stempel | null;
}) {
  const gaya = useGaya(buatGaya);
  const { vm } = props;
  const geser = useRef<SwipeableMethods>(null);
  const bisaAksi = vm.aksi && props.stempel === null;

  const kartu = (
    <View style={gaya.kartu}>
      <Kepala vm={props.vm} aksen={props.aksen} />
      {vm.progres ? <BlokProgres progres={vm.progres} /> : null}
      {vm.grid ? (
        <GridBulan pekan={vm.grid} kolomHariIni={props.kolomHariIni} aksen={props.aksen} />
      ) : vm.mingguan ? (
        <BlokMinggu m={vm.mingguan} hariTagih={vm.hariTagih} aksen={props.aksen} />
      ) : vm.tempo ? (
        <BlokTempo t={vm.tempo} aksen={props.aksen} />
      ) : null}
      <BarisAngka vm={vm} tanpaAngsuran={bisaAksi} />
      {bisaAksi ? <KakiAksi vm={vm} aksi={props.aksi} aksen={props.aksen} /> : null}
      {props.stempel ? <StempelKartu jenis={props.stempel} aksen={props.aksen} /> : null}
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

function useNada(): Record<Nada, { teks: string; latar: string }> {
  const WARNA = useWarna();
  return {
    merah: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
    hijau: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    kuning: { teks: WARNA.waspada, latar: WARNA.waspadaLembut },
    abu: { teks: WARNA.teksKedua, latar: WARNA.abu },
  };
}

function Kepala({ vm, aksen }: { vm: KartuVM; aksen: WarnaMode }) {
  const gaya = useGaya(buatGaya);
  const nada = useNada();
  return (
    <View style={gaya.kepala}>
      <View accessible accessibilityLabel={`Pinjaman ke-${vm.p.pinjamanKe}`} style={gaya.lingkaran}>
        <Text style={gaya.lingkaranTeks}>{vm.lingkaran}</Text>
      </View>
      <View style={gaya.identitas}>
        <Text style={gaya.nama} numberOfLines={1}>
          {vm.nama}
        </Text>
        <Text style={gaya.subjudul} numberOfLines={1}>
          {vm.subjudul}
        </Text>
      </View>
      <View style={gaya.kanan}>
        {vm.hariTagih || vm.lencana ? (
          <View style={gaya.barisLencana}>
            {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
            {vm.lencana ? (
              <View style={[gaya.lencana, { backgroundColor: nada[vm.lencana.nada].latar }]}>
                <Ikon nama={vm.lencana.ikon} ukuran={11} warna={nada[vm.lencana.nada].teks} />
                <Text style={[gaya.lencanaTeks, { color: nada[vm.lencana.nada].teks }]}>
                  {vm.lencana.teks}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text style={gaya.tanggal}>{vm.tanggalTeks}</Text>
      </View>
    </View>
  );
}

/** Lencana PEKAT hari tagih mingguan, mis. [📅 Rabu] — beda bentuk dari lencana status. */
export function LencanaHari({ hari, aksen }: { hari: string; aksen: WarnaMode }) {
  const gaya = useGaya(buatGaya);
  return (
    <View
      accessible
      accessibilityLabel={`Ditagih tiap ${hari}`}
      style={[gaya.hari, { backgroundColor: aksen.isi }]}
    >
      <Ikon nama="calendar" ukuran={11} warna={aksen.teksIsi} />
      <Text style={[gaya.lencanaTeks, { color: aksen.teksIsi }]}>{hari}</Text>
    </View>
  );
}

function BlokProgres({ progres }: { progres: NonNullable<KartuVM["progres"]> }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const warna =
    progres.status === "boleh"
      ? WARNA.utama
      : progres.status === "belum"
        ? WARNA.bahaya
        : WARNA.samar;
  return (
    <View style={gaya.progres}>
      <View style={gaya.barisProgres}>
        <Ikon nama={progres.ikon} ukuran={13} warna={warna} />
        <Text style={[gaya.petunjuk, { color: warna }]} numberOfLines={1}>
          {progres.petunjuk}
        </Text>
        <View style={[gaya.kotak, { backgroundColor: warna }]}>
          <Text style={gaya.kotakTeks}>{progres.kotak}</Text>
        </View>
      </View>
      <View style={gaya.rel}>
        <View style={[gaya.isiRel, { width: `${progres.isi * 100}%`, backgroundColor: warna }]} />
        {progres.ambang !== null ? (
          <View style={[gaya.ambang, { left: `${progres.ambang * 100}%` }]} />
        ) : null}
      </View>
    </View>
  );
}

/** Pokok · (Angsuran) · Saldo · Tabungan "••••" sampai diketuk. Angsuran tak diulang bila tombol Bayar mencetaknya. */
function BarisAngka({ vm, tanpaAngsuran }: { vm: KartuVM; tanpaAngsuran: boolean }) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.barisAngka}>
      <Angka label="Pokok" nilai={vm.pokokTeks} />
      {tanpaAngsuran ? null : <Angka label="Angsuran" nilai={vm.angsuranTeks} />}
      <Angka label="Saldo" nilai={vm.saldoTeks} tegas tengah={tanpaAngsuran} />
      <AngkaRahasia label="Tabungan" nilai={vm.tabunganTeks} />
    </View>
  );
}

function Angka(props: { label: string; nilai: string; tegas?: boolean; tengah?: boolean }) {
  const gaya = useGaya(buatGaya);
  const rata = props.tengah ? gaya.rataTengah : null;
  return (
    <View style={gaya.angka}>
      <Text style={[gaya.angkaLabel, rata]}>{props.label}</Text>
      <Text style={[gaya.angkaNilai, props.tegas ? gaya.angkaTegas : null, rata]} numberOfLines={1}>
        {props.nilai}
      </Text>
    </View>
  );
}

/** Tabungan nasabah tak dipampang: "••••" sampai diketuk (kartu sering terbuka di depan orang lain). */
function AngkaRahasia({ label, nilai }: { label: string; nilai: string }) {
  const gaya = useGaya(buatGaya);
  const [buka, setBuka] = useState(false);
  return (
    <Pressable
      onPress={() => setBuka((b) => !b)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        buka
          ? `${label} ${nilai}. Ketuk untuk menyembunyikan`
          : `${label} tersembunyi. Ketuk untuk menampilkan`
      }
      style={gaya.angka}
    >
      <Text style={[gaya.angkaLabel, gaya.rataKanan]}>{label}</Text>
      <Text style={[gaya.angkaNilai, gaya.rataKanan]} numberOfLines={1}>
        {buka ? nilai : "••••"}
      </Text>
    </Pressable>
  );
}

function KakiAksi({ vm, aksi, aksen }: { vm: KartuVM; aksi: AksiKartu; aksen: WarnaMode }) {
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
    kartu: {
      gap: RUANG[3],
      padding: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    ditekan: { opacity: 0.8 },
    kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    lingkaran: {
      width: 44,
      height: 44,
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.abu,
    },
    lingkaranTeks: {
      ...HURUF.sm,
      fontWeight: TEBAL.ekstra,
      color: WARNA.teksLabel,
      fontVariant: ["tabular-nums"],
    },
    identitas: { flex: 1, minWidth: 0, gap: RUANG[0.5] },
    nama: {
      ...HURUF.base,
      fontWeight: TEBAL.tebal,
      textTransform: "uppercase",
      color: WARNA.teks,
    },
    subjudul: { ...HURUF.xs, color: WARNA.redup },
    kanan: { alignItems: "flex-end", gap: RUANG[1] },
    barisLencana: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    lencana: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2],
      paddingVertical: 2,
      borderRadius: SUDUT.bulat,
    },
    hari: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[1.5],
      paddingVertical: 2,
      borderRadius: SUDUT.kecil - 2,
    },
    lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.tebal },
    tanggal: { ...HURUF["2xs"], color: WARNA.samar },
    progres: { gap: RUANG[1.5] },
    barisProgres: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    petunjuk: { ...HURUF.xs, flex: 1, fontWeight: TEBAL.semi },
    kotak: {
      minWidth: 30,
      height: 24,
      paddingHorizontal: RUANG[2],
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.kecil,
    },
    kotakTeks: {
      ...HURUF.sm,
      fontWeight: TEBAL.ekstra,
      color: WARNA.permukaan,
      fontVariant: ["tabular-nums"],
    },
    rel: { height: 6, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    isiRel: { height: 6, borderRadius: SUDUT.bulat },
    ambang: {
      position: "absolute",
      top: -3,
      width: 2,
      height: 12,
      marginLeft: -1,
      borderRadius: 1,
      backgroundColor: WARNA.teks,
      opacity: 0.35,
    },
    barisAngka: { flexDirection: "row", gap: RUANG[2] },
    angka: { flex: 1, gap: 2 },
    angkaLabel: { ...HURUF["2xs"], color: WARNA.samar },
    angkaNilai: {
      ...HURUF.sm,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    angkaTegas: { fontWeight: TEBAL.ekstra },
    rataTengah: { textAlign: "center" },
    rataKanan: { textAlign: "right" },
    kaki: { gap: RUANG[2], paddingTop: RUANG[1] },
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
