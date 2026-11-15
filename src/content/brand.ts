import { asset } from "./pack";

// The app shell wears the brand of whoever is showing it. The training content inside belongs to the client pack.
// Set VITE_BRAND at build time. "magnum" is the default. "gig" gives the GIG Academy look.

export interface Brand { id: string; name: string; tag: string; logo: string; title: string; themeColor: string; fonts: string }

const BRANDS: Record<string, Brand> = {
  magnum: {
    id: "magnum",
    name: "Magnum AI",
    tag: "Sales practice",
    logo: "art/magnum/magnum-mark.svg",
    title: "Magnum AI sales practice",
    themeColor: "#1F2A37",
    fonts: "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
  gig: {
    id: "gig",
    name: "GIG",
    tag: "The GIG Academy",
    logo: "art/gig/logo.png",
    title: "GIG Academy practice",
    themeColor: "#1C1A1A",
    fonts: "https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,200;0,300;0,400;0,600;1,800&display=swap",
  },
};

export const brand: Brand = BRANDS[(import.meta.env.VITE_BRAND as string | undefined) ?? "magnum"] ?? BRANDS.magnum;
export const brandLogo = asset(brand.logo);

/** Put the brand on the page: the look, the fonts, the tab title. */
export function applyBrand(): void {
  document.documentElement.dataset.brand = brand.id;
  document.title = brand.title;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", brand.themeColor);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = brand.fonts;
  document.head.appendChild(link);
}
