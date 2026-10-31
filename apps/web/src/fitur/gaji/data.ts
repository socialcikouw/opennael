import type { DataKueri } from "@opennael/api-client";
import type { kueri } from "@/lib/api";

export type Pratinjau = DataKueri<ReturnType<typeof kueri.gaji.pratinjau>>;

export type HariGaji = Pratinjau["hari"][number];

export type Slip = DataKueri<ReturnType<typeof kueri.gaji.slip>>[number];
