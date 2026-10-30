import { bakukanKode } from "@opennael/domain";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";
import { PesanGalat } from "@/komponen/formulir";

/** Pemindai QR lewat kamera laptop/HP; berhenti sendiri begitu terbaca. */
export function Pemindai({ onKode }: { onKode: (kode: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!video.current) return;
    const pemindai = new QrScanner(
      video.current,
      (hasil) => {
        const kode = bakukanKode(hasil.data);
        if (kode) {
          pemindai.stop();
          onKode(kode);
        }
      },
      { highlightScanRegion: true, returnDetailedScanResult: true },
    );
    pemindai.start().catch(() => setGalat("Kamera tidak bisa dibuka — ketik kodenya saja"));
    return () => pemindai.destroy();
  }, [onKode]);

  return (
    <div className="space-y-2">
      {/* biome-ignore lint/a11y/useMediaCaption: pratinjau kamera, tanpa suara */}
      <video ref={video} className="aspect-square w-full rounded-xl bg-black object-cover" />
      <PesanGalat pesan={galat} />
    </div>
  );
}
