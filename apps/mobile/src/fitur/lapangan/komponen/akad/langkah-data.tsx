import { Isian } from "@/komponen/ui/isian";
import { Tombol } from "@/komponen/ui/tombol";
import { judulLanjut, KakiTombol, type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/** Nama nasabah sah: minimal 2 huruf (disimpan huruf kecil oleh kontrak, `teksKecil`). */
export const namaSah = (nama: string) => nama.trim().length >= 2;

/** NIK boleh kosong; bila diisi harus 16 digit (kontrak `nasabahBaruSchema`). */
export const nikSah = (nik: string) => nik.length === 0 || nik.length === 16;

/**
 * Langkah DATA NASABAH (nasabah baru) — nama, NIK, dan nomor HP dalam satu lembar
 * (permintaan pemilik 26 Nov 2026). Nama wajib; NIK & nomor HP boleh kosong (nasabah tak
 * membawa KTP / tak punya HP), tetapi NIK yang diisi harus 16 digit.
 */
export function LangkahData(props: {
  k: Kerangka;
  nama: string;
  nik: string;
  nomorHp: string;
  onNama: (nama: string) => void;
  onNik: (nik: string) => void;
  onNomorHp: (hp: string) => void;
  onLanjut: () => void;
}) {
  const sah = namaSah(props.nama) && nikSah(props.nik);
  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Data nasabah"
      sub="Nama lengkap seperti di KTP. NIK & nomor HP boleh dikosongkan."
      kaki={
        <KakiTombol>
          <Tombol judul={judulLanjut(props.k)} nonaktif={!sah} onPress={props.onLanjut} />
        </KakiTombol>
      }
    >
      <Isian
        label="Nama Nasabah"
        value={props.nama}
        onChangeText={props.onNama}
        placeholder="mis. siti aminah"
        maxLength={50}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        returnKeyType="next"
      />
      <Isian
        label="NIK"
        value={props.nik}
        onChangeText={(t) => props.onNik(t.replace(/\D/g, "").slice(0, 16))}
        placeholder="16 digit (boleh kosong)"
        keyboardType="number-pad"
        galat={nikSah(props.nik) ? undefined : `NIK 16 digit (baru ${props.nik.length})`}
      />
      <Isian
        label="Nomor HP"
        value={props.nomorHp}
        onChangeText={(t) => props.onNomorHp(t.replace(/[^\d+]/g, "").slice(0, 16))}
        placeholder="08… (boleh kosong)"
        keyboardType="phone-pad"
        maxLength={16}
      />
    </KerangkaLangkah>
  );
}
