import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ModeProvider } from "@/lib/modeContext";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Matthew | EdTech Portfolio",
  description:
    "A dual-mode portfolio showcasing EdTech applications — toggle between professional case studies and technical deep-dives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-mode="portfolio">
      <body
        className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ModeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-[var(--sidebar-width)]">
              <div className="mx-auto max-w-5xl px-6 py-12 lg:px-12 lg:py-16">
                {children}
              </div>
            </main>
          </div>
        </ModeProvider>
      </body>
    </html>
  );
}
