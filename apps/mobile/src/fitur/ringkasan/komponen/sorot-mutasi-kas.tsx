import type { HariKas } from "@opennael/contracts";
import { jam, rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import type { GerbangMutasi } from "@/fitur/lapangan";
import { AksiLaporan, ItemPengingat, type usePengingat } from "@/fitur/notifikasi";
import { AngkaSorot, BingkaiSorot, DeretKeping, gayaSorot } from "@/komponen/statistik/kartu-sorot";
import { g } from "@/komponen/ui/gaya-bersama";
import { useZonaKantor } from "@/lib/kantor";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import { barisArusKas, type KeadaanKas, keadaanKas } from "../inti/arus-kas";

const LABEL_KEADAAN: Record<KeadaanKas, string> = {
  "belum-absen": "Belum Absen",
  "tidak-kerja": "Tidak Kerja",
  lapangan: "Di Lapangan",
  laporan: "Laporan Dibuka",
  diterima: "Kas Diterima",
};

type Pengingat = NonNullable<ReturnType<typeof usePengingat>["pengingat"]>[number];

const TANDA = { awal: "", masuk: "+", keluar: "−" } as const;

/** Penjelasan gembok per keadaan gerbang (selain `siap`). */
const ALASAN_GEMBOK: Record<Exclude<GerbangMutasi, "siap">, string> = {
  memuat: "Memeriksa tagihan hari ini…",
  "belum-absen": "Absen pagi dulu. Mutasi kas terbuka sesudah semua nasabah hari ini ditagih.",
  "tidak-kerja": "Anda tidak kerja hari ini — tak ada arus kas lapangan.",
  "belum-ada-nasabah": "Belum ada nasabah untuk ditagih dan belum ada catatan hari ini.",
  "masih-menagih":
    "Masih ada nasabah yang belum ditagih. Mutasi kas terbuka sesudah semuanya dicatat — bayar atau libur.",
};

/**
 * KARTU SOROT MUTASI KAS (periode Hari Ini, semua jenis) — arus kas kolektor hari ini
 * (aturan-usaha I1): kas lapangan + storting + tabungan masuk + admin − droping − transfer
 * − biaya tak terduga = tunai yang harus disetor sore.
 *
 * TERGEMBOK selama gerbang Mutasi belum terbuka (C6): semua nasabah wajib hari ini harus
 * sudah dicatat; di bawah kartu tampil siapa yang menahan, dengan tombol ke Mode Kerja.
 * Sesudah terbuka: arus kas di dalam kartu, lalu Buka Laporan di bawahnya (mengunci catatan
 * lapangan hari ini). Sesudah kasir menerima kas: diterima & tekor / lebih setor.
 */
export function SorotMutasiKas(props: {
  gerbang: GerbangMutasi;
  /** Banyaknya nasabah wajib yang belum ditagih. */
  belum: number;
  hari: HariKas | undefined;
  /** Pengingat yang menahan gerbang (absen, gerbang, belum ditagih). */
  penahan: readonly Pengingat[];
}) {
  const zona = useZonaKantor();
  const { hari } = props;
  const keadaan = keadaanKas(hari);
  const terbuka = props.gerbang === "siap";

  if (!terbuka || !hari || hari.absensi !== "masuk_kerja") {
    const alasan =
      props.gerbang === "tidak-kerja" && hari?.alasanTidakKerja
        ? `Anda tidak kerja hari ini: ${hari.alasanTidakKerja}.`
        : props.gerbang === "siap"
          ? "Belum ada arus kas lapangan hari ini."
          : ALASAN_GEMBOK[props.gerbang];
    return (
      <>
        <BingkaiSorot ikon="lock" label="Mutasi Kas" lencana={LABEL_KEADAAN[keadaan]}>
          <Text style={gaya.terkunci}>
            {props.gerbang === "masih-menagih" ? `${props.belum} Belum Ditagih` : "Terkunci"}
          </Text>
          <Text style={gayaSorot.teksRedup}>{alasan}</Text>
        </BingkaiSorot>
        {props.penahan.map((p) => (
          <ItemPengingat key={p.kunci} p={p} tanpaMutasi />
        ))}
      </>
    );
  }

  const st = hari.serahTerima ?? null;
  // Sesudah kas diterima, angka yang berlaku adalah yang dibekukan saat itu.
  const harusSetor = st?.tunaiSeharusnya ?? hari.rincian?.tunaiSeharusnya ?? 0;
  const arus = hari.rincian ? barisArusKas(hari.rincian) : [];
  const lencana =
    keadaan === "laporan" && hari.laporanDibukaAt
      ? `Laporan ${jam(hari.laporanDibukaAt, zona)}`
      : LABEL_KEADAAN[keadaan];

  return (
    <>
      <BingkaiSorot ikon="arrow-left-right" label="Mutasi Kas" lencana={lencana}>
        <AngkaSorot
          nilai={harusSetor}
          rumus={st ? "Tunai seharusnya disetor" : "Tunai yang harus disetor ke kasir"}
        />
        <View>
          {arus.map((b) => (
            <View key={b.kunci} style={gaya.arus}>
              <Text style={gaya.tanda}>{TANDA[b.tanda]}</Text>
              <Text style={[gayaSorot.teks, g.isi]} numberOfLines={1}>
                {b.label}
              </Text>
              <Text style={gaya.arusNilai}>{rupiah(b.nilai)}</Text>
            </View>
          ))}
          <Text style={[gayaSorot.teksRedup, gaya.catatan]}>
            Uang jalan {rupiah(hari.uangJalan)} tidak ikut disetor
          </Text>
        </View>
        {st ? (
          <>
            <DeretKeping
              keping={[
                { label: "Diterima kasir", nilai: st.tunaiDiterima },
                {
                  label:
                    st.selisihSetor < 0 ? "Tekor" : st.selisihSetor > 0 ? "Lebih setor" : "Pas",
                  nilai: Math.abs(st.selisihSetor),
                },
              ]}
            />
            <Text style={gayaSorot.teksRedup}>
              Diterima {st.diterimaOleh.nama} · {jam(st.dibuatAt, zona)}
            </Text>
          </>
        ) : null}
      </BingkaiSorot>

      {keadaan === "lapangan" ? (
        <View style={g.bagian}>
          <Text style={g.teksRedup}>
            Semua nasabah hari ini sudah ditagih. Periksa angkanya, lalu buka laporan dan serahkan
            tunai ke kasir.
          </Text>
          <AksiLaporan />
        </View>
      ) : null}
    </>
  );
}

const gaya = StyleSheet.create({
  terkunci: { fontSize: 28, lineHeight: 34, fontWeight: TEBAL.ekstra, color: WARNA.teksSorot },
  arus: { flexDirection: "row", alignItems: "center", gap: RUANG[2], paddingVertical: RUANG[1] },
  tanda: {
    ...HURUF.sm,
    width: 12,
    textAlign: "center",
    fontWeight: TEBAL.ekstra,
    color: WARNA.komposisiSorot1,
  },
  arusNilai: {
    ...HURUF.sm,
    fontWeight: TEBAL.tebal,
    color: WARNA.teksSorot,
    fontVariant: ["tabular-nums"],
  },
  catatan: { marginTop: RUANG[1.5] },
});
