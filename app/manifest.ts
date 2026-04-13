import type { MetadataRoute } from "next";

// Vereist voor static export (output: 'export')
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REVA",
    short_name: "REVA",
    description: "Jouw persoonlijk herstel dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f4",
    theme_color: "#e8632a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
