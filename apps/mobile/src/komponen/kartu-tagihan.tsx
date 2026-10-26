import type { KartuTagih } from "@opennael/contracts";
import {
  hariPekanDari,
  type PosisiTagih,
  selisihHari,
  wajibDitagihHariIni,
} from "@opennael/domain";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NAMA_JENIS, rupiah } from "../lib/format";
import { AvatarNasabah } from "./foto-nasabah";
import { useGaya, useWarna } from "./tampilan";
import { HURUF, RUANG, SENTUH, SUDUT, TEBAL, type Warna } from "./tema";
import { Ikon, Lencana } from "./ui";

/**
 * KARTU TAGIHAN — dibaca dari atas ke bawah persis urutan pertanyaan kolektor
 * di depan rumah: SIAPA (foto, nama, penanda), SEJAUH MANA (bilah kemajuan),
 * BERAPA (sisa, tunggakan), lalu MAU DIAPAKAN (satu tombol Setor bernominal;
 * libur, lunas, gulung di kartu lengkap). Kartu yang sudah dicatat hari ini
 * menyusut jadi satu baris ringkas.
 *
 * Nol hitungan saat render: semuanya di `susunKartu` (view model), yang
 * di-cache per objek data — mengetik di kolom cari tidak membuat kartu baru,
 * jadi `memo` benar-benar melewati kartu yang tak berubah.
 */

/**
 * belum = wajib ditagih hari ini (aturan-usaha B6) & belum dicatat — yang
 * menahan laporan (C6); bebas = boleh dibayar tapi tidak wajib hari ini
 * (mingguan di luar hari tagihnya, tempoan); baru = akad hari ini.
 */
export type Keadaan = "belum" | "bebas" | "setor" | "libur" | "baru";

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export interface KartuVM {
  p: KartuTagih;
  keadaan: Keadaan;
  /** Wajib ditagih hari ini (B6), sudah dicatat atau belum. */
  wajib: boolean;
  /** Angsuran tertinggal (B5); null = posisi tagih belum dimuat. */
  telat: number | null;
  tunggakan: number;
  lencana: { teks: string; warna: "hijau" | "kuning" | "merah" | "abu" }[];
  /** 0–1. */
  kemajuan: number;
  kemajuanTeks: string;
  ringkas: string;
  /** Tombol Setor cepat (harian & mingguan yang belum dicatat). */
  bisaSetor: boolean;
}

const simpanan = new WeakMap<KartuTagih, Map<PosisiTagih | null | undefined, KartuVM>>();

/** View model kartu, sama objeknya selama data & posisi tagihnya sama. */
export function susunKartu(
  p: KartuTagih,
  tagih: PosisiTagih | null | undefined,
  hariIni: string,
): KartuVM {
  let perTagih = simpanan.get(p);
  if (!perTagih) {
    perTagih = new Map();
    simpanan.set(p, perTagih);
  }
  let vm = perTagih.get(tagih);
  if (!vm) {
    vm = buat(p, tagih, hariIni);
    perTagih.set(tagih, vm);
  }
  return vm;
}

function buat(p: KartuTagih, tagih: PosisiTagih | null | undefined, hariIni: string): KartuVM {
  const wajib = wajibDitagihHariIni(p, hariIni);
  const keadaan: Keadaan =
    p.hariIni?.jenis === "angsuran"
      ? "setor"
      : p.hariIni?.jenis === "libur"
        ? "libur"
        : p.tanggalAkad === hariIni
          ? "baru"
          : wajib
            ? "belum"
            : "bebas";
  const telat = tagih === undefined ? null : (tagih?.tertinggal ?? 0);
  const tunggakan = tagih?.tunggakan ?? 0;

  const lencana: KartuVM["lencana"] = [];
  if (p.status === "macet") lencana.push({ teks: "Macet", warna: "merah" });
  if (telat && telat > 0) {
    lencana.push(
      p.jenis === "tempoan"
        ? { teks: "Lewat tempo", warna: "merah" }
        : { teks: `Telat ${telat}×`, warna: telat >= 3 ? "merah" : "kuning" },
    );
  }
  if (keadaan === "baru") lencana.push({ teks: "Akad hari ini", warna: "hijau" });
  if (keadaan === "bebas" && p.jenis === "mingguan") {
    lencana.push({ teks: `Tagih tiap ${NAMA_HARI[hariPekanDari(p.tanggalAkad)]}`, warna: "abu" });
  }

  let kemajuan: number;
  let kemajuanTeks: string;
  if (p.jenis === "tempoan" && p.jatuhTempo) {
    const total = Math.max(selisihHari(p.tanggalAkad, p.jatuhTempo), 1);
    const sisa = selisihHari(hariIni, p.jatuhTempo);
    kemajuan = Math.min(Math.max(1 - sisa / total, 0), 1);
    kemajuanTeks =
      sisa > 0 ? `${sisa} hari lagi` : sisa === 0 ? "jatuh tempo hari ini" : `lewat ${-sisa} hari`;
  } else {
    kemajuan = p.tenor > 0 ? Math.min(p.angsuranKe / p.tenor, 1) : 0;
    kemajuanTeks = `${p.angsuranKe}/${p.tenor}`;
  }

  return {
    p,
    keadaan,
    wajib,
    telat,
    tunggakan,
    lencana,
    kemajuan,
    kemajuanTeks,
    ringkas: `${NAMA_JENIS[p.jenis]} ke-${p.pinjamanKe} · sisa ${rupiah(p.saldo)}`,
    bisaSetor: (keadaan === "belum" || keadaan === "bebas") && p.jenis !== "tempoan",
  };
}

/** Warna cincin foto: sudah setor hijau, libur kuning, macet/telat merah. */
function warnaCincin(vm: KartuVM, w: Warna): string {
  if (vm.keadaan === "setor") return w.utama;
  if (vm.keadaan === "libur") return w.waspada;
  if (vm.p.status === "macet" || (vm.telat ?? 0) >= 3) return w.bahaya;
  if ((vm.telat ?? 0) > 0) return w.waspada;
  return w.garis;
}

export const KartuTagihan = memo(function KartuTagihan({
  vm,
  bukaSetor,
  onBuka,
  onSetor,
}: {
  vm: KartuVM;
  /** Gerbang lapangan terbuka — tombol Setor tampil. */
  bukaSetor: boolean;
  onBuka: (id: string) => void;
  onSetor: (vm: KartuVM) => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const { p } = vm;

  if (vm.keadaan === "setor" || vm.keadaan === "libur") {
    return (
      <Pressable
        onPress={() => onBuka(p.id)}
        style={({ pressed }) => [gaya.kartu, gaya.ringkas, pressed ? gaya.ditekan : null]}
      >
        <View style={[gaya.cincin, { borderColor: warnaCincin(vm, WARNA) }]}>
          <AvatarNasabah fotoId={p.fotoSerahTerimaId} nama={p.nasabah.nama} ukuran={36} />
        </View>
        <View style={gaya.isi}>
          <Text style={gaya.namaRingkas} numberOfLines={1}>
            {p.nasabah.nama}
          </Text>
          <Text style={gaya.meta} numberOfLines={1}>
            sisa {rupiah(p.saldo)}
          </Text>
        </View>
        {p.hariIni?.jenis === "angsuran" ? (
          <View style={[gaya.stempel, gaya.stempelSetor]}>
            <Ikon nama="check" ukuran={14} warna={WARNA.utama} tebal />
            <Text style={[gaya.stempelTeks, { color: WARNA.utama }]}>
              {rupiah(p.hariIni.storting)}
            </Text>
          </View>
        ) : (
          <View style={[gaya.stempel, gaya.stempelLibur]}>
            <Ikon nama="moon" ukuran={14} warna={WARNA.waspada} />
            <Text style={[gaya.stempelTeks, { color: WARNA.waspada }]}>Libur</Text>
          </View>
        )}
      </Pressable>
    );
  }

  const merah = p.status === "macet" || (vm.telat ?? 0) >= 3;
  return (
    <Pressable
      onPress={() => onBuka(p.id)}
      style={({ pressed }) => [gaya.kartu, pressed ? gaya.ditekan : null]}
    >
      <View style={gaya.kepala}>
        <View style={[gaya.cincin, { borderColor: warnaCincin(vm, WARNA) }]}>
          <AvatarNasabah fotoId={p.fotoSerahTerimaId} nama={p.nasabah.nama} ukuran={48} />
        </View>
        <View style={gaya.isi}>
          <Text style={gaya.nama} numberOfLines={1}>
            {p.nasabah.nama}
          </Text>
          <Text style={gaya.meta} numberOfLines={1}>
            {vm.ringkas}
          </Text>
          {vm.lencana.length > 0 ? (
            <View style={gaya.lencana}>
              {vm.lencana.map((l) => (
                <Lencana key={l.teks} teks={l.teks} warna={l.warna} />
              ))}
            </View>
          ) : null}
        </View>
        <Ikon nama="chevron-right" ukuran={18} warna={WARNA.samar} />
      </View>

      <View style={gaya.kemajuan}>
        <View style={gaya.rel}>
          <View
            style={[
              gaya.isiRel,
              {
                width: `${Math.round(vm.kemajuan * 100)}%`,
                backgroundColor: merah ? WARNA.bahaya : WARNA.utama,
              },
            ]}
          />
        </View>
        <Text style={gaya.kemajuanTeks}>{vm.kemajuanTeks}</Text>
      </View>
      {vm.tunggakan > 0 ? (
        <Text style={[gaya.meta, { color: merah ? WARNA.bahayaTeks : WARNA.waspada }]}>
          Tunggakan {rupiah(vm.tunggakan)}
        </Text>
      ) : null}

      {vm.bisaSetor && bukaSetor ? (
        <Pressable
          onPress={() => onSetor(vm)}
          accessibilityRole="button"
          accessibilityLabel={`Setor angsuran ${rupiah(p.angsuran)} untuk ${p.nasabah.nama}`}
          style={({ pressed }) => [gaya.setor, pressed ? gaya.setorDitekan : null]}
        >
          <View style={gaya.setorKiri}>
            <Ikon nama="hand-coins" ukuran={18} warna={WARNA.teksAtasUtama} />
            <Text style={gaya.setorLabel}>Setor</Text>
          </View>
          <Text style={gaya.setorNominal}>{rupiah(p.angsuran)}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
});

/** Kerangka saat daftar pertama kali dimuat — bentuknya sama dengan kartu. */
export function KerangkaKartu() {
  const gaya = useGaya(buatGaya);
  return (
    <View style={[gaya.kartu, gaya.kerangka]}>
      <View style={gaya.kepala}>
        <View style={gaya.kerangkaFoto} />
        <View style={[gaya.isi, gaya.kerangkaTeks]}>
          <View style={[gaya.kerangkaBaris, { width: "55%" }]} />
          <View style={[gaya.kerangkaBaris, { width: "80%" }]} />
        </View>
      </View>
      <View style={gaya.rel} />
      <View style={gaya.kerangkaTombol} />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kartu: {
      gap: RUANG[3],
      marginHorizontal: RUANG[4],
      marginBottom: RUANG[3],
      padding: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    ditekan: { opacity: 0.85 },
    ringkas: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: RUANG[3],
      backgroundColor: WARNA.latar,
    },
    kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    cincin: { padding: 2, borderRadius: SUDUT.bulat, borderWidth: 2 },
    isi: { flex: 1, gap: RUANG[0.5] },
    nama: { ...HURUF.base, fontWeight: TEBAL.semi, color: WARNA.teks },
    namaRingkas: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teks },
    meta: { ...HURUF.xs, color: WARNA.redup },
    lencana: { flexDirection: "row", flexWrap: "wrap", gap: RUANG[1], paddingTop: RUANG[1] },
    kemajuan: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    rel: { flex: 1, height: 6, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    isiRel: { height: "100%", borderRadius: SUDUT.bulat },
    kemajuanTeks: {
      ...HURUF.xs,
      fontWeight: TEBAL.sedang,
      fontVariant: ["tabular-nums"],
      color: WARNA.teksKedua,
    },
    setor: {
      height: SENTUH.besar,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.sedang,
      backgroundColor: WARNA.utamaIsi,
    },
    setorDitekan: { opacity: 0.85 },
    setorKiri: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    setorLabel: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teksAtasUtama },
    setorNominal: {
      ...HURUF.base,
      fontWeight: TEBAL.semi,
      fontVariant: ["tabular-nums"],
      color: WARNA.teksAtasUtama,
    },
    stempel: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2.5],
      paddingVertical: RUANG[1],
      borderRadius: SUDUT.bulat,
    },
    stempelSetor: { backgroundColor: WARNA.utamaLembut },
    stempelLibur: { backgroundColor: WARNA.waspadaLembut },
    stempelTeks: { ...HURUF.xs, fontWeight: TEBAL.semi, fontVariant: ["tabular-nums"] },
    kerangka: { borderColor: WARNA.garis },
    kerangkaFoto: { width: 52, height: 52, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kerangkaTeks: { gap: RUANG[2] },
    kerangkaBaris: { height: 10, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    kerangkaTombol: {
      height: SENTUH.besar,
      borderRadius: SUDUT.sedang,
      backgroundColor: WARNA.abu,
    },
  });
