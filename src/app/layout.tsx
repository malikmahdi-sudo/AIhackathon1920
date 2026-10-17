import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Morning Paper | A little perspective, every day",
  description: "Your personal morning paper. A calmer place for the stories that matter to you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
