-- =============================================================
-- Projet Capteur de Distance — ISEP 2025-2026
-- Tables préfixées "distance_" (BDD partagée hangardb_dade64253)
-- =============================================================

CREATE TABLE IF NOT EXISTS `distance_users` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `username`      VARCHAR(50)  NOT NULL UNIQUE,
  `email`         VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `distance_sensors` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `name`      VARCHAR(100) NOT NULL,
  `location`  VARCHAR(200),
  `unit`      VARCHAR(10)  DEFAULT 'cm',
  `min_range` FLOAT        DEFAULT 2,
  `max_range` FLOAT        DEFAULT 400,
  `active`    TINYINT(1)   DEFAULT 1,
  `created_at` TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `distance_measurements` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `sensor_id`   INT     NOT NULL,
  `distance_cm` FLOAT   NOT NULL,
  `measured_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sensor_id`) REFERENCES `distance_sensors`(`id`) ON DELETE CASCADE,
  INDEX idx_sensor_time (`sensor_id`, `measured_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `distance_game_scores` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `game_id`     VARCHAR(50)  NOT NULL,
  `player_name` VARCHAR(100) NOT NULL,
  `score`       INT          NOT NULL,
  `details`     JSON,
  `played_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_game_score (`game_id`, `score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Capteur par défaut (démo)
INSERT IGNORE INTO `distance_sensors` (`id`, `name`, `location`, `unit`, `min_range`, `max_range`)
VALUES (1, 'Capteur HC-SR04', 'Salle de projet', 'cm', 2, 400);
