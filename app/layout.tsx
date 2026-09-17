import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tableau — Restaurant Reservation Manager",
  description: "A polished restaurant reservation and table management demo by Dimitar Shopov.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
