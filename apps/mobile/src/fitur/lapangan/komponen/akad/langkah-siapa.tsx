import type { SiapaNasabah } from "../../inti/langkah-akad";
import { KartuPilihan } from "./kartu-pilihan";
import { type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/** Langkah SIAPA — nasabah baru atau yang pernah melunasi; ketuk = langsung lanjut. */
export function LangkahSiapa(props: {
  k: Kerangka;
  nilai: SiapaNasabah | null;
  onPilih: (s: SiapaNasabah) => void;
}) {
  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Siapa nasabahnya?"
      sub="Pilih sesuai keadaan orang yang menerima uang."
    >
      <KartuPilihan
        ikon="user-round-plus"
        judul="Nasabah Baru"
        ket="Belum pernah pinjam. Isi nama, kampung, dan NIK bila ada."
        terpilih={props.nilai === "baru"}
        onPress={() => props.onPilih("baru")}
      />
      <KartuPilihan
        ikon="user-round-check"
        judul="Pernah Melunasi"
        ket="Nasabah peganganmu yang pinjam lagi sesudah lunas."
        terpilih={props.nilai === "pernah-melunasi"}
        onPress={() => props.onPilih("pernah-melunasi")}
      />
    </KerangkaLangkah>
  );
}
