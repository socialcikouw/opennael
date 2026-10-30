import { tanggal as formatTanggal } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { KepalaHalaman, PilihTanggal } from "@/komponen/halaman";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { DaftarBiaya } from "./komponen/daftar-biaya";
import { DaftarLibur } from "./komponen/daftar-libur";
import { DaftarTransfer } from "./komponen/daftar-transfer";
import { SetoranNasabah } from "./komponen/setoran-nasabah";
import { SetoranSore } from "./komponen/setoran-sore";

const rute = getRouteApi("/_bos/harian");

// ---- layar --------------------------------------------------------------------------

type Tab = "sore" | "setoran" | "libur" | "transfer" | "biaya";

/** Pekerjaan harian kantor: setoran sore, setoran nasabah, transfer, biaya tak terduga. */
export function LayarHarian() {
  const hariIni = useHariIni();
  const { tanggal, tab } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const t = tanggal ?? hariIni;
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const kolektor = useMemo(
    () => (kolektorQ.data ?? []).map((o) => ({ id: o.id, nama: o.nama })),
    [kolektorQ.data],
  );

  return (
    <>
      <KepalaHalaman
        judul="Harian"
        keterangan={`${t === hariIni ? "Hari ini · " : ""}${formatTanggal(t)}. Pembatalan hanya bisa di hari yang sama.`}
        aksi={
          <PilihTanggal
            nilai={t}
            paling={hariIni}
            ubah={(baru) =>
              void navigasi({
                search: (s) => ({ ...s, tanggal: baru === hariIni ? undefined : baru }),
              })
            }
          />
        }
      />
      <Tabs
        value={tab ?? "sore"}
        onValueChange={(v) =>
          void navigasi({
            search: (s) => ({ ...s, tab: v === "sore" ? undefined : (v as Exclude<Tab, "sore">) }),
          })
        }
      >
        <TabsList>
          <TabsTrigger value="sore">Setoran sore</TabsTrigger>
          <TabsTrigger value="setoran">Setoran nasabah</TabsTrigger>
          <TabsTrigger value="libur">Libur nasabah</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="biaya">Biaya tak terduga</TabsTrigger>
        </TabsList>
        <TabsContent value="sore" className="space-y-3">
          <SetoranSore tanggal={t} hariIni={hariIni} />
        </TabsContent>
        <TabsContent value="setoran" className="space-y-3">
          <SetoranNasabah tanggal={t} hariIni={hariIni} kolektor={kolektor} />
        </TabsContent>
        <TabsContent value="libur" className="space-y-3">
          <DaftarLibur tanggal={t} hariIni={hariIni} />
        </TabsContent>
        <TabsContent value="transfer" className="space-y-3">
          <DaftarTransfer tanggal={t} hariIni={hariIni} />
        </TabsContent>
        <TabsContent value="biaya" className="flex flex-col gap-3">
          <DaftarBiaya tanggal={t} hariIni={hariIni} kolektor={kolektor} />
        </TabsContent>
      </Tabs>
    </>
  );
}
