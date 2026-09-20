import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { getCurrentPublicUser } from "@/lib/server/data";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VisualMath AI",
    template: "%s · VisualMath AI",
  },
  description:
    "Platform pembelajaran kalkulus berbasis AI dengan penjelasan langkah demi langkah, grafik interaktif, dan latihan adaptif untuk pendidikan tinggi.",
  keywords: [
    "kalkulus",
    "AI",
    "matematika",
    "kalkulus peubah banyak",
    "pembelajaran adaptif",
    "VisualMath",
  ],
  openGraph: {
    title: "VisualMath AI",
    description:
      "Belajar kalkulus peubah banyak dengan AI: solusi langkah demi langkah, visualisasi interaktif, dan latihan adaptif.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentPublicUser();

  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <Providers user={user}>{children}</Providers>
      </body>
    </html>
  );
}
