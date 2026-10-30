import { Pilihan } from "@/komponen/ui/pilihan";
import { type PilihanTampilan, tampilan, usePilihanTampilan } from "@/komponen/ui/tampilan";

const PILIHAN: { nilai: PilihanTampilan; teks: string }[] = [
  { nilai: "sistem", teks: "Ikuti HP" },
  { nilai: "terang", teks: "Terang" },
  { nilai: "gelap", teks: "Gelap" },
];

/** Pilihan mode tampilan — tersimpan di HP ini, langsung berlaku. */
export function PilihTampilan() {
  const nilai = usePilihanTampilan();
  return (
    <Pilihan
      segmen
      label="Tampilan"
      pilihan={PILIHAN}
      nilai={nilai}
      onPilih={(baru) => void tampilan.pilih(baru)}
    />
  );
}
