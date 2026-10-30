import { LABEL_STATUS_PINJAMAN } from "@opennael/format";

/** Nada lencana status pinjaman (tampilan web); teks labelnya dari `@opennael/format`. */
type Nada = "success" | "warning" | "secondary" | "destructive";
type Status = keyof typeof LABEL_STATUS_PINJAMAN;

const NADA: Record<Status, Nada> = {
  berjalan: "success",
  macet: "warning",
  lunas: "secondary",
  digulung: "secondary",
  batal: "destructive",
  diputihkan: "destructive",
};

export const LABEL_STATUS: Record<Status, { label: string; nada: Nada }> = Object.fromEntries(
  (Object.keys(NADA) as Status[]).map((s) => [
    s,
    { label: LABEL_STATUS_PINJAMAN[s], nada: NADA[s] },
  ]),
) as Record<Status, { label: string; nada: Nada }>;
