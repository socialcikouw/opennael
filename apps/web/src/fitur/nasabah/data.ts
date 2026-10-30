import { useQueryClient } from "@tanstack/react-query";

/** Sesudah aksi tulis: segarkan daftar & rincian nasabah. */
export function useSegarkanNasabah() {
  const klien = useQueryClient();
  return () => {
    void klien.invalidateQueries({ queryKey: ["nasabah"] });
    void klien.invalidateQueries({ queryKey: ["kebijakan"] });
  };
}
