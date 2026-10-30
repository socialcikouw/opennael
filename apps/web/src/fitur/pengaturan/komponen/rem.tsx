import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { type IsiRem, keInput } from "../inti";
import { Bagian } from "./bagian";
import { DialogRemKolektor } from "./dialog-rem-kolektor";
import { Pesan } from "./pesan";
import { SaklarRem } from "./saklar-rem";

export function Rem() {
  const klien = useQueryClient();
  const [dialogKolektor, setDialogKolektor] = useState(false);
  const aktif = useQuery({
    queryKey: ["kebijakan", "aktif"],
    queryFn: () => ambil(() => api.kantor.kebijakan.aktif.$get()),
  });
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const remKantor = aktif.data?.find((r) => r.lapis === "kantor");
  const [isi, setIsi] = useState<IsiRem | null>(null);
  const nilai: IsiRem = isi ?? {
    baru: remKantor?.pinjamanBaruDikunci ?? false,
    naik: remKantor?.naikPinjamanDikunci ?? false,
    gulung: remKantor?.gulungPinjamanDikunci ?? false,
    alasan: remKantor?.alasanKunci ?? "",
  };
  const m = useMutation({
    mutationFn: () => ambil(() => api.kantor.kebijakan.kantor.$put({ json: keInput(nilai) })),
    onSuccess: () => {
      setIsi(null);
      void klien.invalidateQueries({ queryKey: ["kebijakan"] });
    },
  });
  const remKolektor = (aktif.data ?? [])
    .filter((r) => r.lapis === "kolektor" && r.sasaran)
    .map((r) => ({
      id: r.sasaran?.id ?? "",
      isi: {
        baru: r.pinjamanBaruDikunci,
        naik: r.naikPinjamanDikunci,
        gulung: r.gulungPinjamanDikunci,
        alasan: r.alasanKunci ?? "",
      },
    }));
  const LABEL_LAPIS = { kantor: "Kantor", kolektor: "Kolektor", nasabah: "Nasabah" } as const;

  return (
    <>
      <Bagian
        judul="Rem kantor"
        keterangan="Menahan pinjaman di seluruh kantor, mis. saat modal menipis."
      >
        {aktif.isPending ? (
          <Memuat />
        ) : (
          <div className="max-w-md space-y-3">
            <SaklarRem isi={nilai} ubah={setIsi} />
            <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
            <Button disabled={m.isPending || isi === null} onClick={() => m.mutate()}>
              {m.isPending ? "Menyimpan…" : "Simpan rem kantor"}
            </Button>
          </div>
        )}
      </Bagian>
      <Bagian
        judul="Rem yang menyala"
        keterangan="Semua lapis. Rem nasabah diatur dari layar Nasabah."
      >
        <Button
          variant="outline"
          className="w-fit"
          disabled={!kolektorQ.data?.length}
          onClick={() => setDialogKolektor(true)}
        >
          <Plus />
          Atur rem kolektor
        </Button>
        {aktif.isError ? <GalatMuat galat={aktif.error} /> : null}
        {aktif.data && aktif.data.length === 0 ? <Kosong>Tidak ada rem yang menyala</Kosong> : null}
        <ul className="divide-y text-sm">
          {aktif.data?.map((r) => (
            <li
              key={`${r.lapis}-${r.sasaran?.id ?? "kantor"}`}
              className="flex flex-wrap justify-between gap-2 py-2"
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{LABEL_LAPIS[r.lapis]}</Badge>
                {r.sasaran?.nama ?? "Seluruh kantor"}
              </span>
              <span className="text-muted-foreground">
                {[
                  r.pinjamanBaruDikunci && "pinjaman baru",
                  r.naikPinjamanDikunci && "naik",
                  r.gulungPinjamanDikunci && "gulung",
                ]
                  .filter(Boolean)
                  .join(", ")}
                {r.alasanKunci ? ` · ${r.alasanKunci}` : ""} · {r.diubahOleh.nama}
              </span>
            </li>
          ))}
        </ul>
      </Bagian>
      {dialogKolektor && kolektorQ.data ? (
        <DialogRemKolektor
          kolektor={kolektorQ.data.map((o) => ({ id: o.id, nama: o.nama }))}
          aktif={remKolektor}
          tutup={() => setDialogKolektor(false)}
        />
      ) : null}
    </>
  );
}
