import { Button } from "@/komponen/ui/button";
import { cn } from "@/lib/utils";

/** Satu tombol ikon kecil di sel tabel. */
export function TombolSel({
  label,
  bahaya,
  onClick,
  children,
}: {
  label: string;
  bahaya?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      title={label}
      aria-label={label}
      className={cn(bahaya && "text-red-700 hover:text-red-800")}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
