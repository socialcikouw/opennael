import { geserTanggal } from "@opennael/domain";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Medan, PilihanAsli } from "@/komponen/formulir";
import { KepalaHalaman, Kosong, Memuat } from "@/komponen/halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { PratinjauGaji } from "./komponen/pratinjau-gaji";
import { RiwayatSlip } from "./komponen/riwayat-slip";

const rute = getRouteApi("/_bos/gaji");

/** Gaji kolektor: pratinjau per periode, bayar, riwayat slip. */
export function LayarGaji() {
  const hariIni = useHariIni();
  const kemarin = geserTanggal(hariIni, -1);
  const { kolektor: kolektorId, mulai: m0, selesai: s0 } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const selesai = s0 ?? kemarin;
  const mulai = m0 ?? geserTanggal(selesai, -6);
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const pilihKolektor = kolektorId ?? kolektorQ.data?.[0]?.id;

  return (
    <>
      <KepalaHalaman
        judul="Gaji kolektor"
        keterangan="Storting × tarif dikurangi tekor (aturan-usaha J). Pilih kolektor dan periode."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pratinjau & bayar</CardTitle>
          <CardDescription>Periode harus sudah lewat dan belum pernah dibayar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Medan label="Kolektor" className="w-56">
              <PilihanAsli
                value={pilihKolektor ?? ""}
                onChange={(e) =>
                  void navigasi({ search: (s) => ({ ...s, kolektor: e.target.value }) })
                }
              >
                {(kolektorQ.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </PilihanAsli>
            </Medan>
            <Medan label="Mulai">
              <Input
                type="date"
                className="w-40"
                value={mulai}
                max={selesai}
                onChange={(e) =>
                  e.target.value &&
                  void navigasi({ search: (s) => ({ ...s, mulai: e.target.value }) })
                }
              />
            </Medan>
            <Medan label="Selesai">
              <Input
                type="date"
                className="w-40"
                value={selesai}
                min={mulai}
                onChange={(e) =>
                  e.target.value &&
                  void navigasi({ search: (s) => ({ ...s, selesai: e.target.value }) })
                }
              />
            </Medan>
          </div>
          {pilihKolektor ? (
            <PratinjauGaji kolektorId={pilihKolektor} mulai={mulai} selesai={selesai} />
          ) : kolektorQ.isPending ? (
            <Memuat />
          ) : (
            <Kosong>Belum ada kolektor</Kosong>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Riwayat slip</CardTitle>
          <CardDescription>
            {pilihKolektor ? "Kolektor yang dipilih di atas." : "Semua kolektor."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiwayatSlip kolektorId={pilihKolektor} hariIni={hariIni} />
        </CardContent>
      </Card>
    </>
  );
}
