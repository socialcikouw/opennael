import { geserTanggal } from "@opennael/domain";
import { angka, tanggal as formatTanggal, persen, rupiah, tanggalPendek } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { ambil, api } from "@/lib/api";

/** Grafik 30 hari: setoran murni (batang) dan performa % (garis) — aturan-usaha N. */
export function GrafikPerforma({ sampai }: { sampai: string }) {
  const mulai = geserTanggal(sampai, -29);
  const q = useQuery({
    queryKey: ["ringkasan", "performa", mulai, sampai],
    queryFn: () =>
      ambil(() => api.pelaporan.ringkasan.performa.$get({ query: { mulai, selesai: sampai } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={q.data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="tanggal"
            tickFormatter={tanggalPendek}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            fontSize={12}
          />
          <YAxis
            yAxisId="rp"
            tickFormatter={(n: number) => `${angka(Math.round(n / 1000))} rb`}
            tickLine={false}
            axisLine={false}
            width={72}
            fontSize={12}
          />
          <YAxis
            yAxisId="persen"
            orientation="right"
            domain={[0, "auto"]}
            tickFormatter={(n: number) => `${n}%`}
            tickLine={false}
            axisLine={false}
            width={44}
            fontSize={12}
          />
          <Tooltip
            labelFormatter={(t) => formatTanggal(String(t))}
            formatter={(nilai, nama) =>
              nama === "persentase"
                ? [nilai == null ? "—" : persen(Number(nilai)), "Performa"]
                : [rupiah(Number(nilai)), "Setoran murni"]
            }
          />
          <Bar
            yAxisId="rp"
            dataKey="setoranMurni"
            fill="var(--chart-1)"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Line
            yAxisId="persen"
            dataKey="persentase"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
