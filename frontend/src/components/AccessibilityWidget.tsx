import { useEffect, useRef, useState } from "react";

/**
 * Widget d'accessibilité flottant (bas à droite).
 * Réglages persistés dans localStorage et appliqués sur <html> :
 *  - taille du texte (zoom de la racine rem)
 *  - contraste élevé
 *  - réduction des animations
 *  - soulignement des liens
 */

interface A11ySettings {
  fontScale: number;        // 1 = 100 %
  contrast: boolean;
  noMotion: boolean;
  underline: boolean;
}

const DEFAULTS: A11ySettings = { fontScale: 1, contrast: false, noMotion: false, underline: false };
const STORAGE_KEY = "a11y-settings";
const SCALES = [0.9, 1, 1.1, 1.2, 1.3];

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
  root.classList.toggle("a11y-contrast", s.contrast);
  root.classList.toggle("a11y-no-motion", s.noMotion);
  root.classList.toggle("a11y-underline-links", s.underline);
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(load);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    apply(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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

  const set = (patch: Partial<A11ySettings>) => setSettings((s) => ({ ...s, ...patch }));
  const scaleIndex = SCALES.indexOf(settings.fontScale);
  const scaleStep = scaleIndex === -1 ? 1 : scaleIndex;

  const isDefault =
    settings.fontScale === 1 && !settings.contrast && !settings.noMotion && !settings.underline;

  return (
    <div className="fixed bottom-5 right-5 z-[100]">
      {/* Panneau */}
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-label="Options d'accessibilité"
          className="absolute bottom-16 right-0 w-72 card shadow-lg p-5 space-y-5 animate-rise"
        >
          <div className="flex items-baseline justify-between">
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

          {/* Bascules */}
          <ToggleRow
            label="Contraste élevé"
            checked={settings.contrast}
            onChange={(v) => set({ contrast: v })}
          />
          <ToggleRow
            label="Réduire les animations"
            checked={settings.noMotion}
            onChange={(v) => set({ noMotion: v })}
          />
          <ToggleRow
            label="Souligner les liens"
            checked={settings.underline}
            onChange={(v) => set({ underline: v })}
          />

          <button
            onClick={() => setSettings(DEFAULTS)}
            disabled={isDefault}
            className="w-full text-sm text-ink-muted hover:text-clay transition-colors underline decoration-line underline-offset-4 disabled:opacity-30 disabled:no-underline"
          >
            Réinitialiser
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
      className="w-full flex items-center justify-between group"
    >
      <span className="text-sm text-ink">{label}</span>
      <span
        aria-hidden="true"
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
          checked ? "bg-moss" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper-raised transition-all ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function AccessibilityIcon() {
  // Pictogramme universel d'accessibilité (personne, bras écartés).
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
