import { useState, useEffect, useRef } from "react";
import api from "@/api/client";
import { Measurement } from "@/types";

/** Poll /api/measurements/latest every `intervalMs` ms. */
export function useLiveDistance(sensorId = 1, intervalMs = 1000) {
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    fetchLatest();
    intervalRef.current = setInterval(fetchLatest, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sensorId, intervalMs]);

  return { measurement, history, error };
}
