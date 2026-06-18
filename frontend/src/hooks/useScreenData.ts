import { useState, useEffect, useRef } from "react";
import api from "@/api/client";
import { ScreenData } from "@/types";
import { usePageVisible } from "@/hooks/usePageVisible";

/**
 * Interroge la dernière info affichée par le groupe « écran » voisin
 * (table partagée dans hangardb_dade64253) via /api/external/screen/latest.
 *
 * Éco-conception : les messages OLED changent lentement → intervalle large
 * par défaut (3 s) et polling suspendu quand l'onglet est masqué.
 */
export function useScreenData(intervalMs = 3000) {
  const [screen, setScreen] = useState<ScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visible = usePageVisible();

  const fetchLatest = async () => {
    try {
      const { data } = await api.get<ScreenData>("/external/screen/latest");
      setScreen(data);
      setError(null);
    } catch {
      setError("Impossible de lire l'écran voisin");
    }
  };

  useEffect(() => {
    if (!visible) return; // onglet caché : aucune requête

    fetchLatest();
    intervalRef.current = setInterval(fetchLatest, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs, visible]);

  return { screen, error, refetch: fetchLatest };
}
