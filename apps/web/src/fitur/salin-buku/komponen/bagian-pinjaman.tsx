import { type JenisPinjaman, TENOR_PINJAMAN } from "@opennael/domain";
import { LABEL_JENIS } from "@opennael/format";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { Input } from "@/komponen/ui/input";
import type { FormulirSalin } from "../data";

/** Bagian bawah formulir salin: jenis, tenor, pokok, tanggal akad & sisa di buku. */
export function BagianPinjaman({ f }: { f: FormulirSalin }) {
  const {
    jenis,
    setJenis,
    tenor,
    setTenor,
    pokok,
    setPokok,
    hariIni,
    tanggalAkad,
    setTanggalAkad,
    saldo,
    setSaldo,
    tabungan,
    setTabungan,
    pinjamanKe,
    setPinjamanKe,
    macet,
    setMacet,
  } = f;
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Medan label="Jenis">
        <PilihanAsli
          value={jenis}
          onChange={(e) => {
            const j = e.target.value as JenisPinjaman;
            setJenis(j);
            setTenor(TENOR_PINJAMAN[j][0] ?? 0);
          }}
        >
          {(Object.keys(LABEL_JENIS) as JenisPinjaman[]).map((j) => (
            <option key={j} value={j}>
              {LABEL_JENIS[j]}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <Medan label={jenis === "tempoan" ? "Jangka" : "Tenor"}>
        <PilihanAsli value={tenor} onChange={(e) => setTenor(Number(e.target.value))}>
          {TENOR_PINJAMAN[jenis].map((t) => (
            <option key={t} value={t}>
              {t} {jenis === "tempoan" ? "hari" : "kali"}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <IsianRupiah label="Pokok" nilai={pokok} ubah={setPokok} />
      <Medan label="Tanggal Akad Di Buku">
        <Input
          type="date"
          max={hariIni}
          value={tanggalAkad}
          onChange={(e) => setTanggalAkad(e.target.value)}
        />
      </Medan>
      <IsianRupiah label="Sisa Saldo Di Buku" nilai={saldo} ubah={setSaldo} />
      <IsianRupiah label="Tabungan Di Buku" nilai={tabungan} ubah={setTabungan} />
      <Isian
        label="Pinjaman ke (opsional)"
        inputMode="numeric"
        placeholder="otomatis"
        value={pinjamanKe}
        onChange={(e) => setPinjamanKe(e.target.value.replace(/\D/g, ""))}
      />
      <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={macet}
          onChange={(e) => setMacet(e.target.checked)}
        />
        Di buku sudah macet
      </label>
    </section>
  );
}
