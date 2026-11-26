import { rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { KartuVM, RincianVM } from "../inti/kartu";
import { BarKomposisi } from "./bar-komposisi";
import { TandaSelisih } from "./tanda-selisih";

const warnaNada = (r: RincianVM) =>
  r.nada === "bahaya" ? WARNA.bahaya : r.nada === "sukses" ? WARNA.sukses : WARNA.teks;

/**
 * KARTU RINCIAN satu pos (Storting, Droping, Potongan Akad, Operasional, Setoran Sore):
 * ikon & judul · naik/turun · angka besar · rumus · keterangan · bar komposisi · rincian
 * 2×2 atau baris · kaki. Satu komponen untuk semua pos — bedanya di VM (`inti/kartu.ts`).
 * Kartu yang punya daftar per nasabah (hari ini) bisa diketuk: "Lihat N setoran ›".
 */
export function KartuRincian({ vm, onBuka }: { vm: KartuVM; onBuka?: (() => void) | undefined }) {
  const aksen = AKSEN;
  const isi = (
    <>
      <View style={gaya.kepala}>
        <View style={[gaya.ikon, { backgroundColor: aksen.lembut }]}>
          <Ikon nama={vm.ikon} ukuran={16} warna={aksen.teks} />
        </View>
        <Text style={gaya.judul}>{vm.judul}</Text>
        {vm.selisih ? (
          <View style={gaya.selisih}>
            <TandaSelisih vm={vm.selisih} />
          </View>
        ) : null}
      </View>

      <View>
        <Text
          style={[gaya.nilai, vm.nilai < 0 ? { color: WARNA.bahaya } : null]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {rupiah(vm.nilai)}
        </Text>
        {vm.rumus ? <Text style={gaya.rumus}>{vm.rumus}</Text> : null}
        {vm.meta ? <Text style={gaya.meta}>{vm.meta}</Text> : null}
      </View>

      {vm.segmen ? <BarKomposisi segmen={vm.segmen} /> : null}

      {vm.grid ? (
        <View style={gaya.grid}>
          {vm.rincian.map((r) => (
            <Keping key={r.label} r={r} />
          ))}
        </View>
      ) : (
        <View>
          {vm.rincian.map((r, i) => (
            <Baris key={`${r.label}-${r.nilai}`} r={r} pertama={i === 0} />
          ))}
        </View>
      )}

      {vm.kaki ? (
        <View style={gaya.kaki}>
          <Text style={gaya.kakiLabel}>{vm.kaki.label}</Text>
          <Text style={[gaya.kakiNilai, { color: warnaNada(vm.kaki) }]}>
            {rupiah(vm.kaki.nilai)}
          </Text>
        </View>
      ) : null}

      {onBuka ? (
        <View style={gaya.buka}>
          <Text style={[gaya.bukaTeks, { color: aksen.teks }]}>Lihat per nasabah</Text>
          <Ikon nama="chevron-right" ukuran={16} warna={aksen.teks} />
        </View>
      ) : null}
    </>
  );

  if (!onBuka) return <View style={gaya.kartu}>{isi}</View>;
  return (
    <Tekan
      accessibilityRole="button"
      accessibilityLabel={`${vm.judul} ${rupiah(vm.nilai)}, lihat per nasabah`}
      onPress={onBuka}
      style={({ pressed }) => [gaya.kartu, pressed ? gaya.ditekan : null]}
    >
      {isi}
    </Tekan>
  );
}

function Keping({ r }: { r: RincianVM }) {
  return (
    <View style={gaya.keping}>
      <View style={gaya.kepingLabelBaris}>
        <Ikon nama={r.ikon} ukuran={12} warna={WARNA.redup} />
        <Text style={gaya.kepingLabel} numberOfLines={1}>
          {r.label}
        </Text>
      </View>
      <Text
        style={[gaya.kepingNilai, { color: warnaNada(r) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {rupiah(r.nilai)}
      </Text>
    </View>
  );
}

function Baris({ r, pertama }: { r: RincianVM; pertama: boolean }) {
  return (
    <View style={[gaya.baris, pertama ? null : gaya.pemisah]}>
      <View style={gaya.barisIkon}>
        <Ikon nama={r.ikon} ukuran={14} warna={WARNA.teksKedua} />
      </View>
      <Text style={gaya.barisLabel} numberOfLines={1}>
        {r.label}
      </Text>
      <Text style={[gaya.barisNilai, { color: warnaNada(r) }]} numberOfLines={1}>
        {rupiah(r.nilai)}
      </Text>
    </View>
  );
}

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[3],
    padding: RUANG[4],
    borderRadius: SUDUT.besar + 2,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  ditekan: { opacity: 0.85 },
  kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[2.5] },
  ikon: {
    width: 32,
    height: 32,
    borderRadius: SUDUT.kecil + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  judul: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.teks },
  selisih: { flex: 1, alignItems: "flex-end" },
  nilai: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -0.8,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  rumus: { ...HURUF.xs, color: WARNA.redup },
  meta: { ...HURUF.xs, marginTop: RUANG[0.5], fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: RUANG[2] },
  keping: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 0,
    paddingHorizontal: RUANG[3],
    paddingVertical: RUANG[2.5],
    borderRadius: SUDUT.sedang,
    backgroundColor: WARNA.isiNetral,
  },
  kepingLabelBaris: { flexDirection: "row", alignItems: "center", gap: RUANG[1] },
  kepingLabel: { ...HURUF["2xs"], flexShrink: 1, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  kepingNilai: {
    ...HURUF.sm,
    marginTop: RUANG[0.5],
    fontWeight: TEBAL.ekstra,
    fontVariant: ["tabular-nums"],
  },
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2.5],
    paddingVertical: RUANG[2.5],
  },
  pemisah: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: WARNA.garis },
  barisIkon: {
    width: 28,
    height: 28,
    borderRadius: SUDUT.kecil,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.isiNetral,
  },
  barisLabel: { ...HURUF.sm, flexShrink: 1, fontWeight: TEBAL.semi, color: WARNA.teks },
  barisNilai: {
    ...HURUF.sm,
    flex: 1,
    textAlign: "right",
    fontWeight: TEBAL.tebal,
    fontVariant: ["tabular-nums"],
  },
  kaki: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: RUANG[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WARNA.garis,
  },
  kakiLabel: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  kakiNilai: { ...HURUF.base, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  buka: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: RUANG[1] },
  bukaTeks: { ...HURUF.sm, fontWeight: TEBAL.semi },
});
