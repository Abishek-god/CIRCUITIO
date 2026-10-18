import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIRCUITIO — Circuit Designer",
  description: "Design, simulate and understand introductory electronic circuits.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}