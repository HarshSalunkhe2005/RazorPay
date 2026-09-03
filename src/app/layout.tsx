import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PALETTE_STORAGE_KEY, DEFAULT_PALETTE } from "@/lib/palette";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recovery Agent | AI Revenue Recovery",
  description:
    "An autonomous agent that diagnoses failed payments and drives personalized win-back flows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Blocking, runs before paint - same reasoning as next-themes' own script, but
            for the second (palette) axis it doesn't manage. Keeps a stored palette
            choice from flashing the default on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});if(p&&p!==${JSON.stringify(DEFAULT_PALETTE)})document.documentElement.dataset.palette=p;}catch(e){}`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
