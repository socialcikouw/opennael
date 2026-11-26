import { rupiah } from "@opennael/format";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { SorotVM } from "../inti/sorot";
import { BarKomposisi } from "./bar-komposisi";
import { TandaSelisih } from "./tanda-selisih";

/**
 * KARTU SOROT — satu-satunya bidang pekat (`latarSorot`) di layar Ringkasan, untuk angka
 * yang paling dicari (gaji, storting satu jenis, mutasi kas hari ini). Rumus dicetak kecil
 * di bawah angka dan bahannya di keping kaki, jadi angka besar bisa dicek dengan mata.
 * Nilai minus tetap terang (merah di atas hitam sulit terbaca), ditandai lencana.
 *
 * `BingkaiSorot`, `AngkaSorot`, `DeretKeping` dipakai juga kartu Mutasi Kas.
 */
export function KartuSorot({ vm }: { vm: SorotVM }) {
  return (
    <BingkaiSorot ikon={vm.ikon} label={vm.label} lencana={vm.lencana}>
      <AngkaSorot nilai={vm.nilai} rumus={vm.rumus} />
      {vm.selisih ? <TandaSelisih vm={vm.selisih} sorot /> : null}
      {vm.segmen ? <BarKomposisi segmen={vm.segmen} sorot /> : null}
      <DeretKeping keping={vm.keping} />
      {vm.kepingBawah ? (
        <View style={gaya.bawah}>
          <Keping label={vm.kepingBawah.label} nilai={vm.kepingBawah.nilai} tengah />
        </View>
      ) : null}
    </BingkaiSorot>
  );
}

export function BingkaiSorot(props: {
  ikon: NamaIkon;
  label: string;
  /** Keping kecil di kanan kepala ("Perkiraan", "Laporan Dibuka"). */
  lencana?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={gaya.kartu}>
      <View style={gaya.kepala}>
        <View style={gaya.ikon}>
          <Ikon nama={props.ikon} ukuran={16} warna={WARNA.teksSorot} />
        </View>
        <Text style={gaya.label} numberOfLines={1}>
          {props.label}
        </Text>
        {props.lencana ? (
          <View style={gaya.lencana}>
            <Text style={gaya.lencanaTeks}>{props.lencana}</Text>
          </View>
        ) : null}
      </View>
      {props.children}
    </View>
  );
}

export function AngkaSorot({ nilai, rumus }: { nilai: number; rumus: string }) {
  return (
    <View>
      <Text style={gaya.nilai} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {rupiah(nilai)}
      </Text>
      <Text style={gaya.rumus}>{rumus}</Text>
    </View>
  );
}

export function DeretKeping({ keping }: { keping: readonly { label: string; nilai: number }[] }) {
  return (
    <View style={gaya.deret}>
      {keping.map((k) => (
        <Keping key={k.label} label={k.label} nilai={k.nilai} />
      ))}
    </View>
  );
}

function Keping({ label, nilai, tengah }: { label: string; nilai: number; tengah?: boolean }) {
  return (
    <View style={[gaya.keping, tengah ? gaya.kepingBawah : null]}>
      <Text style={[gaya.kepingLabel, tengah ? gaya.tengah : null]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[gaya.kepingNilai, tengah ? gaya.tengah : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {rupiah(nilai)}
      </Text>
    </View>
  );
}

/** Gaya teks di dalam kartu sorot — dipakai isi khusus (Mutasi Kas). */
export const gayaSorot = StyleSheet.create({
  teks: { ...HURUF.sm, color: WARNA.teksSorot },
  teksRedup: { ...HURUF.xs, color: WARNA.teksSorotRedup },
  garis: { height: StyleSheet.hairlineWidth, backgroundColor: WARNA.teksSorotRedup, opacity: 0.4 },
});

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[4],
    padding: RUANG[5],
    borderRadius: SUDUT.lebar,
    backgroundColor: WARNA.latarSorot,
  },
  kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  ikon: {
    width: 30,
    height: 30,
    borderRadius: SUDUT.kecil + 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.isiSorot,
  },
  label: { ...HURUF.sm, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teksSorot },
  lencana: {
    paddingHorizontal: RUANG[2],
    paddingVertical: 2,
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.utamaIsi,
  },
  lencanaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, color: WARNA.teksAtasUtama },
  nilai: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -1,
    color: WARNA.teksSorot,
    fontVariant: ["tabular-nums"],
  },
  rumus: { ...HURUF.xs, marginTop: RUANG[0.5], color: WARNA.teksSorotRedup },
  deret: { flexDirection: "row", gap: RUANG[2.5] },
  keping: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: RUANG[3],
    paddingVertical: RUANG[2.5],
    borderRadius: SUDUT.besar - 2,
    backgroundColor: WARNA.isiSorot,
  },
  kepingLabel: { ...HURUF["2xs"], fontWeight: TEBAL.semi, color: WARNA.teksSorotRedup },
  kepingNilai: {
    ...HURUF.base,
    marginTop: RUANG[0.5],
    fontWeight: TEBAL.ekstra,
    color: WARNA.teksSorot,
    fontVariant: ["tabular-nums"],
  },
  bawah: { flexDirection: "row", justifyContent: "center", marginTop: -RUANG[1.5] },
  /** Selebar satu keping di atasnya, di tengah: jatuh di antara keduanya. */
  kepingBawah: { flex: 0, width: "50%" },
  tengah: { textAlign: "center" },
});
