import { tanggal as formatTanggal, LABEL_PERAN } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { PilihanAsli } from "@/komponen/formulir";
import { KepalaHalaman, Kosong, PilihTanggal } from "@/komponen/halaman";
import { Card, CardContent } from "@/komponen/ui/card";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { DaftarAktivitas } from "./komponen/daftar-aktivitas";

const rute = getRouteApi("/_bos/aktivitas");

/** Layar aktivitas: siapa melakukan apa, per tanggal, bisa disaring per orang. */
export function LayarAktivitas() {
  const hariIni = useHariIni();
  const { tanggal, pelaku } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const t = tanggal ?? hariIni;
  const orang = useQuery({
    queryKey: ["pengguna", "semua"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { termasukNonaktif: "ya" } })),
  });

  return (
    <>
      <KepalaHalaman
        judul="Aktivitas"
        keterangan={`Siapa melakukan apa · ${formatTanggal(t)}. Ketuk suntingan untuk melihat isi sebelum & sesudahnya.`}
        aksi={
          <>
            <PilihanAsli
              className="w-48"
              aria-label="Saring orang"
              value={pelaku ?? ""}
              onChange={(e) =>
                void navigasi({ search: (s) => ({ ...s, pelaku: e.target.value || undefined }) })
              }
            >
              <option value="">Semua orang</option>
              {orang.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama} ({LABEL_PERAN[o.peran]})
                </option>
              ))}
            </PilihanAsli>
            <PilihTanggal
              nilai={t}
              paling={hariIni}
              ubah={(baru) =>
                void navigasi({
                  search: (s) => ({ ...s, tanggal: baru === hariIni ? undefined : baru }),
                })
              }
            />
          </>
        }
      />
      <Card>
        <CardContent>
          <DaftarAktivitas
            tanggal={t}
            pelakuId={pelaku}
            kosong={<Kosong>Tidak ada aktivitas pada tanggal ini</Kosong>}
          />
        </CardContent>
      </Card>
    </>
  );
}
