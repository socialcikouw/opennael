import { getRouteApi } from "@tanstack/react-router";
import { KepalaHalaman } from "@/komponen/halaman";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { DaftarKampung } from "./komponen/daftar-kampung";
import { LiburKantor } from "./komponen/libur-kantor";
import { PekanKerja } from "./komponen/pekan-kerja";
import { ProfilKantor } from "./komponen/profil-kantor";
import { Rem } from "./komponen/rem";
import { RuteKolektor } from "./komponen/rute-kolektor";
import { TarifGaji } from "./komponen/tarif-gaji";

const rute = getRouteApi("/_bos/pengaturan");

// ---- layar --------------------------------------------------------------------------

const TAB = [
  { nilai: "kantor", label: "Kantor" },
  { nilai: "rem", label: "Rem" },
  { nilai: "libur", label: "Libur" },
  { nilai: "tarif", label: "Tarif gaji" },
  { nilai: "rute", label: "Rute kolektor" },
  { nilai: "kampung", label: "Kampung" },
] as const;

export type TabPengaturan = (typeof TAB)[number]["nilai"];

/** Pengaturan kantor: profil & pekan kerja, rem, libur, tarif gaji, rute kolektor. */
export function LayarPengaturan() {
  const { tab } = rute.useSearch();
  const navigasi = rute.useNavigate();
  return (
    <>
      <KepalaHalaman judul="Pengaturan" keterangan="Semua perubahan tercatat di aktivitas." />
      <Tabs
        value={tab ?? "kantor"}
        onValueChange={(v) =>
          void navigasi({
            search: { tab: v === "kantor" ? undefined : (v as Exclude<TabPengaturan, "kantor">) },
          })
        }
      >
        <TabsList>
          {TAB.map((t) => (
            <TabsTrigger key={t.nilai} value={t.nilai}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="kantor" className="space-y-6">
          <ProfilKantor />
          <PekanKerja />
        </TabsContent>
        <TabsContent value="rem" className="space-y-6">
          <Rem />
        </TabsContent>
        <TabsContent value="libur">
          <LiburKantor />
        </TabsContent>
        <TabsContent value="tarif">
          <TarifGaji />
        </TabsContent>
        <TabsContent value="rute">
          <RuteKolektor />
        </TabsContent>
        <TabsContent value="kampung">
          <DaftarKampung />
        </TabsContent>
      </Tabs>
    </>
  );
}
