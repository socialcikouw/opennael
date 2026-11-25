import type { NasabahLama } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";
import { LABEL_JENIS, rupiah, tampilKampung, tampilNama } from "@opennael/format";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Isian, PesanGalat } from "@/komponen/ui/isian";
import { Keterangan } from "@/komponen/ui/teks";
import { WARNA } from "@/tema";
import { useNasabahLama } from "../../data";
import { KartuPilihan } from "./kartu-pilihan";
import { type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/**
 * Langkah PERNAH MELUNASI — nasabah pegangan kolektor ini yang sudah lunas dan tak punya
 * pinjaman aktif (A9; daftar dari server). Tiap baris: kampung, pinjaman terakhir, tabungan.
 * Ketuk = langsung lanjut.
 */
export function LangkahPernahMelunasi(props: {
  k: Kerangka;
  nilai: NasabahLama | null;
  onPilih: (n: NasabahLama) => void;
}) {
  const daftar = useNasabahLama();
  const [cari, setCari] = useState("");
  const cocok = useMemo(() => {
    const kunci = kunciWilayah(cari);
    return (daftar.data ?? [])
      .filter((n) => !kunci || kunciWilayah(`${n.nama} ${n.kampung}`).includes(kunci))
      .slice(0, 40);
  }, [daftar.data, cari]);

  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Siapa yang pinjam lagi?"
      sub="Hanya nasabah peganganmu yang sudah melunasi dan tak punya pinjaman aktif."
    >
      <Isian
        label="Cari Nama atau Kampung"
        ikon="search"
        value={cari}
        onChangeText={setCari}
        placeholder="mis. rohimah"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {daftar.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={daftar.error?.message} />
      {daftar.data && cocok.length === 0 ? (
        <Keterangan>
          {cari ? "Tidak ada nasabah lunas bernama itu." : "Belum ada nasabah yang sudah lunas."}
        </Keterangan>
      ) : null}
      {cocok.map((n) => (
        <KartuPilihan
          key={n.id}
          huruf={n.nama.trim().charAt(0).toUpperCase()}
          judul={tampilNama(n.nama)}
          ket={
            n.terakhir
              ? `${tampilKampung(n.kampung)} · lunas Pinjaman Ke-${n.terakhir.pinjamanKe} (${LABEL_JENIS[n.terakhir.jenis]} ${rupiah(n.terakhir.pokok)})`
              : tampilKampung(n.kampung)
          }
          ket2={`Tabungan ${rupiah(n.tabungan)}`}
          terpilih={props.nilai?.id === n.id}
          onPress={() => props.onPilih(n)}
        />
      ))}
    </KerangkaLangkah>
  );
}
