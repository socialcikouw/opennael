import type { KartuPinjaman } from "@opennael/contracts";
import { Badge } from "@/komponen/ui/badge";
import { LABEL_STATUS } from "@/lib/status-pinjaman";

export function LencanaStatus({ status }: { status: KartuPinjaman["status"] }) {
  const s = LABEL_STATUS[status];
  return <Badge variant={s.nada}>{s.label}</Badge>;
}
