import { IKON, type NamaIkon } from "@/komponen/ui/daftar-ikon";
import { useWarna } from "@/komponen/ui/tampilan";

/** Ikon Lucide (`komponen/ikon.ts`). `tebal` = garis lebih tebal (mis. tab aktif). */
export function Ikon(props: { nama: NamaIkon; ukuran?: number; warna?: string; tebal?: boolean }) {
  const WARNA = useWarna();
  const Gambar = IKON[props.nama];
  return (
    <Gambar
      size={props.ukuran ?? 20}
      color={props.warna ?? WARNA.teks}
      strokeWidth={props.tebal ? 2.5 : 2}
    />
  );
}
