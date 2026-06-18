import { useState, useEffect, useRef } from "react";
import api from "@/api/client";
import { Measurement } from "@/types";
import { usePageVisible } from "@/hooks/usePageVisible";

/**
 * Interroge /api/measurements/latest toutes les `intervalMs` ms.
 * Éco-conception : le polling est suspendu quand l'onglet est masqué
 * et reprend (avec un rafraîchissement immédiat) au retour de l'utilisateur.
 */
export function useLiveDistance(sensorId = 1, intervalMs = 1000) {
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visible = usePageVisible();

  const fetchLatest = async () => {
    try {
      const { data } = await api.get<Measurement>(`/measurements/latest?sensor_id=${sensorId}`);
      setMeasurement(data);
      setHistory((prev) => [...prev.slice(-59), data.distance_cm]);
      setError(null);
    } catch {
      setError("Connexion au backend impossible");
    }
  };

  useEffect(() => {
    if (!visible) return; // onglet caché : aucune requête

    fetchLatest();
    intervalRef.current = setInterval(fetchLatest, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sensorId, intervalMs, visible]);

  return { measurement, history, error };
}
