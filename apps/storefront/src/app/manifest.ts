import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ControlKart", short_name: "ControlKart",
    description: "Selec industrial automation components, delivered across India.",
    start_url: "/", display: "browser", background_color: "#ffffff", theme_color: "#004fc7",
    icons: [192, 512].map((size) => ({ src: `/branding/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png" })),
  }
}
