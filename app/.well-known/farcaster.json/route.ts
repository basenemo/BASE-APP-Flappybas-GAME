function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value)),
  )
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || "https://flappy-bird-base.vercel.app"

  return Response.json({
    accountAssociation: {
      header: "",
      payload: "",
      signature: "",
    },
    baseBuilder: {
      allowedAddresses: [""], // Base Account address will be added during setup
    },
    miniapp: {
      version: "1",
      name: "Flappy Bird XP",
      homeUrl: URL,
      iconUrl: `${URL}/flappy-bird-icon.jpg`,
      splashImageUrl: `${URL}/flappy-bird-splash.jpg`,
      splashBackgroundColor: "#87CEEB",
      webhookUrl: `${URL}/api/webhook`,
      subtitle: "Fly, earn XP, compete with friends",
      description:
        "A fun Flappy Bird game with XP progression, daily check-ins, weekly challenges, and social features. Compete with friends and climb the leaderboard!",
      screenshotUrls: [`${URL}/screenshot1.jpg`, `${URL}/screenshot2.jpg`, `${URL}/screenshot3.jpg`],
      primaryCategory: "games",
      tags: ["flappy", "bird", "game", "xp", "social", "leaderboard"],
      heroImageUrl: `${URL}/hero-image.jpg`,
      tagline: "Fly and earn XP instantly",
      ogTitle: "Flappy Bird XP - Social Gaming Experience",
      ogDescription: "Play Flappy Bird with friends, earn XP, complete daily challenges, and climb the leaderboard!",
      ogImageUrl: `${URL}/og-image.jpg`,
      noindex: false,
    },
  })
}
