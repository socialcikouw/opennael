import type { DataKueri } from "@opennael/api-client";
import type { kueri } from "@/lib/api";

export type PerKolektor = DataKueri<ReturnType<typeof kueri.ringkasan.perKolektor>>[number];
