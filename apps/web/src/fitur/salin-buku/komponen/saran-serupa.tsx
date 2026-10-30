import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { useTenang } from "@/lib/tenang";
import type { NasabahLama, Orang } from "../inti";

/** "Mungkin nasabah lama?" — NIK sama atau nama mirip (di kampung yang sama bila diisi). */
export function SaranSerupa({ orang, pakai }: { orang: Orang; pakai: (n: NasabahLama) => void }) {
  const nama = useTenang(orang.nama.trim());
  const kampung = useTenang(orang.kampung.trim());
  const nik = orang.nik.length === 16 ? orang.nik : undefined;
  const q = useQuery({
    queryKey: ["nasabah", "serupa", nama, kampung, nik ?? null],
    queryFn: () =>
      ambil(() =>
        api.pembiayaan.nasabah.serupa.$get({
          query: { nama, ...(kampung ? { kampung } : {}), ...(nik ? { nik } : {}) },
        }),
      ),
    enabled: nama.length >= 2,
  });
  if (!q.data?.length) return null;
  return (
    <div className="space-y-1.5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-medium">Mungkin sudah terdaftar:</p>
      {q.data.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {n.nama} · {n.kampung} · {n.kolektor.nama}
            {n.cocok === "nik" ? " · NIK sama" : ""}
            {n.diblokir ? " · diblokir" : n.punyaPinjamanAktif ? " · punya pinjaman aktif" : ""}
          </span>
          {!n.diblokir && !n.punyaPinjamanAktif ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                pakai({ id: n.id, nama: n.nama, kampung: n.kampung, kolektor: n.kolektor.nama })
              }
            >
              <UserCheck />
              Pakai nasabah ini
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
