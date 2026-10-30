import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Nasabah } from "../inti";

export function DialogRem({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const aktif = useQuery({
    queryKey: ["kebijakan", "aktif"],
    queryFn: () => ambil(() => api.kantor.kebijakan.aktif.$get()),
  });
  const lama = aktif.data?.find((r) => r.lapis === "nasabah" && r.sasaran?.id === n.id);
  const [isi, setIsi] = useState<{ naik: boolean; gulung: boolean; alasan: string } | null>(null);
  const nilai = isi ?? {
    naik: lama?.naikPinjamanDikunci ?? false,
    gulung: lama?.gulungPinjamanDikunci ?? false,
    alasan: lama?.alasanKunci ?? "",
  };
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor.kebijakan.nasabah[":nasabahId"].$put({
          param: { nasabahId: n.id },
          json: {
            naikPinjamanDikunci: nilai.naik,
            gulungPinjamanDikunci: nilai.gulung,
            alasanKunci: nilai.alasan.trim() || null,
          },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Rem pinjaman ${n.nama}`}
      keterangan="Rem lapis nasabah. Melarang pinjaman baru sama sekali = blokir (lewat pemutihan)."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message ?? aktif.error?.message}
      bisaKirim={!aktif.isPending}
    >
      {(
        [
          ["naik", "Kunci naik pinjaman (gulung dengan pokok lebih besar)"],
          ["gulung", "Kunci gulung"],
        ] as const
      ).map(([kunci, label]) => (
        <label key={kunci} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={nilai[kunci]}
            onChange={(e) => setIsi({ ...nilai, [kunci]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <Isian
        label="Alasan (opsional)"
        value={nilai.alasan}
        maxLength={100}
        onChange={(e) => setIsi({ ...nilai, alasan: e.target.value })}
      />
    </DialogFormulir>
  );
}
