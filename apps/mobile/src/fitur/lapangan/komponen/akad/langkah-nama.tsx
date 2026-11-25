import { Isian } from "@/komponen/ui/isian";
import { Tombol } from "@/komponen/ui/tombol";
import { judulLanjut, KakiTombol, type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/** Nama nasabah sah: minimal 2 huruf (disimpan huruf kecil oleh kontrak, `teksKecil`). */
export const namaSah = (nama: string) => nama.trim().length >= 2;

/** Langkah NAMA (nasabah baru) — papan ketik langsung terbuka. */
export function LangkahNama(props: {
  k: Kerangka;
  nilai: string;
  onUbah: (nama: string) => void;
  onLanjut: () => void;
}) {
  const sah = namaSah(props.nilai);
  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Siapa nama nasabahnya?"
      sub="Tulis nama lengkap seperti di KTP."
      kaki={
        <KakiTombol>
          <Tombol judul={judulLanjut(props.k)} nonaktif={!sah} onPress={props.onLanjut} />
        </KakiTombol>
      }
    >
      <Isian
        label="Nama Nasabah"
        value={props.nilai}
        onChangeText={props.onUbah}
        placeholder="mis. siti aminah"
        maxLength={50}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => {
          if (sah) props.onLanjut();
        }}
      />
    </KerangkaLangkah>
  );
}
