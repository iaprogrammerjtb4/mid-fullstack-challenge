import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { THEME_STORAGE_KEY } from "@/theme/storage";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FlowKanban — Real-time agile collaboration",
  description:
    "FlowKanban — boards, columns, and tasks with real-time collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInit = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark")document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){}})();`;

  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
