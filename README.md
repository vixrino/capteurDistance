# Capteur de Distance — ISEP 2025-2026

Site web dédié au capteur de distance (HC-SR04 + Tiva C).  
Soutenance : **vendredi 19 juin 2026**.

## Stack

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de données | MySQL partagée (`hangardb_dade64253`) |
| Charts | Recharts |
| État global | Zustand |
| Auth | JWT (bcryptjs) |

## Démarrage rapide

### 1. Initialiser la base de données

```bash
cd backend
npm run db:init
```

Crée les tables `distance_users`, `distance_sensors`, `distance_measurements`, `distance_game_scores`.

### 2. Lancer le backend

```bash
cd backend
npm run dev   # → http://localhost:3001
```

### 3. Lancer le frontend

```bash
cd frontend
npm run dev   # → http://localhost:5173
```

> Le frontend proxie automatiquement `/api` vers `localhost:3001` (voir `vite.config.ts`).

## Mode démo

Sans le Tiva branché, mets `DEMO_MODE=true` dans `backend/.env`.  
`GET /api/measurements/latest` retourne alors des valeurs simulées — tous les jeux fonctionnent normalement.

## Connexion BDD partagée

```
Host     : 178.33.122.21
Port     : 3306
Database : hangardb_dade64253
User     : dade64253
Password : (voir backend/.env)
```

Toutes les tables sont préfixées `distance_` pour éviter les conflits avec les autres équipes.

## Routes API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Statut du serveur |
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion + JWT |
| GET | `/api/sensors` | Liste des capteurs |
| POST | `/api/sensors` | Créer un capteur (auth) |
| GET | `/api/sensors/:id` | Détail capteur |
| GET | `/api/measurements/latest` | Dernière mesure live |
| GET | `/api/measurements/history` | Historique paginé |
| POST | `/api/measurements` | Insérer une mesure (Tiva) |
| GET | `/api/games/scores` | Leaderboard |
| POST | `/api/games/scores` | Sauver un score |

## Mini-jeux

| Jeu | Difficulté | Principe |
|-----|-----------|---------|
| Devine la distance | Facile | Distance cible → place un objet → score selon écart |
| Stabilité | Moyen | Maintenir une distance fixe 10 s → score = 1000 − variance |
| Réflexes éclair | Moyen | Signal rouge → rapprocher la main < 20 cm le plus vite possible |
| Le Maestro | Difficile | Suivre une courbe cible sur 30 s avec sa main |
| Distance Morse | Difficile | Encoder un mot en Morse par positions (proche/loin) |

## Intégration future Tiva C

Quand le capteur est branché, passer `DEMO_MODE=false` dans `.env` et appeler :

```bash
POST /api/measurements
Content-Type: application/json
{ "sensor_id": 1, "distance_cm": 42.5 }
```

depuis le script Python/PHP lisant le port série USB.

## Structure du projet

```
distancecapteurdistance/
├── backend/          # Express + TypeScript
│   ├── src/
│   │   ├── db/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   └── .env
├── frontend/         # React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   └── games/
│       ├── components/
│       ├── hooks/
│       └── store/
└── db/
    └── init.sql
```


git clone https://github.com/vixrino/capteurDistance.git

cd capteurDistance

cp backend/.env.example backend/.env  # puis remplir le vrai mot de passe

cd backend && npm install && npm run dev

cd ../frontend && npm install && npm run dev

