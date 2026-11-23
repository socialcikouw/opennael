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
      className={cn(bahaya && "text-bahaya hover:text-bahaya-tua")}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
