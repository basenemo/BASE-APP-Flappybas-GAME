import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Flappy Base Game",
  description: "A fun Flappy Bird style game with XP progression, daily challenges, and social features",
  generator: "v0.app",
  openGraph: {
    title: "Flappy Base Game",
    description: "A fun Flappy Bird style game with XP progression, daily challenges, and social features",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flappy Base Game",
    description: "A fun Flappy Bird style game with XP progression, daily challenges, and social features",
    images: ["/og-image.jpg"],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_URL || "https://flappy-bird-base.vercel.app"}/hero-image.jpg`,
      button: {
        title: "Play Flappy Bird",
        action: {
          type: "launch_miniapp",
          name: "Flappy Bird XP",
          url: process.env.NEXT_PUBLIC_URL || "https://flappy-bird-base.vercel.app",
          splashImageUrl: `${process.env.NEXT_PUBLIC_URL || "https://flappy-bird-base.vercel.app"}/flappy-bird-splash.jpg`,
          splashBackgroundColor: "#87CEEB",
        },
      },
    }),
  },
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
