function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value)),
  )
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string

  const manifest = withValidProperties({
    name: "Flappy Base Game",
    short_name: "Flappy Base",
    description: "A fun Flappy Bird style game",
    start_url: "/",
    display: "standalone",
    background_color: "#87CEEB",
    theme_color: "#4A90E2",
    orientation: "portrait",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/flappy-bird-icon.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any maskable",
      },
      {
        src: "/flappy-bird-icon.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any maskable",
      },
    ],
  })

  return Response.json(manifest)
}
