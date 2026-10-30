import type { Galat } from "@opennael/contracts";

/** Bentuk minimal jawaban (`Response` biasa maupun `ClientResponse` hc). */
type Jawaban = { status: number; json(): Promise<unknown> };

/** Isi jawaban berhasil (200/201) dari union jawaban klien `hc`. */
type IsiBerhasil<R> = R extends { status: 200 | 201; json(): Promise<infer T> } ? T : never;

export const PESAN_JARINGAN_BAWAAN = "Server tidak terjangkau — periksa koneksi";

/**
 * Pembungkus panggilan API. Jawaban di luar `diharapkan` menjadi `Error`
 * berisi pesan server (bila `rincian`, beserta rincian validasi per field),
 * gangguan jaringan menjadi `pesanJaringan`.
 */
export function buatPanggil(opsi: { pesanJaringan?: string; rincian?: boolean } = {}) {
  const pesanJaringan = opsi.pesanJaringan ?? PESAN_JARINGAN_BAWAAN;

  /** Galat API → pesan untuk orang. */
  async function bacaGalat(res: Jawaban): Promise<string> {
    const galat = (await res.json().catch(() => null)) as Galat | null;
    if (!galat) return `Gagal (${res.status})`;
    const rincian = opsi.rincian ? galat.rincian?.map((r) => r.pesan).join("; ") : undefined;
    return `${galat.pesan}${rincian ? ` (${rincian})` : ""}`;
  }

  async function panggil<R extends Jawaban>(
    kirim: () => Promise<R>,
    diharapkan: readonly number[] = [200, 201],
  ): Promise<R> {
    let res: R;
    try {
      res = await kirim();
    } catch {
      throw new Error(pesanJaringan);
    }
    if (!diharapkan.includes(res.status)) throw new Error(await bacaGalat(res));
    return res;
  }

  /** `panggil` lalu baca isi jawaban berhasilnya — untuk `useQuery` & `useMutation`. */
  async function ambil<R extends Jawaban>(kirim: () => Promise<R>): Promise<IsiBerhasil<R>> {
    const res = await panggil(kirim);
    return (await res.json()) as IsiBerhasil<R>;
  }

  return { panggil, ambil, bacaGalat, PESAN_JARINGAN: pesanJaringan };
}
