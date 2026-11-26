import {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";

/**
 * GERAK — kurva & durasi animasi bersama (Reanimated, berjalan di UI thread). Satu tempat
 * supaya gerak di seluruh aplikasi terasa sama. Aturan: UI masuk/keluar memakai `KURVA.keluar`
 * (ease-out kuat: cepat menanggapi, pelan di akhir), perpindahan di layar memakai
 * `KURVA.pindah`; tak pernah ease-in. Animasi UI di bawah 300 ms. Mulai dari skala 0,95, bukan 0.
 * Pengurangan gerak (setelan aksesibilitas HP) dihormati otomatis oleh animasi tata letak
 * Reanimated (`ReduceMotion.System`).
 */
export const KURVA = {
  /** Masuk / keluar layar. */
  keluar: Easing.bezier(0.23, 1, 0.32, 1),
  /** Berpindah tempat di layar (tab bergeser). */
  pindah: Easing.bezier(0.77, 0, 0.175, 1),
} as const;

export const DURASI = {
  /** Perubahan kecil: huruf berganti, chip. */
  kecil: 180,
  /** Kartu / tab masuk. */
  sedang: 240,
  /** Keluar selalu lebih cepat dari masuk. */
  keluar: 150,
} as const;

/** Unsur yang muncul karena keadaan berubah (mis. tab mode baru): memudar masuk. */
export const MUNCUL = FadeIn.duration(DURASI.sedang).easing(KURVA.keluar);
/** Unsur yang hilang karena keadaan berubah: memudar keluar, lebih cepat. */
export const HILANG = FadeOut.duration(DURASI.keluar);
/** Unsur yang tetap tetapi berpindah tempat / berubah lebar (tab bergeser). */
export const GESER = LinearTransition.duration(DURASI.sedang).easing(KURVA.pindah);

/**
 * Pindah langkah di alur bertahap (akad): MAJU = layar baru masuk dari kanan, yang lama
 * keluar ke kiri; MUNDUR = kebalikannya (permintaan pemilik 26 Nov 2026 — seperti membalik
 * lembar). Pemakai membungkus tiap langkah dalam `Animated.View` ber-`key` langkah.
 */
export const GESER_LANGKAH = {
  maju: {
    masuk: SlideInRight.duration(DURASI.sedang).easing(KURVA.keluar),
    keluar: SlideOutLeft.duration(DURASI.sedang).easing(KURVA.keluar),
  },
  mundur: {
    masuk: SlideInLeft.duration(DURASI.sedang).easing(KURVA.keluar),
    keluar: SlideOutRight.duration(DURASI.sedang).easing(KURVA.keluar),
  },
} as const;
