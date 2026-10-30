import { angka, tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { DaftarAktivitas } from "@/fitur/aktivitas";
import {
  GalatMuat,
  KartuAngka,
  KepalaHalaman,
  Kosong,
  Memuat,
  PilihTanggal,
} from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/komponen/ui/card";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { ambilPerKolektor, type PerKolektor } from "./data";
import { GrafikPerforma } from "./komponen/grafik-performa";

const rute = getRouteApi("/_bos/");

const k = pembantuKolom<PerKolektor>();

const KOLOM: Kolom<PerKolektor>[] = [
  k.accessor((r) => r.kolektor.nama, { id: "kolektor", header: "Kolektor" }),
  k.accessor((r) => r.penagihan.jumlahSetoran, {
    id: "setoran",
    header: "Setoran",
    cell: (c) => angka(c.getValue()),
    meta: { kanan: true },
  }),
  k.accessor((r) => r.penagihan.storting, {
    id: "storting",
    header: "Storting",
    cell: (c) => rupiah(c.getValue()),
    meta: { kanan: true },
  }),
  k.accessor((r) => r.akad.droping, {
    id: "droping",
    header: "Droping",
    cell: (c) => rupiah(c.getValue()),
    meta: { kanan: true },
  }),
  k.accessor((r) => r.kasLapangan.tunaiDiterima, {
    id: "diterima",
    header: "Tunai diterima",
    cell: (c) => rupiah(c.getValue()),
    meta: { kanan: true },
  }),
  k.accessor((r) => r.kasLapangan.lebihSetor - r.kasLapangan.tekor, {
    id: "selisih",
    header: "Selisih setor",
    cell: (c) => {
      const n = c.getValue();
      return (
        <span className={n < 0 ? "text-red-700" : n > 0 ? "text-emerald-700" : undefined}>
          {n === 0 ? "—" : rupiah(n)}
        </span>
      );
    },
    meta: { kanan: true },
  }),
] as Kolom<PerKolektor>[];

/** Beranda bos: angka satu hari, per kolektor, performa 30 hari, aktivitas terbaru. */
export function LayarBeranda() {
  const hariIni = useHariIni();
  const { tanggal } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const t = tanggal ?? hariIni;
  const ubahTanggal = (baru: string) =>
    void navigasi({ search: { tanggal: baru === hariIni ? undefined : baru } });

  const ringkasan = useQuery({
    queryKey: ["ringkasan", t],
    queryFn: () => ambil(() => api.pelaporan.ringkasan.$get({ query: { mulai: t, selesai: t } })),
  });
  const perKolektor = useQuery({
    queryKey: ["ringkasan", "per-kolektor", t],
    queryFn: () => ambilPerKolektor(t),
  });

  const r = ringkasan.data;
  const selisih = r ? r.kasLapangan.lebihSetor - r.kasLapangan.tekor : 0;

  return (
    <>
      <KepalaHalaman
        judul="Beranda"
        keterangan={t === hariIni ? `Hari ini · ${formatTanggal(t)}` : formatTanggal(t)}
        aksi={<PilihTanggal nilai={t} ubah={ubahTanggal} paling={hariIni} />}
      />

      {ringkasan.isError ? (
        <GalatMuat galat={ringkasan.error} ulangi={() => void ringkasan.refetch()} />
      ) : !r ? (
        <Memuat />
      ) : (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KartuAngka
            label="Storting"
            nilai={rupiah(r.penagihan.storting)}
            catatan={`${angka(r.penagihan.jumlahSetoran)} setoran · murni ${rupiah(r.penagihan.setoranMurni)}`}
          />
          <KartuAngka
            label="Droping"
            nilai={rupiah(r.akad.droping)}
            catatan={`${angka(r.akad.jumlahAkad)} akad · cair ${rupiah(r.akad.pencairan)}`}
          />
          <KartuAngka
            label="Tunai diterima"
            nilai={rupiah(r.kasLapangan.tunaiDiterima)}
            catatan={`${angka(r.kasLapangan.hariKerja)} kolektor masuk · transfer ${rupiah(r.kasLapangan.transfer)}`}
          />
          <KartuAngka
            label="Selisih setor"
            nilai={selisih === 0 ? "—" : rupiah(selisih)}
            nada={selisih < 0 ? "buruk" : selisih > 0 ? "baik" : undefined}
            catatan={`tekor ${rupiah(r.kasLapangan.tekor)} · lebih ${rupiah(r.kasLapangan.lebihSetor)}`}
          />
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Per kolektor</CardTitle>
          <CardDescription>
            Penagihan, akad, dan setoran sore {formatTanggal(t, "tanpa")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {perKolektor.isError ? (
            <GalatMuat galat={perKolektor.error} ulangi={() => void perKolektor.refetch()} />
          ) : !perKolektor.data ? (
            <Memuat />
          ) : (
            <TabelData
              kolom={KOLOM}
              data={perKolektor.data}
              idBaris={(b) => b.kolektor.id}
              kosong="Belum ada kolektor — tautkan HP kolektor lebih dulu"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performa penagihan 30 hari</CardTitle>
          <CardDescription>
            Batang: setoran murni. Garis: persentase terhadap angsuran berjalan kemarin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GrafikPerforma sampai={t} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas terbaru</CardTitle>
          <CardAction>
            <Button asChild size="sm" variant="outline">
              <Link to="/aktivitas" search={{ tanggal: t === hariIni ? undefined : t }}>
                Lihat semua
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DaftarAktivitas tanggal={t} batas={6} kosong={<Kosong>Belum ada aktivitas</Kosong>} />
        </CardContent>
      </Card>
    </>
  );
}
