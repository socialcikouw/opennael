import { createHash, timingSafeEqual } from "node:crypto";
import type { LoginInput, Profil, RegistrasiInput, Sesi } from "@opennael/contracts";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../../../platform/db/klien";
import { kantor, pekanKerja, pengguna, perangkat, tarifGaji } from "../../../platform/db/skema";
import type { Aktor } from "../../../platform/http/aktor";
import { bentrok, dilarang, galatPostgres, tidakSah } from "../../../platform/http/galat";
import { cocokSandi, hashSandi, samakanWaktu } from "./sandi";
import { AKSES_BERLAKU_DETIK, buatTokenAkses, buatTokenSegar, SESI_BERLAKU_MS } from "./token";

/** Pekan kerja pertama setiap kantor: Senin–Sabtu. */
const HARI_KERJA_AWAL = 126;
/** Tarif gaji kantor pertama: 5% storting (docs/skema/schema-tarif-gaji.md). */
const TARIF_AWAL_BP = 500;

type InfoPerangkat = RegistrasiInput["perangkat"];

export interface AuthDeps {
  db: Db;
  jwtRahasia: string;
  sesiRahasia: string;
  /** Kosong = registrasi kantor baru ditutup. */
  kodeRegistrasi?: string | undefined;
  /** Jam — diganti di uji. */
  sekarang?: () => Date;
}

const KREDENSIAL_SALAH = () => tidakSah("KREDENSIAL_SALAH", "Nomor HP atau kata sandi salah");
const TOKEN_TIDAK_SAH = () => tidakSah("SESI_TIDAK_SAH", "Sesi tidak berlaku — silakan masuk lagi");

/** Bandingkan kode registrasi tanpa membocorkan panjang/isinya lewat waktu. */
function kodeCocok(diberikan: string, seharusnya: string): boolean {
  const a = createHash("sha256").update(diberikan).digest();
  const b = createHash("sha256").update(seharusnya).digest();
  return timingSafeEqual(a, b);
}

export function buatLayananAuth(deps: AuthDeps) {
  const akses = buatTokenAkses(deps.jwtRahasia);
  const segar = buatTokenSegar(deps.sesiRahasia);
  const sekarang = deps.sekarang ?? (() => new Date());

  async function profil(db: Db, penggunaId: string): Promise<Profil> {
    const [baris] = await db
      .select({
        id: pengguna.id,
        nama: pengguna.nama,
        peran: pengguna.peran,
        nomorHp: pengguna.nomorHp,
        kantorId: kantor.id,
        kantorNama: kantor.nama,
        zonaWaktu: kantor.zonaWaktu,
      })
      .from(pengguna)
      .innerJoin(kantor, eq(kantor.id, pengguna.kantorId))
      .where(and(eq(pengguna.id, penggunaId), isNull(pengguna.dinonaktifkanAt)))
      .limit(1);
    if (!baris) throw TOKEN_TIDAK_SAH();
    return {
      id: baris.id,
      nama: baris.nama,
      peran: baris.peran,
      nomorHp: baris.nomorHp,
      kantor: { id: baris.kantorId, nama: baris.kantorNama, zonaWaktu: baris.zonaWaktu },
    };
  }

  /** Pasangan token untuk perangkat pada putaran tertentu. */
  async function token(a: Aktor, putaran: number) {
    return {
      tokenAkses: await akses.tandatangani(a, sekarang()),
      tokenSegar: segar.buat(a.perangkatId, putaran),
      aksesBerlakuDetik: AKSES_BERLAKU_DETIK,
    };
  }

  /** Catat perangkat baru untuk akun itu dan buka sesinya. */
  async function mulaiSesi(
    db: Db,
    akun: { id: string; kantorId: string; peran: Aktor["peran"] },
    info: InfoPerangkat,
  ): Promise<{ sesi: Sesi; perangkatId: string }> {
    const kini = sekarang();
    const [p] = await db
      .insert(perangkat)
      .values({
        penggunaId: akun.id,
        kantorId: akun.kantorId,
        nama: info?.nama ?? null,
        platform: info?.platform ?? null,
        kedaluwarsaAt: new Date(kini.getTime() + SESI_BERLAKU_MS),
        terakhirAktifAt: kini,
      })
      .returning({ id: perangkat.id, putaran: perangkat.putaran });
    if (!p) throw new Error("gagal mencatat perangkat");
    const aktor: Aktor = {
      penggunaId: akun.id,
      kantorId: akun.kantorId,
      peran: akun.peran,
      perangkatId: p.id,
    };
    const sesi = { ...(await token(aktor, p.putaran)), pengguna: await profil(db, akun.id) };
    return { sesi, perangkatId: p.id };
  }

  return {
    /**
     * Bos membuka kantor baru — BERKODE. Satu transaksi: kantor, akun bos,
     * pekan kerja pertama, tarif gaji kantor pertama, dan perangkat pertama;
     * tak ada kantor tanpa bos, atau akun tanpa sesi yang bisa dipakai.
     */
    async registrasi(input: RegistrasiInput): Promise<Sesi> {
      if (!deps.kodeRegistrasi || !kodeCocok(input.kodeRegistrasi, deps.kodeRegistrasi)) {
        throw dilarang("REGISTRASI_DITUTUP", "Kode registrasi tidak berlaku");
      }
      // Hash di luar transaksi: kerja CPU tak menahan koneksi database.
      const hash = await hashSandi(input.sandi);
      try {
        return await deps.db.transaction(async (tx) => {
          const [k] = await tx
            .insert(kantor)
            .values({ nama: input.namaKantor, zonaWaktu: input.zonaWaktu })
            .returning({ id: kantor.id });
          if (!k) throw new Error("gagal membuat kantor");
          const [bos] = await tx
            .insert(pengguna)
            .values({
              kantorId: k.id,
              peran: "bos",
              nama: input.nama,
              nomorHp: input.nomorHp,
              hashSandi: hash,
            })
            .returning({ id: pengguna.id, kantorId: pengguna.kantorId, peran: pengguna.peran });
          if (!bos) throw new Error("gagal membuat akun bos");
          const hariIni = sql`kantor_hari_ini(${k.id})`;
          await tx.insert(pekanKerja).values({
            kantorId: k.id,
            berlakuMulai: hariIni,
            hariKerja: HARI_KERJA_AWAL,
            dibuatOleh: bos.id,
          });
          await tx.insert(tarifGaji).values({
            kantorId: k.id,
            tarifBp: TARIF_AWAL_BP,
            berlakuMulai: hariIni,
            dibuatOleh: bos.id,
          });
          return (await mulaiSesi(tx, bos, input.perangkat)).sesi;
        });
      } catch (e) {
        if (galatPostgres(e)?.constraint_name === "uniq_pengguna_nomor_hp_bos") {
          throw bentrok("NOMOR_HP_DIPAKAI", "Nomor HP ini sudah dipakai akun bos lain");
        }
        throw e;
      }
    },

    /**
     * Bos masuk dengan nomor HP + kata sandi. "Nomor tak terdaftar" dan
     * "sandi salah" dijawab sama — pesan maupun lamanya. Peran lain tak
     * pernah ditemukan di sini (mereka masuk lewat tautan QR).
     */
    async login(input: LoginInput): Promise<Sesi> {
      const [akun] = await deps.db
        .select({
          id: pengguna.id,
          kantorId: pengguna.kantorId,
          peran: pengguna.peran,
          hashSandi: pengguna.hashSandi,
        })
        .from(pengguna)
        .where(
          and(
            eq(pengguna.nomorHp, input.nomorHp),
            eq(pengguna.peran, "bos"),
            isNull(pengguna.dinonaktifkanAt),
          ),
        )
        .limit(1);
      if (!akun?.hashSandi) {
        await samakanWaktu(input.sandi);
        throw KREDENSIAL_SALAH();
      }
      if (!(await cocokSandi(input.sandi, akun.hashSandi))) throw KREDENSIAL_SALAH();
      return (await mulaiSesi(deps.db, akun, input.perangkat)).sesi;
    },

    /**
     * Rotasi token segar (docs/skema/schema-perangkat.md):
     * - putaran sekarang → putar maju, jawab token putaran baru;
     * - putaran SEBELUMNYA (jawaban hilang di jalan / dua refresh bersamaan)
     *   → jawab token putaran sekarang tanpa memutar;
     * - lebih tua → tanda dicuri: perangkat diputus `pakai_ulang`.
     */
    async refresh(tokenSegar: string) {
      const t = segar.urai(tokenSegar);
      if (!t) throw TOKEN_TIDAK_SAH();
      const hasil = await deps.db.transaction(async (tx) => {
        const [p] = await tx
          .select({
            id: perangkat.id,
            penggunaId: perangkat.penggunaId,
            kantorId: perangkat.kantorId,
            putaran: perangkat.putaran,
            kedaluwarsaAt: perangkat.kedaluwarsaAt,
            diputusAt: perangkat.diputusAt,
            peran: pengguna.peran,
            nonaktifAt: pengguna.dinonaktifkanAt,
          })
          .from(perangkat)
          .innerJoin(pengguna, eq(pengguna.id, perangkat.penggunaId))
          .where(eq(perangkat.id, t.perangkatId))
          .for("update", { of: perangkat })
          .limit(1);
        if (!p || p.diputusAt || p.nonaktifAt) return { galat: true as const };
        const kini = sekarang();
        const putus = async (alasan: "kedaluwarsa" | "pakai_ulang") => {
          await tx
            .update(perangkat)
            .set({ diputusAt: kini, alasanPutus: alasan })
            .where(eq(perangkat.id, p.id));
          return { galat: true as const };
        };
        if (p.kedaluwarsaAt <= kini) return putus("kedaluwarsa");
        if (t.putaran < p.putaran - 1) return putus("pakai_ulang");
        if (t.putaran > p.putaran) return { galat: true as const };

        let putaran = p.putaran;
        if (t.putaran === p.putaran) {
          putaran = p.putaran + 1;
          await tx
            .update(perangkat)
            .set({
              putaran,
              terakhirAktifAt: kini,
              kedaluwarsaAt: new Date(kini.getTime() + SESI_BERLAKU_MS),
            })
            .where(eq(perangkat.id, p.id));
        }
        const aktor: Aktor = {
          penggunaId: p.penggunaId,
          kantorId: p.kantorId,
          peran: p.peran,
          perangkatId: p.id,
        };
        return { galat: false as const, aktor, putaran };
      });
      // Pemutusan sudah tersimpan (transaksi selesai) sebelum galat dilempar.
      if (hasil.galat) throw TOKEN_TIDAK_SAH();
      return token(hasil.aktor, hasil.putaran);
    },

    /** Memutus perangkat yang sedang dipakai. */
    async keluar(a: Aktor): Promise<void> {
      await deps.db
        .update(perangkat)
        .set({ diputusAt: sekarang(), diputusOleh: a.penggunaId, alasanPutus: "keluar" })
        .where(and(eq(perangkat.id, a.perangkatId), isNull(perangkat.diputusAt)));
    },

    saya: (a: Aktor) => profil(deps.db, a.penggunaId),

    periksaTokenAkses: (tokenAkses: string) => akses.periksa(tokenAkses),

    /** Catat perangkat baru & buka sesinya — dipakai penautan QR. */
    bukaSesi: mulaiSesi,
  };
}

export type LayananAuth = ReturnType<typeof buatLayananAuth>;
