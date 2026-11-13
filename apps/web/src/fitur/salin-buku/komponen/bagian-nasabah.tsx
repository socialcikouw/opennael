import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { Input } from "@/komponen/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import type { FormulirSalin } from "../data";
import { PilihNasabahLama } from "./pilih-nasabah-lama";
import { SaranSerupa } from "./saran-serupa";

/** Bagian atas formulir salin: orang baru (nama, kampung, HP, NIK, pemegang) atau nasabah yang sudah ada. */
export function BagianNasabah({ f }: { f: FormulirSalin }) {
  const {
    modus,
    setModus,
    m,
    lama,
    setLama,
    orang,
    setOrang,
    namaRef,
    kampungQ,
    pilihKolektor,
    setKolektorId,
    kolektorQ,
  } = f;
  return (
    <section className="grid gap-3">
      <Tabs
        value={modus}
        onValueChange={(v) => {
          setModus(v as "baru" | "lama");
          m.reset();
        }}
      >
        <TabsList>
          <TabsTrigger value="baru">Orang Baru</TabsTrigger>
          <TabsTrigger value="lama">Nasabah Yang Sudah Ada</TabsTrigger>
        </TabsList>
      </Tabs>
      {modus === "lama" ? (
        <PilihNasabahLama dipilih={lama} pilih={setLama} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Medan label="Nama">
              <Input
                ref={namaRef}
                value={orang.nama}
                maxLength={50}
                autoFocus
                onChange={(e) => setOrang({ ...orang, nama: e.target.value })}
              />
            </Medan>
            <Isian
              label="Kampung"
              list="kampung-salin"
              value={orang.kampung}
              maxLength={50}
              onChange={(e) => setOrang({ ...orang, kampung: e.target.value })}
            />
            <datalist id="kampung-salin">
              {kampungQ.data?.map((k) => (
                <option key={k.id} value={k.nama} />
              ))}
            </datalist>
            <Isian
              label="Nomor HP (opsional)"
              type="tel"
              value={orang.nomorHp}
              onChange={(e) => setOrang({ ...orang, nomorHp: e.target.value })}
            />
            <Isian
              label="NIK (opsional)"
              inputMode="numeric"
              maxLength={16}
              value={orang.nik}
              onChange={(e) => setOrang({ ...orang, nik: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <Medan label="Kolektor Pemegang">
            <PilihanAsli value={pilihKolektor} onChange={(e) => setKolektorId(e.target.value)}>
              {(kolektorQ.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nama}
                </option>
              ))}
            </PilihanAsli>
          </Medan>
          <SaranSerupa
            orang={orang}
            pakai={(n) => {
              setLama(n);
              setModus("lama");
            }}
          />
        </>
      )}
    </section>
  );
}
