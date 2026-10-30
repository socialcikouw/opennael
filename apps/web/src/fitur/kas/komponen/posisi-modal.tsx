import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { ambil, api } from "@/lib/api";
import { Baris } from "./baris";

const rp = (n: number | null) => (n === null ? "—" : rupiah(n));

/** Posisi modal pada akhir satu tanggal (aturan-usaha M). */
export function PosisiModal({ tanggal }: { tanggal: string }) {
  const q = useQuery({
    queryKey: ["kas", "posisi-modal", tanggal],
    queryFn: () => ambil(() => api.kas.kas["posisi-modal"].$get({ query: { tanggal } })),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Posisi modal</CardTitle>
        <CardDescription>Akhir {formatTanggal(tanggal)}</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <Memuat />
        ) : q.isError ? (
          <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
        ) : (
          <div className="divide-y">
            <Baris label="Saldo tunai">{rp(q.data.saldoTunai)}</Baris>
            <Baris label="· dibawa kolektor">{rp(q.data.kasDiLapangan)}</Baris>
            <Baris label="· di brankas">{rp(q.data.diBrankas)}</Baris>
            <Baris label="Saldo bank">{rp(q.data.saldoBank)}</Baris>
            <Baris label="Piutang berjalan">{rp(q.data.piutangBerjalan)}</Baris>
            <Baris label="Piutang macet">{rp(q.data.piutangMacet)}</Baris>
            <Baris label="− Tabungan nasabah">{rupiah(q.data.tabunganNasabah)}</Baris>
            <Baris label="Posisi modal" tebal>
              {rp(q.data.posisiModal)}
            </Baris>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
