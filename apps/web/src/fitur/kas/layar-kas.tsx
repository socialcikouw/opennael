import { geserTanggal } from "@opennael/domain";
import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Pencil, Plus, Scale, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { GalatMuat, KartuAngka, KepalaHalaman, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { ambilLaporan, type Gerakan, KUNCI_KAS } from "./data";
import { LABEL_MUTASI } from "./inti";
import { BukaBukuKas } from "./komponen/buka-buku-kas";
import { DaftarPencocokan } from "./komponen/daftar-pencocokan";
import { DialogCocokkan } from "./komponen/dialog-cocokkan";
import { DialogKasAwal } from "./komponen/dialog-kas-awal";
import { DialogMutasi } from "./komponen/dialog-mutasi";
import { PosisiModal } from "./komponen/posisi-modal";

const rute = getRouteApi("/_bos/kas");

const LABEL_SUMBER = {
  mutasi: "Mutasi",
  serah_terima: "Setoran sore",
  transfer_setoran: "Transfer setoran",
  transfer_lama: "Transfer (sistem lama)",
  penarikan_tabungan: "Penarikan tabungan",
  pembayaran_gaji: "Gaji kolektor",
} as const;

type Rentang = "hari" | "pekan" | "bulan";

/** Buku kas kantor: saldo per akun, gerakan, mutasi, pencocokan, posisi modal. */
export function LayarKas() {
  const hariIni = useHariIni();
  const { mulai: m0, selesai: s0, tab } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const selesai = s0 ?? hariIni;
  const mulai = m0 ?? selesai;
  const [dialog, setDialog] = useState<"mutasi" | "cocokkan" | "kas-awal" | null>(null);
  const [batal, setBatal] = useState<Gerakan | null>(null);

  const q = useQuery({
    queryKey: ["kas", "laporan", mulai, selesai],
    queryFn: () => ambilLaporan(mulai, selesai),
  });

  const pakaiRentang = (r: Rentang) => {
    const dari =
      r === "hari"
        ? hariIni
        : r === "pekan"
          ? geserTanggal(hariIni, -6)
          : `${hariIni.slice(0, 8)}01`;
    void navigasi({
      search: (s) => ({ ...s, mulai: dari === hariIni ? undefined : dari, selesai: undefined }),
    });
  };

  const kolom = useMemo(() => {
    const k = pembantuKolom<Gerakan>();
    return [
      k.accessor("tanggal", {
        header: "Tanggal",
        cell: (c) => formatTanggal(c.getValue(), "tanpa"),
      }),
      k.accessor("akun", { header: "Akun" }),
      k.accessor(
        (g) => (g.sumber === "mutasi" && g.jenis ? LABEL_MUTASI[g.jenis] : LABEL_SUMBER[g.sumber]),
        {
          id: "sumber",
          header: "Sumber",
        },
      ),
      k.accessor((g) => g.keterangan ?? "", {
        id: "keterangan",
        header: "Keterangan",
        cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
      }),
      k.accessor((g) => Math.max(g.nominal, 0), {
        id: "masuk",
        header: "Masuk",
        meta: { kanan: true },
        cell: (c) =>
          c.getValue() ? <span className="text-emerald-700">{rupiah(c.getValue())}</span> : "",
      }),
      k.accessor((g) => Math.max(-g.nominal, 0), {
        id: "keluar",
        header: "Keluar",
        meta: { kanan: true },
        cell: (c) => (c.getValue() ? rupiah(c.getValue()) : ""),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const g = c.row.original;
          if (g.sumber !== "mutasi" || g.tanggal !== hariIni) return null;
          return (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan mutasi"
              aria-label="Batalkan mutasi"
              className="text-red-700"
              onClick={() => setBatal(g)}
            >
              <Undo2 />
            </Button>
          );
        },
      }),
    ] as Kolom<Gerakan>[];
  }, [hariIni]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const r = q.data;

  if (!r.bukuKas) {
    return (
      <>
        <KepalaHalaman judul="Kas" keterangan="Buku kas kantor belum dibuka." />
        <BukaBukuKas />
      </>
    );
  }
  const buku = r.bukuKas;

  return (
    <>
      <KepalaHalaman
        judul="Kas"
        keterangan={`${mulai === selesai ? formatTanggal(selesai) : `${formatTanggal(mulai, "tanpa")} – ${formatTanggal(selesai, "tanpa")}`} · buku dibuka ${formatTanggal(buku.tanggalBuka, "tanpa")}`}
        aksi={
          <>
            {buku.tanggalBuka === hariIni ? (
              <Button variant="outline" onClick={() => setDialog("kas-awal")}>
                <Pencil />
                Kas awal
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialog("cocokkan")}>
              <Scale />
              Cocokkan kas
            </Button>
            <Button onClick={() => setDialog("mutasi")}>
              <Plus />
              Catat mutasi
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["hari", "Hari ini"],
            ["pekan", "7 hari"],
            ["bulan", "Bulan ini"],
          ] as const
        ).map(([nilai, label]) => (
          <Button key={nilai} size="sm" variant="outline" onClick={() => pakaiRentang(nilai)}>
            {label}
          </Button>
        ))}
        <Input
          type="date"
          className="w-40"
          aria-label="Mulai"
          value={mulai}
          max={selesai}
          onChange={(e) =>
            e.target.value && void navigasi({ search: (s) => ({ ...s, mulai: e.target.value }) })
          }
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="date"
          className="w-40"
          aria-label="Selesai"
          value={selesai}
          min={mulai}
          max={hariIni}
          onChange={(e) =>
            e.target.value && void navigasi({ search: (s) => ({ ...s, selesai: e.target.value }) })
          }
        />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuAngka
          label="Saldo tunai akhir"
          nilai={rupiah(r.tunai.saldoAkhir)}
          catatan={`awal ${rupiah(r.tunai.saldoAwal)} · +${rupiah(r.tunai.masuk)} · −${rupiah(r.tunai.keluar)}`}
        />
        <KartuAngka
          label="Saldo bank akhir"
          nilai={rupiah(r.bank.saldoAkhir)}
          catatan={`awal ${rupiah(r.bank.saldoAwal)} · +${rupiah(r.bank.masuk)} · −${rupiah(r.bank.keluar)}`}
        />
        <KartuAngka
          label="Kas di lapangan (kini)"
          nilai={rupiah(r.kasDiLapangan)}
          catatan="dibawa kolektor, belum diserahkan"
        />
        <KartuAngka
          label="Brankas seharusnya (kini)"
          nilai={rupiah(r.brankasSeharusnya)}
          catatan="saldo tunai − kas di lapangan"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Tabs
          value={tab ?? "buku"}
          onValueChange={(v) =>
            void navigasi({ search: (s) => ({ ...s, tab: v === "buku" ? undefined : "cocok" }) })
          }
        >
          <TabsList>
            <TabsTrigger value="buku">Buku kas</TabsTrigger>
            <TabsTrigger value="cocok">Pencocokan</TabsTrigger>
          </TabsList>
          <TabsContent value="buku">
            <TabelData
              kolom={kolom}
              data={r.gerakan}
              kosong="Tidak ada gerakan kas pada rentang ini"
            />
          </TabsContent>
          <TabsContent value="cocok">
            <DaftarPencocokan mulai={mulai} selesai={selesai} hariIni={hariIni} />
          </TabsContent>
        </Tabs>
        <PosisiModal tanggal={selesai} />
      </div>

      {dialog === "mutasi" ? <DialogMutasi tutup={() => setDialog(null)} /> : null}
      {dialog === "cocokkan" ? <DialogCocokkan tutup={() => setDialog(null)} /> : null}
      {dialog === "kas-awal" ? (
        <DialogKasAwal
          awal={{ tunai: buku.kasAwalTunai, bank: buku.kasAwalBank }}
          tutup={() => setDialog(null)}
        />
      ) : null}
      {batal ? (
        <DialogBatal
          judul="Batalkan mutasi?"
          keterangan={`${batal.jenis ? LABEL_MUTASI[batal.jenis] : "Mutasi"} ${rupiah(Math.abs(batal.nominal))}${batal.keterangan ? ` — ${batal.keterangan}` : ""}`}
          segarkan={KUNCI_KAS}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.kas.kas.mutasi[":id"].batal.$post({
                param: { id: batal.sumberId },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
