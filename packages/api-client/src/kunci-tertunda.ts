/**
 * KUNCI TERTUNDA — `Idempotency-Key` sebuah permintaan tulis yang BELUM
 * mendapat jawaban pasti (jaringan putus, batas waktu, gerbang 502–504). Hasil
 * permintaan seperti itu tidak diketahui: bisa jadi server sudah mencatatnya
 * dan hanya jawabannya yang hilang. Kunci disimpan menurut "sidik" permintaan
 * (pengguna + metode + jalur + isi), jadi mengirim ulang permintaan yang sama —
 * otomatis oleh transport, atau diketuk ulang oleh pengguna — memakai kunci yang
 * sama dan server menjawab dengan hasil yang sudah tercatat, bukan mencatat
 * dua kali. Begitu ada jawaban pasti, kunci dibuang: permintaan serupa
 * berikutnya adalah kejadian baru.
 */
export interface KunciTertunda {
  kunci: string;
  /** Epoch ms saat kunci dibuat; kunci terlalu tua tidak dipakai lagi. */
  dibuat: number;
}

/** Tempat kunci tertunda disimpan — disuntik aplikasi (memori, `localStorage`, brankas HP). */
export interface PenyimpanKunci {
  ambil(sidik: string): KunciTertunda | undefined | Promise<KunciTertunda | undefined>;
  simpan(sidik: string, nilai: KunciTertunda): void | Promise<void>;
  hapus(sidik: string): void | Promise<void>;
}

/** Media tulis-baca satu teks JSON (`null` = kosong) — `localStorage`, `SecureStore`, dll. */
export interface MediumKunci {
  baca(): string | null | Promise<string | null>;
  tulis(teks: string | null): void | Promise<void>;
}

type Peta = Record<string, KunciTertunda>;

/** Batas jumlah kunci tertunda; yang paling lama dibuang (brankas HP ±2 KB per nilai). */
const MAKS_BAWAAN = 16;

function bacaPeta(teks: string | null): Peta {
  if (!teks) return {};
  try {
    const isi: unknown = JSON.parse(teks);
    if (!isi || typeof isi !== "object" || Array.isArray(isi)) return {};
    const peta: Peta = {};
    for (const [sidik, nilai] of Object.entries(isi)) {
      const n = nilai as Partial<KunciTertunda> | null;
      if (n && typeof n.kunci === "string" && typeof n.dibuat === "number") {
        peta[sidik] = { kunci: n.kunci, dibuat: n.dibuat };
      }
    }
    return peta;
  } catch {
    return {};
  }
}

/**
 * Penyimpan kunci tertunda. Peta ada di memori (pembaruan seketika, tak bisa
 * gagal) dan ditulis ke `medium` bila ada — penulisan serial dan sebisanya:
 * medium yang rusak tidak menggagalkan permintaan, hanya membuat kunci tak
 * bertahan sesudah aplikasi ditutup.
 */
export function buatPenyimpanKunci(
  medium?: MediumKunci,
  opsi: { maks?: number } = {},
): PenyimpanKunci {
  const maks = opsi.maks ?? MAKS_BAWAAN;
  let peta: Peta = {};
  let dimuat: Promise<void> | null = null;
  let antrean: Promise<void> = Promise.resolve();

  const muat = () =>
    (dimuat ??= (async () => {
      if (!medium) return;
      try {
        // Yang sudah ditulis lebih dulu di sesi ini menang atas isi lama di medium.
        peta = { ...bacaPeta(await medium.baca()), ...peta };
      } catch {
        // medium tak terbaca → mulai kosong
      }
    })());

  /** Tulis keadaan terkini ke medium, berurutan; tak pernah menolak. */
  const tulis = () => {
    if (!medium) return antrean;
    antrean = antrean.then(async () => {
      try {
        await medium.tulis(Object.keys(peta).length ? JSON.stringify(peta) : null);
      } catch {
        // sebisanya
      }
    });
    return antrean;
  };

  return {
    async ambil(sidik) {
      await muat();
      return peta[sidik];
    },
    async simpan(sidik, nilai) {
      await muat();
      peta[sidik] = nilai;
      const urut = Object.entries(peta).sort(([, a], [, b]) => a.dibuat - b.dibuat);
      for (const [lama] of urut.slice(0, Math.max(0, urut.length - maks))) delete peta[lama];
      await tulis();
    },
    async hapus(sidik) {
      await muat();
      delete peta[sidik];
      void tulis(); // tak ditunggu: jawaban pasti tak perlu menunggu medium
    },
  };
}

/** Isi JSON dengan kunci diurutkan — urutan properti tidak mengubah identitas permintaan. */
export function kanonikJson(teks: string): string {
  const urut = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(urut)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, urut((x as Record<string, unknown>)[k])]),
          )
        : x;
  try {
    return JSON.stringify(urut(JSON.parse(teks)));
  } catch {
    return teks;
  }
}

/**
 * Ringkasan teks 53-bit (cyrb53, bukan kriptografi) sebagai kunci peta: isi
 * permintaan tak perlu ikut tersimpan di brankas. Tabrakan tak berbahaya —
 * kunci yang terpakai untuk isi lain ditolak server (409).
 */
export function sidikRingkas(teks: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < teks.length; i++) {
    const c = teks.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
