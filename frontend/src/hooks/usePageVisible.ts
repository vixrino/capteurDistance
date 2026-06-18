import { useEffect, useState } from "react";

/**
 * Éco-conception : indique si l'onglet est visible (Page Visibility API).
 * Permet de suspendre le polling réseau quand l'utilisateur n'a pas la page
 * sous les yeux → moins de requêtes, moins de CPU, moins d'énergie.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}
