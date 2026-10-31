import { kunci } from "@opennael/api-client";
import { useQueryClient } from "@tanstack/react-query";

/** Sesudah aksi tulis: segarkan daftar & rincian nasabah. */
export function useSegarkanNasabah() {
  const klien = useQueryClient();
  return () => {
    void klien.invalidateQueries({ queryKey: kunci.nasabah });
    void klien.invalidateQueries({ queryKey: kunci.kebijakan });
  };
}
