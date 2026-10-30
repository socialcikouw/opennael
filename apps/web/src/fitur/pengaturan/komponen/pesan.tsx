import { PesanGalat } from "@/komponen/formulir";

export function Pesan({ ok, galat }: { ok?: string | null; galat?: string | null | undefined }) {
  if (galat) return <PesanGalat pesan={galat} />;
  if (ok) return <p className="text-sm text-emerald-700">{ok}</p>;
  return null;
}
