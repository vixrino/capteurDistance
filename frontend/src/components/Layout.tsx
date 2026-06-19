import { ReactNode } from "react";
import Navbar from "./Navbar";
import AccessibilityWidget from "./AccessibilityWidget";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-5xl mx-auto px-6 py-14 focus:outline-none">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-1.5">
          <span className="font-serif text-sm text-ink">
            Capteur de Distance
          </span>
          <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
            ISEP 2025–2026 · HC-SR04 + Tiva C
          </span>
        </div>
      </footer>

      <AccessibilityWidget />
    </div>
  );
}
