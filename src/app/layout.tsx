import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Project Tracker",
  description: "Система управления проектами и задачами",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('projectTrackerTheme')||localStorage.getItem('theme');if(!t){var m=document.cookie.match(/(?:^|; )projectTrackerTheme=([^;]*)/);t=m?decodeURIComponent(m[1]):(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.classList.toggle('theme-palette',t==='palette')}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
