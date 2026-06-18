import { useState, useEffect, useRef } from "react";
import api from "@/api/client";
import { ScreenData } from "@/types";

/**
 * Interroge en continu la dernière info affichée par le groupe « écran »
 * voisin (table partagée dans hangardb_dade64253) via /api/external/screen/latest.
 */
export function useScreenData(intervalMs = 1000) {
  const [screen, setScreen] = useState<ScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    fetchLatest();
    intervalRef.current = setInterval(fetchLatest, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return { screen, error, refetch: fetchLatest };
}
