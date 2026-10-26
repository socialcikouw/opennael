import { UKURAN_FOTO_MAKS } from "@opennael/contracts";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ALAMAT_API, ambilDenganSesi, bacaGalat, PESAN_JARINGAN } from "./api";

/** Sisi terpanjang foto bukti — cukup untuk mengenali wajah & uang, kecil di sinyal lemah. */
const SISI_MAKS = 1280;

/**
 * Kompres foto kamera di HP lalu unggah ke `POST /foto`. Disimpan ulang
 * sebagai WebP baru: EXIF (termasuk lokasi asli kamera) terbuang. Hasil: id foto.
 */
export async function unggahFotoSerahTerima(
  uri: string,
  ukuran: { width: number; height: number },
): Promise<string> {
  const potret = ukuran.height >= ukuran.width;
  const konteks = ImageManipulator.manipulate(uri);
  konteks.resize(potret ? { height: SISI_MAKS } : { width: SISI_MAKS });
  const gambar = await konteks.renderAsync();
  const hasil = await gambar.saveAsync({ format: SaveFormat.WEBP, compress: 0.7 });

  const form = new FormData();
  form.append("jenis", "serah_terima");
  form.append("diambilAt", new Date().toISOString());
  // `File` expo-file-system (bukan bentuk lama { uri, name, type }): `fetch`
  // bawaan Expo SDK 58 = expo/fetch, yang menolak berkas ber-`uri` di FormData
  // ("Unsupported FormDataPart implementation") sebelum apa pun terkirim.
  form.append("berkas", new File(hasil.uri));

  let res: Response;
  try {
    res = await ambilDenganSesi(`${ALAMAT_API}/foto`, { method: "POST", body: form });
  } catch {
    throw new Error(PESAN_JARINGAN);
  }
  if (res.status === 413) {
    throw new Error(`Foto lebih dari ${UKURAN_FOTO_MAKS / 1_000_000} MB — potret ulang`);
  }
  if (res.status !== 201) throw new Error(await bacaGalat(res));
  return ((await res.json()) as { id: string }).id;
}
