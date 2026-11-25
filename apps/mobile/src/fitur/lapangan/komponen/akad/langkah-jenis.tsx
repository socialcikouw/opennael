import type { NasabahLama } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS, rupiah } from "@opennael/format";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { KartuPilihan } from "./kartu-pilihan";
import { type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/** Tiga jenis pinjaman (A2–A4): ikon sama dengan tab Mode Kerja, keterangan = tenor & cara bayar. */
const PILIHAN: readonly { jenis: JenisPinjaman; ikon: NamaIkon; ket: string }[] = [
  { jenis: "harian", ikon: "calendar-days", ket: "25 kali · ditagih tiap hari kerja" },
  { jenis: "mingguan", ikon: "calendar-range", ket: "6, 8, atau 10 kali · seminggu sekali" },
  { jenis: "tempoan", ikon: "calendar-clock", ket: "7, 10, atau 14 hari · dibayar sekali" },
];

/**
 * Langkah JENIS PINJAMAN — dipilih dengan sadar, tak mengikuti tab yang sedang dibuka
 * (koreksi pemilik 26 Nov 2026: menghindari salah input). Tak ada pilihan bawaan; nasabah
 * yang pernah melunasi menampilkan pinjaman terakhirnya di kartu jenis yang sama sebagai
 * pengingat. Ketuk = langsung lanjut.
 */
export function LangkahJenis(props: {
  k: Kerangka;
  nilai: JenisPinjaman | null;
  lama: NasabahLama | null;
  onPilih: (jenis: JenisPinjaman) => void;
}) {
  const terakhir = props.lama?.terakhir ?? null;
  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Jenis pinjamannya apa?"
      sub="Pastikan sesuai kesepakatan dengan nasabah."
    >
      {PILIHAN.map((p) => (
        <KartuPilihan
          key={p.jenis}
          ikon={p.ikon}
          judul={LABEL_JENIS[p.jenis]}
          ket={p.ket}
          ket2={
            terakhir?.jenis === p.jenis ? `Pinjaman terakhir: ${rupiah(terakhir.pokok)}` : undefined
          }
          terpilih={props.nilai === p.jenis}
          onPress={() => props.onPilih(p.jenis)}
        />
      ))}
    </KerangkaLangkah>
  );
}
