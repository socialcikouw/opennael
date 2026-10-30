import { rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { BarisNilai, GalatMuat, Memuat } from "@/komponen/halaman";
import { ambil, api } from "@/lib/api";

// ---- tab rincian ------------------------------------------------------------------

export function Neraca({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["nasabah", "neraca", id],
    queryFn: () => ambil(() => api.pembiayaan.nasabah[":id"].neraca.$get({ param: { id } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const r = q.data;
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      <div className="divide-y">
        <BarisNilai label="Jumlah pinjaman">{r.jumlahPinjaman}</BarisNilai>
        <BarisNilai label="Uang diterima nasabah">{rupiah(r.totalPencairan)}</BarisNilai>
        <BarisNilai label="Tabungan dikembalikan">{rupiah(r.tabunganDikembalikan)}</BarisNilai>
        <BarisNilai label="Total setoran">{rupiah(r.totalSetoran)}</BarisNilai>
        <BarisNilai label="Arus kas kantor">
          <span className={r.arusKas < 0 ? "text-red-700" : "text-emerald-700"}>
            {rupiah(r.arusKas)}
          </span>
        </BarisNilai>
      </div>
      <div className="divide-y">
        <BarisNilai label="Tabungan">{rupiah(r.tabungan)}</BarisNilai>
        <BarisNilai label="Piutang aktif">{rupiah(r.piutangAktif)}</BarisNilai>
        <BarisNilai label="Piutang diputihkan">{rupiah(r.piutangDiputihkan)}</BarisNilai>
        <BarisNilai label="Neraca (tabungan − piutang)">
          <span className={r.neraca < 0 ? "text-red-700" : undefined}>{rupiah(r.neraca)}</span>
        </BarisNilai>
      </div>
    </div>
  );
}
