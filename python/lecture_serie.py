#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bridge série → API — Projet Capteur de Distance (ISEP 2025-2026)
================================================================

Lit la distance envoyée par la carte TIVA C (Energia) sur le port USB série,
puis l'enregistre en base via l'API Node :  POST http://localhost:3001/api/measurements

Chaîne complète :
    Sharp GP2Y0A21 → TIVA C → Energia (Serial.println(distance))
        → [USB série] → CE SCRIPT → HTTP POST → Backend Node → MySQL → Site web

La TIVA envoie une ligne par mesure :
    "42.7"   → distance valide en cm
    "-1"     → hors plage (10–80 cm) : ignorée

Le timestamp N'EST PAS envoyé par la carte (elle n'a pas d'horloge temps réel) :
il est généré côté MySQL via `mesure_at DEFAULT CURRENT_TIMESTAMP`.

Usage :
    python lecture_serie.py --port COM3
    python lecture_serie.py --port COM3 --baud 9600 --api http://localhost:3001/api/measurements

Voir les ports disponibles :
    python lecture_serie.py --list
"""

import argparse
import re
import sys
import time

try:
    import serial                       # pyserial
    from serial.tools import list_ports
except ImportError:
    sys.exit("❌  Module 'pyserial' manquant. Installe-le :  pip install -r requirements.txt")

try:
    import requests
except ImportError:
    sys.exit("❌  Module 'requests' manquant. Installe-le :  pip install -r requirements.txt")


# ── Valeurs par défaut ───────────────────────────────────────────────
DEFAULT_BAUD = 9600                                            # doit matcher Serial.begin() dans Energia
DEFAULT_API = "http://localhost:3001/api/measurements"
RECONNECT_DELAY = 3                                            # secondes avant nouvelle tentative série
HTTP_TIMEOUT = 5                                               # secondes

# Plage fiable du Sharp GP2Y0A21 : on n'enregistre que 10–80 cm.
SENSOR_MIN = 10.0
SENSOR_MAX = 80.0

# Le sketch TIVA peut envoyer soit un nombre brut ("14.4"), soit une ligne
# verbeuse "Brut : 2136 | Tension : 1.72 V | Distance : 14.4 cm".
# On extrait le nombre qui suit "Distance".
DISTANCE_RE = re.compile(r"Distance\s*:?\s*(-?\d+(?:[.,]\d+)?)", re.IGNORECASE)


def lister_ports() -> None:
    """Affiche les ports série détectés (utile pour trouver le COM de la TIVA)."""
    ports = list(list_ports.comports())
    if not ports:
        print("Aucun port série détecté. Branche la TIVA et vérifie le pilote ICDI.")
        return
    print("Ports série disponibles :")
    for p in ports:
        print(f"  • {p.device:<10} {p.description}")


def envoyer_mesure(api_url: str, distance_cm: float) -> bool:
    """POST une mesure vers l'API Node. Retourne True si insérée (HTTP 201)."""
    try:
        rep = requests.post(api_url, json={"distance_cm": distance_cm}, timeout=HTTP_TIMEOUT)
        if rep.status_code == 201:
            return True
        print(f"⚠️  API a refusé la mesure (HTTP {rep.status_code}) : {rep.text.strip()}")
        return False
    except requests.exceptions.ConnectionError:
        print("⚠️  Backend injoignable (npm run dev lancé ? port 3001 ?). Mesure ignorée.")
        return False
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Erreur HTTP : {e}")
        return False


def parser_ligne(ligne: str):
    """Extrait la distance (float) d'une ligne série. None si invalide ou hors 10–80 cm."""
    ligne = ligne.strip()
    if not ligne:
        return None
    # Ligne verbeuse : on prend le nombre après "Distance :". Sinon, format simple
    # où la ligne entière est un nombre ("14.4").
    m = DISTANCE_RE.search(ligne)
    brut = m.group(1) if m else ligne
    brut = brut.replace(",", ".")        # tolère la virgule décimale
    try:
        valeur = float(brut)
    except ValueError:
        return None                      # ligne non numérique (bruit, message de boot, etc.)
    # -1 = hors plage envoyé par la TIVA ; on rejette aussi tout ce qui sort de 10–80 cm.
    if valeur < SENSOR_MIN or valeur > SENSOR_MAX:
        return None
    return valeur


def boucle_lecture(port: str, baud: int, api_url: str, debug: bool = False) -> None:
    """Ouvre le port série et relaie chaque mesure vers l'API, avec reconnexion auto."""
    print(f"📡  Bridge démarré — port={port} baud={baud}")
    print(f"🎯  Cible API : {api_url}")
    if debug:
        print("🐛  Mode debug : affichage des lignes brutes reçues.")
    print("    (Ctrl+C pour arrêter)\n")

    while True:
        try:
            with serial.Serial(port, baud, timeout=2) as ser:
                print(f"✅  Connecté à {port}.")
                time.sleep(2)            # laisse la carte finir son reset après ouverture du port
                ser.reset_input_buffer()

                while True:
                    raw = ser.readline()                       # bytes, jusqu'au \n
                    if not raw:
                        if debug:
                            print("…  (rien reçu en 2 s — la carte envoie-t-elle bien ? bon baud ?)")
                        continue                               # timeout sans donnée
                    ligne = raw.decode("utf-8", errors="ignore")
                    if debug:
                        print(f"🐛  brut : {ligne.strip()!r}")
                    distance = parser_ligne(ligne)
                    if distance is None:
                        continue                               # -1 / bruit / ligne vide
                    if envoyer_mesure(api_url, distance):
                        print(f"📥  {distance:6.1f} cm  →  enregistré")

        except serial.SerialException as e:
            print(f"🔌  Port série indisponible ({e}). Nouvelle tentative dans {RECONNECT_DELAY}s…")
            time.sleep(RECONNECT_DELAY)
        except KeyboardInterrupt:
            print("\n👋  Arrêt demandé. Bridge stoppé.")
            return


def main() -> None:
    parser = argparse.ArgumentParser(description="Bridge série TIVA C → API Capteur de Distance")
    parser.add_argument("--port", help="Port série de la TIVA (ex. COM3 sous Windows)")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD, help=f"Vitesse série (défaut {DEFAULT_BAUD})")
    parser.add_argument("--api", default=DEFAULT_API, help="URL de l'endpoint d'insertion")
    parser.add_argument("--list", action="store_true", help="Lister les ports série puis quitter")
    parser.add_argument("--debug", action="store_true", help="Afficher les lignes brutes reçues (diagnostic)")
    args = parser.parse_args()

    if args.list:
        lister_ports()
        return

    if not args.port:
        print("❌  Argument --port requis (ex. --port COM3).\n")
        lister_ports()
        sys.exit(1)

    boucle_lecture(args.port, args.baud, args.api, debug=args.debug)


if __name__ == "__main__":
    main()
