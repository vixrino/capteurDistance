import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Widget d'accessibilité flottant (bas à droite).
 * Réglages persistés dans localStorage et appliqués sur <html>.
 *
 * Fonctionnalités :
 *   1. Taille du texte (zoom de la racine)
 *   2. Contraste élevé
 *   3. Mode sombre
 *   4. Niveaux de gris
 *   5. Saturation réduite
 *   6. Réduire les animations
 *   7. Souligner les liens
 *   8. Surligner les liens
 *   9. Police lisible (dyslexie)
 *  10. Espacement du texte
 *  11. Grand curseur
 *  12. Mise au point renforcée
 *  13. Guide de lecture (suit la souris)
 *  14. Masque de lecture (suit la souris)
 *  15. Lecture à voix haute (synthèse vocale)
 */

interface A11ySettings {
  fontScale: number;
  contrast: boolean;
  dark: boolean;
  grayscale: boolean;
  lowSaturation: boolean;
  noMotion: boolean;
  underline: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  textSpacing: boolean;
  bigCursor: boolean;
  strongFocus: boolean;
  readingGuide: boolean;
  readingMask: boolean;
}

const DEFAULTS: A11ySettings = {
  fontScale: 1,
  contrast: false,
  dark: false,
  grayscale: false,
  lowSaturation: false,
  noMotion: false,
  underline: false,
  highlightLinks: false,
  readableFont: false,
  textSpacing: false,
  bigCursor: false,
  strongFocus: false,
  readingGuide: false,
  readingMask: false,
};

const STORAGE_KEY = "a11y-settings";
const SCALES = [0.9, 1, 1.1, 1.2, 1.3];
const MASK_BAND = 130; // hauteur de la fenêtre claire du masque (px)

function load(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

function apply(s: A11ySettings) {
  const root = document.documentElement;
  root.style.fontSize = `${s.fontScale * 100}%`;
  const map: Record<string, boolean> = {
    "a11y-contrast": s.contrast,
    "a11y-dark": s.dark,
    "a11y-grayscale": s.grayscale,
    "a11y-low-saturation": s.lowSaturation,
    "a11y-no-motion": s.noMotion,
    "a11y-underline-links": s.underline,
    "a11y-highlight-links": s.highlightLinks,
    "a11y-readable-font": s.readableFont,
    "a11y-text-spacing": s.textSpacing,
    "a11y-big-cursor": s.bigCursor,
    "a11y-strong-focus": s.strongFocus,
  };
  for (const [cls, on] of Object.entries(map)) root.classList.toggle(cls, on);
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(load);
  const [pointerY, setPointerY] = useState(-9999);
  const [speaking, setSpeaking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    apply(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Suivi de la souris pour le guide / masque de lecture (rAF throttle).
  const needPointer = settings.readingGuide || settings.readingMask;
  useEffect(() => {
    if (!needPointer) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPointerY(e.clientY));
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [needPointer]);

  // Fermeture au clic extérieur + touche Échap.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Synthèse vocale : lit le contenu principal.
  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const main = document.getElementById("main-content");
    const text = (main?.innerText || document.body.innerText || "").trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 4000));
    u.lang = "fr-FR";
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }, []);
  const stopSpeak = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);
  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const set = (patch: Partial<A11ySettings>) => setSettings((s) => ({ ...s, ...patch }));
  // Contraste & sombre s'excluent mutuellement.
  const setContrast = (v: boolean) => set({ contrast: v, dark: v ? false : settings.dark });
  const setDark = (v: boolean) => set({ dark: v, contrast: v ? false : settings.contrast });

  const scaleIndex = SCALES.indexOf(settings.fontScale);
  const scaleStep = scaleIndex === -1 ? 1 : scaleIndex;

  const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULTS);

  return (
    <>
      {/* Overlays de lecture (suivent la souris) */}
      {settings.readingGuide && pointerY > -9999 && (
        <div className="a11y-reading-guide" style={{ top: pointerY }} aria-hidden="true" />
      )}
      {settings.readingMask && pointerY > -9999 && (
        <>
          <div className="a11y-reading-mask" style={{ top: 0, height: Math.max(0, pointerY - MASK_BAND / 2) }} aria-hidden="true" />
          <div className="a11y-reading-mask" style={{ top: pointerY + MASK_BAND / 2, bottom: 0 }} aria-hidden="true" />
        </>
      )}

      <div className="fixed bottom-5 right-5 z-[100]">
        {/* Panneau */}
        {open && (
          <div
            ref={panelRef}
            id="a11y-panel"
            role="dialog"
            aria-label="Options d'accessibilité"
            className="absolute bottom-16 right-0 w-80 max-h-[72vh] overflow-y-auto card shadow-lg p-5 space-y-5 animate-rise"
          >
            <div className="flex items-baseline justify-between sticky -top-5 bg-paper-raised pt-5 -mt-5 pb-1 z-10">
              <h2 className="font-serif text-xl text-ink">Accessibilité</h2>
              <button
                onClick={() => { setOpen(false); btnRef.current?.focus(); }}
                aria-label="Fermer le panneau d'accessibilité"
                className="text-ink-faint hover:text-clay transition-colors text-lg leading-none"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/* Taille du texte */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">Taille du texte</span>
                <span className="num text-sm text-ink">{Math.round(settings.fontScale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set({ fontScale: SCALES[Math.max(0, scaleStep - 1)] })}
                  disabled={scaleStep === 0}
                  aria-label="Réduire la taille du texte"
                  className="btn-line flex-1 py-1.5 text-base disabled:opacity-30"
                >
                  A−
                </button>
                <button
                  onClick={() => set({ fontScale: SCALES[Math.min(SCALES.length - 1, scaleStep + 1)] })}
                  disabled={scaleStep === SCALES.length - 1}
                  aria-label="Augmenter la taille du texte"
                  className="btn-line flex-1 py-1.5 text-base disabled:opacity-30"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Couleurs */}
            <Group label="Couleurs & contraste">
              <ToggleRow label="Contraste élevé" checked={settings.contrast} onChange={setContrast} />
              <ToggleRow label="Mode sombre" checked={settings.dark} onChange={setDark} />
              <ToggleRow label="Niveaux de gris" checked={settings.grayscale} onChange={(v) => set({ grayscale: v })} />
              <ToggleRow label="Saturation réduite" checked={settings.lowSaturation} onChange={(v) => set({ lowSaturation: v })} />
            </Group>

            {/* Lecture */}
            <Group label="Confort de lecture">
              <ToggleRow label="Police lisible (dyslexie)" checked={settings.readableFont} onChange={(v) => set({ readableFont: v })} />
              <ToggleRow label="Espacement du texte" checked={settings.textSpacing} onChange={(v) => set({ textSpacing: v })} />
              <ToggleRow label="Souligner les liens" checked={settings.underline} onChange={(v) => set({ underline: v })} />
              <ToggleRow label="Surligner les liens" checked={settings.highlightLinks} onChange={(v) => set({ highlightLinks: v })} />
              <ToggleRow label="Guide de lecture" checked={settings.readingGuide} onChange={(v) => set({ readingGuide: v })} />
              <ToggleRow label="Masque de lecture" checked={settings.readingMask} onChange={(v) => set({ readingMask: v })} />
            </Group>

            {/* Navigation */}
            <Group label="Navigation & mouvement">
              <ToggleRow label="Réduire les animations" checked={settings.noMotion} onChange={(v) => set({ noMotion: v })} />
              <ToggleRow label="Grand curseur" checked={settings.bigCursor} onChange={(v) => set({ bigCursor: v })} />
              <ToggleRow label="Mise au point renforcée" checked={settings.strongFocus} onChange={(v) => set({ strongFocus: v })} />
            </Group>

            {/* Lecture vocale */}
            <Group label="Lecture à voix haute">
              <div className="flex items-center gap-2">
                <button onClick={speak} className="btn-ink flex-1 py-1.5 text-xs">Lire la page</button>
                <button onClick={stopSpeak} disabled={!speaking} className="btn-line flex-1 py-1.5 text-xs disabled:opacity-30">Arrêter</button>
              </div>
            </Group>

            <button
              onClick={() => setSettings(DEFAULTS)}
              disabled={isDefault}
              className="w-full text-sm text-ink-muted hover:text-clay transition-colors underline decoration-line underline-offset-4 disabled:opacity-30 disabled:no-underline"
            >
              Tout réinitialiser
            </button>
          </div>
        )}

        {/* Bouton flottant */}
        <button
          ref={btnRef}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="a11y-panel"
          aria-label="Options d'accessibilité"
          className="w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center shadow-lg hover:bg-clay transition-colors"
        >
          <AccessibilityIcon />
        </button>
      </div>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between group gap-3"
    >
      <span className="text-sm text-ink text-left">{label}</span>
      <span
        aria-hidden="true"
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-moss" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper-raised transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function AccessibilityIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="4" r="1.8" fill="currentColor" />
      <path
        d="M4 8h16M12 8v6m0 0l-3 6m3-6l3 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
