import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import type { KeadaanTempo, TempoVM } from "../inti/khusus";

/** Warna lencana hitung mundur & isi garis waktu per keadaan tempoan. */
export function rupaTempo(
  keadaan: KeadaanTempo,
  aksen: WarnaAksen,
): { teks: string; latar: string; rel: string } {
  switch (keadaan) {
    case "nanti":
      return { teks: WARNA.teksKedua, latar: WARNA.isiNetral, rel: aksen.teks };
    case "segera":
      return { teks: WARNA.waspada, latar: WARNA.waspadaLembut, rel: WARNA.waspada };
    case "hariini":
      return { teks: aksen.teksIsi, latar: aksen.isi, rel: aksen.isi };
    case "meleset":
      return { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut, rel: WARNA.bahayaTeks };
    default:
      return { teks: WARNA.teksAtasBahaya, latar: WARNA.bahaya, rel: WARNA.bahaya };
  }
}

/**
 * KEPALA KARTU TEMPOAN (rombak 28 Nov 2026, permintaan pemilik: rapat, tanpa angsuran ke-,
 * yang penting mencolok):
 *   Budi Santoso                       [MELESET 2 HARI] ›   ← nama + hitung mundur (mencolok)
 *   Akad              Pokok             Pinjaman           ← label 10 pt
 *   20 Nov • 14.10    Rp 1 jt           ke-3               ← isi 12 pt (koreksi pemilik: terbaca)
 *   ┌ 📅 Jatuh tempo (perkiraan)               ┐            ← label 10 pt
 *   │    Selasa, 3 November 26                 │            ← tanggal 14 pt tebal
 *   └ ▬▬▬▬▬▬▬▬░░░░                             ┘
 * Sisa saldo (= jumlah lunas) tidak dicetak di sini: tombol LUNASI di kaki memuatnya.
 * Ketuk baris nama = Detail Nasabah; aksi aksesibilitas Lunasi tetap.
 */
export const InfoTempo = memo(function InfoTempo(props: {
  vm: KartuVM;
  t: TempoVM;
  aksen: WarnaAksen;
  onLunasi: (() => void) | null;
  onBuka: () => void;
  onSiap: () => void;
}) {
  const { vm, t } = props;
  const w = rupaTempo(t.keadaan, props.aksen);
  return (
    <View style={gaya.info}>
      <Tekan
        style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
        onPress={props.onBuka}
        onPressIn={props.onSiap}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole="button"
        accessibilityHint="Buka detail nasabah"
        accessibilityLabel={`${vm.namaTampil}, tempoan ${t.hitungMundur.toLowerCase()}, jatuh tempo ${t.jatuhTempoHariTeks}`}
        accessibilityActions={props.onLunasi ? [{ name: "lunasi", label: "Lunasi pinjaman" }] : []}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "lunasi") props.onLunasi?.();
        }}
      >
        <Text style={gaya.nama} numberOfLines={1}>
          {vm.namaTampil}
        </Text>
        <View style={[gaya.mundur, { backgroundColor: w.latar }]}>
          <Text style={[gaya.mundurTeks, { color: w.teks }]} numberOfLines={1}>
            {t.hitungMundur}
          </Text>
        </View>
        <Ikon nama="chevron-right" ukuran={16} warna={WARNA.redup} />
      </Tekan>
      {/* Keterangan berlabel (label 10 pt, isi 12 pt) — seperti baris angka kartu harian. */}
      <View style={gaya.keterangan}>
        <Butir label="Akad" isi={vm.akadTeks} />
        <Butir label="Pokok" isi={vm.pokokRp} tengah />
        <Butir label="Pinjaman" isi={vm.pinjamanKeTeks} kanan />
      </View>
      {/* Jatuh tempo: kotak muda, 14 pt, garis kemajuan berwarna keadaan. */}
      <View style={gaya.kotakTempo}>
        <View style={gaya.lini}>
          <Ikon nama="calendar" ukuran={16} warna={props.aksen.teks} />
          <View style={gaya.kolomTempo}>
            <Text style={gaya.labelTempo}>
              {t.jatuhTempoPerkiraan ? "Jatuh tempo (perkiraan)" : "Jatuh tempo"}
            </Text>
            <Text
              style={gaya.tanggalTempo}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t.jatuhTempoHariTeks}
            </Text>
          </View>
        </View>
        <View style={gaya.rel}>
          <View
            style={[
              gaya.isiRel,
              { width: `${Math.round(t.jalan * 100)}%`, backgroundColor: w.rel },
            ]}
          />
        </View>
      </View>
    </View>
  );
});

function Butir(props: { label: string; isi: string; tengah?: boolean; kanan?: boolean }) {
  const rata = props.kanan ? gaya.kanan : props.tengah ? gaya.tengah : null;
  return (
    <View style={gaya.butir}>
      <Text style={[gaya.label, rata]} numberOfLines={1}>
        {props.label}
      </Text>
      <Text
        style={[gaya.isiButir, rata]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {props.isi}
      </Text>
    </View>
  );
}

/** Tinggi baris nama — cabang rel kartu masuk di garis tengahnya (sama dengan kartu biasa). */
export const TINGGI_BARIS_TEMPO = 32;

const gaya = StyleSheet.create({
  info: { gap: RUANG[2] },
  ditekan: { opacity: 0.6 },
  baris: {
    minHeight: TINGGI_BARIS_TEMPO,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
  },
  nama: { ...HURUF.base, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
  keterangan: { flexDirection: "row", gap: RUANG[3] },
  butir: { flex: 1, minWidth: 0, gap: 1 },
  label: { ...HURUF["3xs"], color: WARNA.redup },
  isiButir: {
    ...HURUF.xs,
    fontWeight: TEBAL.semi,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  tengah: { textAlign: "center" },
  kanan: { textAlign: "right" },
  // Hitung mundur: satu-satunya isi berwarna di kepala — keadaan terbaca sekilas.
  mundur: { paddingHorizontal: RUANG[2], paddingVertical: 3, borderRadius: SUDUT.bulat },
  mundurTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra, letterSpacing: 0.3 },
  kotakTempo: {
    gap: RUANG[1.5],
    padding: RUANG[2],
    borderRadius: SUDUT.sedang,
    backgroundColor: WARNA.isiNetral,
  },
  lini: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  kolomTempo: { flex: 1, minWidth: 0 },
  labelTempo: { ...HURUF["3xs"], color: WARNA.redup },
  tanggalTempo: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.teks },
  rel: {
    height: 6,
    borderRadius: SUDUT.bulat,
    overflow: "hidden",
    backgroundColor: WARNA.permukaan,
  },
  isiRel: { height: 6, borderRadius: SUDUT.bulat },
});
