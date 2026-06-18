#!/usr/bin/env python3
"""
Lecteur série TIVA C → API REST
Lit les mesures du capteur Sharp GP2Y0A21 via USB série
et les envoie à l'API Express locale (POST /api/measurements).

Usage :
    python3 serial_reader.py [/dev/ttyACM0] [9600]
"""

import sys
import time
import serial
import requests

# ─── Config ────────────────────────────────────────────────────────────────────
PORT        = sys.argv[1] if len(sys.argv) > 1 else "/dev/ttyACM0"
BAUD        = int(sys.argv[2]) if len(sys.argv) > 2 else 9600
API_URL     = "http://localhost:3001/api/measurements"
RETRY_DELAY = 2   # secondes entre tentatives de reconnexion
MIN_DIST    = 5   # cm — filtre les valeurs aberrantes
MAX_DIST    = 150 # cm


def send_measurement(distance_cm: float) -> bool:
    try:
        r = requests.post(API_URL, json={"distance_cm": distance_cm}, timeout=2)
        if r.status_code == 201:
            data = r.json()
            print(f"  ✔  {distance_cm:.1f} cm → BDD id={data.get('id')}  [{data.get('mesure_at', '')}]")
            return True
        print(f"  ✗  API {r.status_code}: {r.text[:80]}")
        return False
    except requests.exceptions.ConnectionError:
        print("  ✗  API inaccessible — backend démarré ? (npm run dev dans /backend)")
        return False
    except requests.exceptions.Timeout:
        print("  ✗  Timeout API")
        return False


def read_loop(ser: serial.Serial) -> None:
    print(f"Lecture sur {PORT} @ {BAUD} baud… (Ctrl+C pour quitter)\n")
    buf = ""
    while True:
        raw = ser.readline().decode("utf-8", errors="ignore").strip()
        if not raw:
            continue
        try:
            value = float(raw)
        except ValueError:
            # Ligne non numérique (messages de debug Energia, etc.)
            print(f"  [info] '{raw}'")
            continue

        if value < 0:
            print("  →  Hors plage capteur (<10 cm ou >80 cm)")
            continue

        if not (MIN_DIST <= value <= MAX_DIST):
            print(f"  →  Valeur ignorée ({value:.1f} cm hors [{MIN_DIST},{MAX_DIST}])")
            continue

        send_measurement(value)


def main() -> None:
    while True:
        try:
            print(f"Connexion à {PORT}…")
            with serial.Serial(PORT, BAUD, timeout=1) as ser:
                time.sleep(2)  # laisse la TIVA C redémarrer après connexion
                ser.reset_input_buffer()
                read_loop(ser)
        except serial.SerialException as e:
            print(f"Port série introuvable : {e}")
            print(f"Nouvelle tentative dans {RETRY_DELAY}s…")
            time.sleep(RETRY_DELAY)
        except KeyboardInterrupt:
            print("\nArrêt.")
            sys.exit(0)


if __name__ == "__main__":
    main()
