// ---- rem ----------------------------------------------------------------------------

export type IsiRem = { baru: boolean; naik: boolean; gulung: boolean; alasan: string };

export const keInput = (r: IsiRem) => ({
  pinjamanBaruDikunci: r.baru,
  naikPinjamanDikunci: r.naik,
  gulungPinjamanDikunci: r.gulung,
  alasanKunci: r.alasan.trim() || null,
});
