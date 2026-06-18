-- ============================================================
-- Projet Capteur de Distance - ISEP 2025-2026
-- Script compatible avec l'onglet "Importer" de phpMyAdmin
--
-- Utilisation :
-- 1. Creer ou selectionner votre base de donnees dans phpMyAdmin
-- 2. Aller dans l'onglet "Importer"
-- 3. Choisir ce fichier init.sql
-- 4. Lancer l'import
--
-- Ce script ne contient pas CREATE DATABASE ni USE afin de
-- s'importer directement dans la base actuellement selectionnee.
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `mesures` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `distance_cm` FLOAT NOT NULL COMMENT 'Distance mesuree en centimetres',
  `mesure_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mesures_mesure_at` (`mesure_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
