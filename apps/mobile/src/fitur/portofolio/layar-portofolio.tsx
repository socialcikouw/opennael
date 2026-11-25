import { kunci } from "@opennael/api-client";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS, rupiah } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { useDataPortofolio } from "./data";
import { piutangAktif, portofolioUntuk } from "./inti/portofolio";
import { GridPortofolio } from "./komponen/grid-portofolio";

const URUTAN_JENIS: readonly JenisPinjaman[] = ["harian", "mingguan", "tempoan"];

/**
 * PORTOFOLIO (tab ketiga Mode Rekap) — pegangan kolektor: ubin Semua Jenis (saldo berjalan,
 * macet, diputihkan, piutang aktif), lalu rincian piutang aktif per jenis.
 */
export function LayarPortofolio() {
  const ruangTab = useRuangTab();
  const klien = useQueryClient();
  const data = useDataPortofolio();
  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);
  const semua = useMemo(
    () => (data.data ? portofolioUntuk(data.data, null) : undefined),
    [data.data],
  );
  const gagal = data.isError && !data.data;

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      {data.isError && data.data ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}

      <View style={g.bagian}>
        <Text style={g.judulBagian}>SEMUA JENIS</Text>
        <GridPortofolio data={semua} gagal={gagal} />
      </View>

      {data.data ? (
        <View style={g.bagian}>
          <Text style={g.judulBagian}>PIUTANG AKTIF PER JENIS</Text>
          <View style={gaya.tabel}>
            {URUTAN_JENIS.map((jenis, i) => {
              const p = piutangAktif(data.data[jenis]);
              return (
                <View key={jenis} style={[gaya.baris, i > 0 ? gaya.garisAtas : null]}>
                  <View style={gaya.kiri}>
                    <Text style={gaya.jenis}>{LABEL_JENIS[jenis]}</Text>
                    <Text style={gaya.sub}>
                      {p.jumlah} pinjaman{p.macet > 0 ? ` · ${p.macet} macet` : ""}
                    </Text>
                  </View>
                  <Text
                    style={gaya.nilai}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {rupiah(p.saldo)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[5], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  tabel: {
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    paddingHorizontal: RUANG[4],
  },
  baris: { flexDirection: "row", alignItems: "center", gap: RUANG[3], paddingVertical: RUANG[3] },
  garisAtas: { borderTopWidth: 1, borderTopColor: WARNA.garis },
  kiri: { flex: 1, minWidth: 0, gap: 2 },
  jenis: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
  sub: { ...HURUF.xs, color: WARNA.redup },
  nilai: {
    ...HURUF.base,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
});
