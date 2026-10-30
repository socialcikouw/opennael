import { useEffect, useState } from "react";

/** Nilai yang berhenti berubah `ms` milidetik — mis. ketikan pencarian sebelum ke server. */
export function useTenang<T>(nilai: T, ms = 300) {
  const [tenang, setTenang] = useState(nilai);
  useEffect(() => {
    const t = setTimeout(() => setTenang(nilai), ms);
    return () => clearTimeout(t);
  }, [nilai, ms]);
  return tenang;
}
