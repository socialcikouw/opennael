import { tampilKampung } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { kueri } from "@/lib/api";
import { useTenang } from "@/lib/tenang";
import type { NasabahLama } from "../inti";

/** Cari nasabah lama yang boleh meminjam lagi (tanpa pinjaman aktif, tak diblokir). */
export function PilihNasabahLama({
  dipilih,
  pilih,
}: {
  dipilih: NasabahLama | null;
  pilih: (n: NasabahLama | null) => void;
}) {
  const [cari, setCari] = useState("");
  const tenang = useTenang(cari.trim());
  const q = useQuery(kueri.nasabah.bebas(tenang));
  if (dipilih) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{dipilih.nama}</span>
          <span className="text-muted-foreground">
            {" "}
            · {tampilKampung(dipilih.kampung)} · dipegang {dipilih.kolektor}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => pilih(null)}>
          Ganti
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Ketik nama nasabah (tanpa pinjaman aktif)…"
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />
      {q.data ? (
        q.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada yang cocok</p>
        ) : (
          <ul className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
            {q.data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() =>
                    pilih({
                      id: n.id,
                      nama: n.nama,
                      kampung: n.kampung.nama,
                      kolektor: n.kolektor?.nama ?? "—",
                    })
                  }
                >
                  <span className="font-medium">{n.nama}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {tampilKampung(n.kampung.nama)} · {n.kolektor?.nama ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
