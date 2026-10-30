import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";

export function Bagian({
  judul,
  keterangan,
  children,
}: {
  judul: string;
  keterangan?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{judul}</CardTitle>
        {keterangan ? <CardDescription>{keterangan}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
