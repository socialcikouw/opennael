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
 *   20 Nov 26 • 14.10 · Pokok 1 jt · ke-3                   ← keterangan kecil
 *   📅 Jatuh tempo Kam 3 Des  ▬▬▬▬▬▬░░░                    ← garis waktu ringkas
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
        <View style={gaya.kolom}>
          <Text style={gaya.nama} numberOfLines={1}>
            {vm.namaTampil}
          </Text>
          <Text style={gaya.meta} numberOfLines={1}>
            {vm.akadTeks} · Pokok {vm.pokokRp} · {vm.pinjamanKeTeks}
          </Text>
        </View>
        <View style={[gaya.mundur, { backgroundColor: w.latar }]}>
          <Text style={[gaya.mundurTeks, { color: w.teks }]} numberOfLines={1}>
            {t.hitungMundur}
          </Text>
        </View>
        <Ikon nama="chevron-right" ukuran={16} warna={WARNA.redup} />
      </Tekan>
      <View style={gaya.lini}>
        <Ikon nama="calendar" ukuran={12} warna={props.aksen.teks} />
        <Text style={gaya.jatuhTempo} numberOfLines={1}>
          Jatuh tempo <Text style={gaya.tegas}>{t.jatuhTempoHariTeks}</Text>
        </Text>
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

/** Tinggi baris nama — cabang rel kartu masuk di garis tengahnya (sama dengan kartu biasa). */
export const TINGGI_BARIS_TEMPO = 32;

const gaya = StyleSheet.create({
  info: { gap: RUANG[1.5] },
  ditekan: { opacity: 0.6 },
  baris: {
    minHeight: TINGGI_BARIS_TEMPO,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
  },
  kolom: { flex: 1, minWidth: 0 },
  nama: { ...HURUF.base, lineHeight: 20, fontWeight: TEBAL.tebal, color: WARNA.teks },
  meta: { ...HURUF["3xs"], color: WARNA.redup, fontVariant: ["tabular-nums"] },
  // Hitung mundur: satu-satunya isi berwarna di kepala — keadaan terbaca sekilas.
  mundur: { paddingHorizontal: RUANG[2], paddingVertical: 3, borderRadius: SUDUT.bulat },
  mundurTeks: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.3 },
  lini: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  jatuhTempo: { ...HURUF.xs, color: WARNA.teksKedua },
  tegas: { fontWeight: TEBAL.tebal, color: WARNA.teks },
  rel: {
    flex: 1,
    height: 5,
    borderRadius: SUDUT.bulat,
    overflow: "hidden",
    backgroundColor: WARNA.isiNetral,
  },
  isiRel: { height: 5, borderRadius: SUDUT.bulat },
});
