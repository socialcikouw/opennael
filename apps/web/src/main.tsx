import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { sesi } from "./lib/sesi";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

// Sesi dicabut (refresh ditolak / keluar di tab lain) → muat ulang aturan rute.
sesi.dengar(() => void router.invalidate());

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const akar = document.getElementById("root");
if (!akar) throw new Error("Elemen #root tidak ditemukan");

const klienKueri = new QueryClient();

createRoot(akar).render(
  <StrictMode>
    <QueryClientProvider client={klienKueri}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
