import { GalatAturan } from "./galat";

/** Kode galat aturan yang dilempar `f` (null bila tidak melempar) — pembantu uji. */
export const kode = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    if (e instanceof GalatAturan) return e.kode;
    throw e;
  }
  return null;
};
