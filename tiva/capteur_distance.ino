/* ============================================================
 * Capteur de Distance — TIVA C TM4C123G + Sharp GP2Y0A21
 * ISEP 2025-2026 — Energia
 * ------------------------------------------------------------
 * Câblage Sharp GP2Y0A21 :
 *   Vo  → PD3 (entrée analogique)
 *   Vcc → 5V (VBUS)        GND → GND
 *
 * La carte envoie UNE ligne par mesure sur le port série :
 *     "42.7"  → distance en cm (plage utile 10–80 cm)
 *     "-1"    → hors plage (ignoré par le script Python)
 *
 * Le TIMESTAMP n'est PAS envoyé : la TIVA n'a pas d'horloge
 * temps réel. Il est généré côté MySQL (mesure_at DEFAULT
 * CURRENT_TIMESTAMP). La carte n'envoie donc que la distance.
 *
 * IMPORTANT : 9600 bauds doit correspondre à --baud du script
 *             Python (lecture_serie.py).
 * ============================================================ */

#define SENSOR PD_3

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Moyenne de 8 lectures pour lisser le bruit du capteur IR
  long somme = 0;
  for (int i = 0; i < 8; i++) {
    somme += analogRead(SENSOR);
    delay(2);
  }
  int valeur = somme / 8;

  // ADC 12 bits (0–4095) sur référence 3.3 V
  float volts = valeur * (3.3 / 4095.0);

  // Courbe de linéarisation du Sharp GP2Y0A21
  float distance = 27.728 * pow(volts, -1.2045);

  if (distance > 10 && distance < 80) {
    Serial.println(distance, 1);   // 1 décimale → ex. "42.7"
  } else {
    Serial.println(-1);            // hors plage utile
  }

  delay(35);   // ~20 mesures/seconde (baisse encore ce délai pour aller plus vite)
}
