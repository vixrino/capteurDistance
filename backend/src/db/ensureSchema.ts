import privatePool, {
  USERS_TABLE,
  SCORES_TABLE,
  ACTUATORS_TABLE,
  ALERTS_TABLE,
  ALERT_EVENTS_TABLE,
} from "./connectionPrivate";

/**
 * Crée (si absentes) les tables nécessaires aux fonctionnalités du site
 * directement au démarrage du backend. Robuste quel que soit le mode
 * (base partagée hangardb avec préfixe g8a_, ou base locale XAMPP/MAMP).
 *
 * Toutes les requêtes sont en CREATE TABLE IF NOT EXISTS : sans effet
 * si les tables existent déjà.
 */
export async function ensureSchema(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS \`${USERS_TABLE}\` (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`${SCORES_TABLE}\` (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      jeu VARCHAR(50) NOT NULL,
      joueur VARCHAR(100) NOT NULL,
      score INT NOT NULL,
      details JSON NULL,
      joue_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_jeu_score (jeu, score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`${ACTUATORS_TABLE}\` (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      nom VARCHAR(80) NOT NULL,
      type ENUM('led','buzzer','relais','moteur') NOT NULL DEFAULT 'led',
      etat ENUM('on','off') NOT NULL DEFAULT 'off',
      mode ENUM('manuel','auto') NOT NULL DEFAULT 'manuel',
      sens ENUM('below','above') NOT NULL DEFAULT 'below',
      seuil_cm FLOAT NOT NULL DEFAULT 20,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`${ALERTS_TABLE}\` (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      label VARCHAR(120) NOT NULL,
      comparateur ENUM('below','above') NOT NULL DEFAULT 'below',
      seuil_cm FLOAT NOT NULL DEFAULT 15,
      email VARCHAR(160) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      cooldown_s INT UNSIGNED NOT NULL DEFAULT 60,
      derniere_alerte_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`${ALERT_EVENTS_TABLE}\` (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      alerte_id INT UNSIGNED NULL,
      label VARCHAR(120) NOT NULL,
      distance_cm FLOAT NOT NULL,
      message VARCHAR(255) NOT NULL,
      email VARCHAR(160) NOT NULL,
      email_status ENUM('envoye','simule','echec') NOT NULL DEFAULT 'simule',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_alert_events_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of statements) {
    await privatePool.query(sql);
  }
}
