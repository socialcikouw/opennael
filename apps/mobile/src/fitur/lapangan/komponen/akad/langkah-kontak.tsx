import { Isian } from "@/komponen/ui/isian";
import { Tombol } from "@/komponen/ui/tombol";
import { judulLanjut, KakiTombol, type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/** NIK boleh kosong; bila diisi harus 16 digit (kontrak `nasabahBaruSchema`). */
export const nikSah = (nik: string) => nik.length === 0 || nik.length === 16;

/**
 * Langkah NIK & NOMOR HP (nasabah baru) — keduanya boleh kosong: selama kosong tombolnya
 * "Lewati", begitu ada isian menjadi "Selanjutnya" (mati selama NIK belum 16 digit).
 */
export function LangkahKontak(props: {
  k: Kerangka;
  nik: string;
  nomorHp: string;
  onNik: (nik: string) => void;
  onNomorHp: (hp: string) => void;
  onLanjut: () => void;
}) {
  const kosong = !props.nik && !props.nomorHp;
  const sah = nikSah(props.nik);
  return (
    <KerangkaLangkah
      k={props.k}
      tanya="NIK & nomor HP"
      sub="Boleh dilewati bila nasabah tak membawa KTP atau tak punya HP."
      kaki={
        <KakiTombol>
          <Tombol
            judul={judulLanjut(props.k, kosong ? "Lewati" : "Selanjutnya")}
            jenis={kosong && !props.k.kePeriksa ? "kedua" : "utama"}
            nonaktif={!sah}
            onPress={props.onLanjut}
          />
        </KakiTombol>
      }
    >
      <Isian
        label="NIK"
        value={props.nik}
        onChangeText={(t) => props.onNik(t.replace(/\D/g, "").slice(0, 16))}
        placeholder="16 digit"
        keyboardType="number-pad"
        autoFocus
        galat={sah ? undefined : `NIK 16 digit (baru ${props.nik.length})`}
      />
      <Isian
        label="Nomor HP"
        value={props.nomorHp}
        onChangeText={(t) => props.onNomorHp(t.replace(/[^\d+]/g, "").slice(0, 16))}
        placeholder="08…"
        keyboardType="phone-pad"
        maxLength={16}
      />
    </KerangkaLangkah>
  );
}
