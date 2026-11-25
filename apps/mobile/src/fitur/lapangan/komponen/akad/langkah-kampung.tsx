import { kunciWilayah } from "@opennael/domain";
import { tampilKampung } from "@opennael/format";
import { useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Isian, PesanGalat } from "@/komponen/ui/isian";
import { WARNA } from "@/tema";
import { useKampung } from "../../data";
import type { KampungAkad } from "../../inti/isi-akad";
import { KartuPilihan } from "./kartu-pilihan";
import { type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/**
 * Langkah KAMPUNG (nasabah baru) — cari di daftar kampung kantor supaya ejaannya sama dengan
 * nasabah lain; bila belum ada, ketuk "Kampung baru". Ketuk = langsung lanjut.
 */
export function LangkahKampung(props: {
  k: Kerangka;
  nilai: KampungAkad | null;
  onPilih: (kampung: KampungAkad) => void;
}) {
  const kampung = useKampung();
  const [cari, setCari] = useState(props.nilai?.nama ?? "");
  const kunci = kunciWilayah(cari);
  const cocok = useMemo(
    () =>
      (kampung.data ?? [])
        .filter((k) => !kunci || kunciWilayah(k.nama).includes(kunci))
        .slice(0, 30),
    [kampung.data, kunci],
  );
  const sudahAda = (kampung.data ?? []).some((k) => kunciWilayah(k.nama) === kunci);

  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Di kampung mana rumahnya?"
      sub="Pilih kampung yang sudah ada supaya ejaannya sama dengan nasabah lain."
    >
      <Isian
        label="Cari Kampung"
        ikon="search"
        value={cari}
        onChangeText={setCari}
        placeholder="mis. pule"
        maxLength={50}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {kampung.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={kampung.error?.message} />
      {kunci && !sudahAda ? (
        <KartuPilihan
          ikon="plus"
          judul={`Kampung Baru: ${tampilKampung(cari.trim())}`}
          ket="Belum ada di daftar kantor — dibuat bersama akad ini."
          onPress={() => props.onPilih({ nama: cari.trim(), id: null })}
        />
      ) : null}
      {cocok.map((k) => (
        <KartuPilihan
          key={k.id}
          judul={tampilKampung(k.nama)}
          terpilih={props.nilai?.id === k.id}
          onPress={() => props.onPilih({ nama: k.nama, id: k.id })}
        />
      ))}
    </KerangkaLangkah>
  );
}
