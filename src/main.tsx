import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { applyBrand } from "./content/brand";
import "./styles.css";
import "./brand-magnum.css";

applyBrand();

// Which client pack this build runs. VITE_PACK=gig builds the practice door. The default is the practice shift.
// Only the chosen pack is loaded, so one client's content never ships inside another client's build.
const Root = import.meta.env.VITE_PACK === "gig"
  ? lazy(() => import("./App").then((m) => ({ default: m.App })))
  : lazy(() => import("./ui/shift/ShiftApp").then((m) => ({ default: m.ShiftApp })));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}><Root /></Suspense>
  </StrictMode>,
);
