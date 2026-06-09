-- ============================================================
-- Projet Capteur de Distance — ISEP 2025-2026
-- Base dédiée : capteur_distance
-- Une seule table : mesures
-- ============================================================

CREATE DATABASE IF NOT EXISTS `capteur_distance`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `capteur_distance`;

-- Table unique : toutes les mesures du capteur HC-SR04
CREATE TABLE IF NOT EXISTS `mesures` (
  `id`          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  `distance_cm` FLOAT         NOT NULL COMMENT 'Distance mesurée en centimètres',
  `mesure_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_time (`mesure_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
