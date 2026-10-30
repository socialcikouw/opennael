import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Baris({
  label,
  children,
  tebal,
}: {
  label: string;
  children: ReactNode;
  tebal?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-4 py-1.5 text-sm", tebal && "font-semibold")}>
      <span className={tebal ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}
