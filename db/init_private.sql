-- ============================================================
-- Projet Capteur de Distance — ISEP 2025-2026
-- Base PRIVÉE : capteur_private
-- Utilisateurs + scores — non partagé avec les autres groupes
-- ============================================================

CREATE DATABASE IF NOT EXISTS `capteur_private`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `capteur_private`;

-- Comptes utilisateurs
CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id`            INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  `username`      VARCHAR(50)   NOT NULL UNIQUE,
  `email`         VARCHAR(100)  NOT NULL UNIQUE,
  `password_hash` VARCHAR(255)  NOT NULL,
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Scores des mini-jeux
CREATE TABLE IF NOT EXISTS `scores` (
  `id`          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  `jeu`         VARCHAR(50)   NOT NULL COMMENT 'guess | stability | reflex | maestro | morse',
  `joueur`      VARCHAR(100)  NOT NULL,
  `score`       INT           NOT NULL,
  `details`     JSON,
  `joue_le`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jeu_score (`jeu`, `score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
