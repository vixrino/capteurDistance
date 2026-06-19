-- ============================================================
-- Projet Capteur de Distance - ISEP 2025-2026
-- Tables des fonctionnalites : actionneurs, alertes, evenements
--
-- Prefixe g8a_ pour la base partagee (surchargeable cote backend).
-- Importable directement dans phpMyAdmin (base deja selectionnee).
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

START TRANSACTION;

-- ── Actionneurs (LED, buzzer, relais...) pilotes depuis le site ──
CREATE TABLE IF NOT EXISTS `g8a_actionneurs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`        VARCHAR(80)  NOT NULL,
  `type`       ENUM('led','buzzer','relais','moteur') NOT NULL DEFAULT 'led',
  `etat`       ENUM('on','off') NOT NULL DEFAULT 'off',
  `mode`       ENUM('manuel','auto') NOT NULL DEFAULT 'manuel',
  `sens`       ENUM('below','above') NOT NULL DEFAULT 'below' COMMENT 'auto: declenche si distance below/above seuil',
  `seuil_cm`   FLOAT NOT NULL DEFAULT 20,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Regles d'alerte (avec notification e-mail) ──
CREATE TABLE IF NOT EXISTS `g8a_alertes` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `label`          VARCHAR(120) NOT NULL,
  `comparateur`    ENUM('below','above') NOT NULL DEFAULT 'below',
  `seuil_cm`       FLOAT NOT NULL DEFAULT 15,
  `email`          VARCHAR(160) NOT NULL,
  `active`         TINYINT(1) NOT NULL DEFAULT 1,
  `cooldown_s`     INT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'delai mini entre deux envois',
  `derniere_alerte_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Journal des declenchements d'alerte ──
CREATE TABLE IF NOT EXISTS `g8a_alert_events` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `alerte_id`    INT UNSIGNED NULL,
  `label`        VARCHAR(120) NOT NULL,
  `distance_cm`  FLOAT NOT NULL,
  `message`      VARCHAR(255) NOT NULL,
  `email`        VARCHAR(160) NOT NULL,
  `email_status` ENUM('envoye','simule','echec') NOT NULL DEFAULT 'simule',
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alert_events_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Actionneur + alerte de demonstration (ignore si deja presents)
INSERT INTO `g8a_actionneurs` (`id`, `nom`, `type`, `etat`, `mode`, `sens`, `seuil_cm`)
VALUES (1, 'LED de proximite', 'led', 'off', 'auto', 'below', 20)
ON DUPLICATE KEY UPDATE `id` = `id`;

COMMIT;
