import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS } from "@opennael/format";
import { PilGulir } from "./pil-gulir";

/** Saringan jenis pinjaman: Semua atau satu jenis. */
export type SaringJenis = "semua" | JenisPinjaman;

const SARING_JENIS: readonly { nilai: SaringJenis; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "harian", label: LABEL_JENIS.harian },
  { nilai: "mingguan", label: LABEL_JENIS.mingguan },
  { nilai: "tempoan", label: LABEL_JENIS.tempoan },
];

/**
 * PIL JENIS — saringan Semua · Harian · Mingguan · Tempoan (Ringkasan, daftar Storting &
 * Droping, Performa). `jumlah` (opsional) = angka di tiap pil.
 */
export function PilJenis(props: {
  nilai: SaringJenis;
  jumlah?: Record<SaringJenis, number>;
  onPilih: (s: SaringJenis) => void;
}) {
  const { jumlah } = props;
  return (
    <PilGulir
      opsi={SARING_JENIS.map((s) => (jumlah ? { ...s, angka: jumlah[s.nilai] } : s))}
      nilai={props.nilai}
      onPilih={props.onPilih}
    />
  );
}
