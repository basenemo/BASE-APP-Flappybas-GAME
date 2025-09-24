import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL || "https://flappy-bird-base.vercel.app"

  return {
    title: "Flappy Bird XP - Social Gaming Experience",
    description: "Play Flappy Bird with friends, earn XP, complete daily challenges, and climb the leaderboard!",
    generator: "v0.app",
    openGraph: {
      title: "Flappy Bird XP - Social Gaming Experience",
      description: "Play Flappy Bird with friends, earn XP, complete daily challenges, and climb the leaderboard!",
      images: [`${URL}/og-image.jpg`],
      url: URL,
    },
    twitter: {
      card: "summary_large_image",
      title: "Flappy Bird XP - Social Gaming Experience",
      description: "Play Flappy Bird with friends, earn XP, complete daily challenges, and climb the leaderboard!",
      images: [`${URL}/og-image.jpg`],
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${URL}/embed-image.jpg`,
        button: {
          title: "Play Flappy Bird XP",
          action: {
            type: "launch_miniapp",
            name: "Flappy Bird XP",
            url: URL,
            splashImageUrl: `${URL}/flappy-bird-splash.jpg`,
            splashBackgroundColor: "#87CEEB",
          },
        },
      }),
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
