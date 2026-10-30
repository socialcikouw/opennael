import { createFileRoute } from "@tanstack/react-router";
import { LayarTautkan } from "@/fitur/tautan/layar-tautkan";

export const Route = createFileRoute("/_bos/tautkan")({
  component: LayarTautkan,
});
