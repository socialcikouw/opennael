import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "@/komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/tema";
import { Ikon } from "@/komponen/ui";
import type { KeadaanTempo, MingguanVM, StatusKotak, TempoVM } from "../inti/khusus";

/** Slot grid kartu MINGGUAN: kabar (minggu terlewat / tagih berikutnya) + kotak per minggu. */
export const BlokMinggu = memo(function BlokMinggu(props: {
  m: MingguanVM;
  hariTagih: string | null;
  aksen: WarnaMode;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const warna: Record<StatusKotak, string> = {
    bayar: WARNA.teks,
    libur: WARNA.bahaya,
    lewat: WARNA.bahaya,
    hariini: props.aksen.teks,
    nanti: WARNA.samar,
  };
  return (
    <View style={gaya.blok}>
      {props.m.kabar ? (
        <Text
          style={[gaya.kabar, { color: props.m.kabarBahaya ? WARNA.bahayaTeks : props.aksen.teks }]}
          numberOfLines={1}
        >
          {props.m.kabarBahaya ? "⚠ " : ""}
          {props.m.kabar}
          {props.hariTagih ? <Text style={gaya.redup}> · tiap {props.hariTagih}</Text> : null}
        </Text>
      ) : null}
      <View style={gaya.nampan}>
        {props.m.kotak.map((k) => {
          const hariIni = k.status === "hariini";
          return (
            <View key={k.tanggal} style={gaya.sel}>
              <Text style={[gaya.tanggal, hariIni ? { color: props.aksen.teks } : null]}>
                {k.label}
              </Text>
              <Text
                style={[
                  gaya.nilai,
                  { color: warna[k.status] },
                  hariIni ? [gaya.pil, { backgroundColor: props.aksen.lembut }] : null,
                ]}
                numberOfLines={1}
              >
                {k.teks}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

/** Slot grid kartu TEMPOAN: jatuh tempo + hitung mundur berwarna, lalu garis waktu akad → jatuh tempo. */
export const BlokTempo = memo(function BlokTempo({ t, aksen }: { t: TempoVM; aksen: WarnaMode }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const rupa: Record<KeadaanTempo, { teks: string; latar: string }> = {
    nanti: { teks: WARNA.teksKedua, latar: WARNA.abu },
    segera: { teks: WARNA.waspada, latar: WARNA.waspadaLembut },
    hariini: { teks: aksen.teksIsi, latar: aksen.isi },
    lewat: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
    macet: { teks: WARNA.putih, latar: WARNA.bahaya },
  };
  const w = rupa[t.keadaan];
  const isiRel =
    t.keadaan === "nanti" ? aksen.teks : t.keadaan === "segera" ? WARNA.waspada : w.latar;
  return (
    <View style={gaya.nampan}>
      <View style={gaya.barisTempo}>
        <Ikon nama="calendar" ukuran={13} warna={aksen.teks} />
        <Text style={gaya.jatuhTempo} numberOfLines={1}>
          Jatuh tempo <Text style={gaya.tegas}>{t.jatuhTempoHariTeks}</Text>
        </Text>
        <View style={[gaya.mundur, { backgroundColor: w.latar }]}>
          <Text style={[gaya.mundurTeks, { color: w.teks }]} numberOfLines={1}>
            {t.hitungMundur}
          </Text>
        </View>
      </View>
      <View style={gaya.lini}>
        <Text style={gaya.tanggal}>{t.akadTeks}</Text>
        <View style={gaya.rel}>
          <View
            style={[
              gaya.isiRel,
              { width: `${Math.round(t.jalan * 100)}%`, backgroundColor: isiRel },
            ]}
          />
        </View>
        <Text style={[gaya.tanggal, gaya.tegas]}>{t.jatuhTempoTeks}</Text>
      </View>
    </View>
  );
});

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    blok: { gap: RUANG[2] },
    kabar: { ...HURUF.xs, fontWeight: TEBAL.semi },
    redup: { fontWeight: TEBAL.biasa, color: WARNA.redup },
    nampan: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: RUANG[1.5],
      padding: RUANG[2],
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.abu,
    },
    sel: { width: "15%", alignItems: "center", gap: 2 },
    tanggal: { ...HURUF["3xs"], color: WARNA.samar, fontVariant: ["tabular-nums"] },
    nilai: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.semi,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    pil: {
      minWidth: 34,
      paddingHorizontal: RUANG[1.5],
      borderRadius: SUDUT.bulat,
      overflow: "hidden",
    },
    barisTempo: { width: "100%", flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    jatuhTempo: { ...HURUF.xs, flex: 1, color: WARNA.teksKedua },
    tegas: { fontWeight: TEBAL.tebal, color: WARNA.teks },
    mundur: { paddingHorizontal: RUANG[2], paddingVertical: 2, borderRadius: SUDUT.bulat },
    mundurTeks: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra },
    lini: { width: "100%", flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    rel: { flex: 1, height: 6, borderRadius: SUDUT.bulat, backgroundColor: WARNA.permukaan },
    isiRel: { height: 6, borderRadius: SUDUT.bulat },
  });
