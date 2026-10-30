import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { ambil, api } from "@/lib/api";
import { useSegarkanKas } from "../data";

// ---- buka buku kas ------------------------------------------------------------------

export function BukaBukuKas() {
  const segarkan = useSegarkanKas();
  const [tunai, setTunai] = useState<number | null>(null);
  const [bank, setBank] = useState<number | null>(null);
  const m = useMutation({
    mutationFn: () =>
      ambil(() => api.kas.kas.buka.$post({ json: { tunai: tunai ?? 0, bank: bank ?? 0 } })),
    onSuccess: segarkan,
  });
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Buka buku kas</CardTitle>
        <CardDescription>
          Sekali saja, hari ini. Isi uang yang ada sekarang di brankas dan di rekening kantor. Salah
          ketik masih bisa dibetulkan sampai akhir hari ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <IsianRupiah label="Kas awal tunai" nilai={tunai} ubah={setTunai} />
          <IsianRupiah label="Kas awal bank" nilai={bank} ubah={setBank} />
          {m.error ? <p className="text-sm text-red-700">{m.error.message}</p> : null}
          <Button type="submit" disabled={m.isPending || tunai === null}>
            {m.isPending ? "Memproses…" : "Buka buku kas"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
