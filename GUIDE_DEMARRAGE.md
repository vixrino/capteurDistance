# Guide de démarrage — Windows (XAMPP)

Projet **Capteur de Distance** — ISEP 2025-2026.
Chaîne complète : **Sharp GP2Y0A21 → TIVA C → Energia → Python → API Node → MySQL → Site web**.

---

## 0. Prérequis à installer

| Logiciel | Rôle | Lien |
|----------|------|------|
| **XAMPP** | MySQL/MariaDB (port 3306) | apachefriends.org |
| **Node.js 20+** | Backend + frontend | nodejs.org |
| **Python 3.10+** | Bridge série → API | python.org (cocher « Add to PATH ») |
| **Energia** | Programmer la TIVA C | energia.nu |
| **Pilote ICDI** | Port série de la TIVA sous Windows | fourni avec Energia |

---

## 1. Base de données (XAMPP)

1. Lancer **XAMPP Control Panel** → démarrer **MySQL** (le module « MySQL » doit passer au vert).
   > Apache n'est pas nécessaire pour ce projet (le backend Node sert l'API).
2. Vérifier que MySQL écoute bien sur **3306** (config par défaut XAMPP).

Les identifiants sont déjà réglés dans `backend/.env` pour XAMPP :
`root` / **sans mot de passe**, port `3306`.
> Si ton MySQL XAMPP a un mot de passe root, édite `backend/.env` → `DB_PASSWORD=...` (et `DB_PRIVATE_PASSWORD=...`).

---

## 2. Backend Node

```powershell
cd backend
npm install
npm run db:init      # crée les bases capteur_distance + capteur_private et leurs tables
npm run dev          # → http://localhost:3001
```

Vérifier la santé :
```powershell
curl http://localhost:3001/api/health
```
Attendu : `{"status":"ok","db":"ok","demo_mode":false,...}`
> Si `db":"error"` → MySQL pas démarré, ou mauvais port/mot de passe dans `backend/.env`.

---

## 3. Frontend React

Dans un **second terminal** :
```powershell
cd frontend
npm install
npm run dev          # → http://localhost:5173
```
Le frontend proxie automatiquement `/api` vers `localhost:3001`.

---

## 4. Carte TIVA C (Energia)

1. Ouvrir `tiva/capteur_distance.ino` dans **Energia**.
2. Outils → Carte : **LaunchPad (Tiva C) TM4C123G**.
3. Outils → Port : noter le **COMx** affecté à la carte (ex. `COM3`).
4. Téléverser (flèche →).
5. **Fermer le moniteur série d'Energia** (sinon le port est occupé et Python ne pourra pas l'ouvrir).

> Test rapide : ouvrir le moniteur série Energia à **9600 bauds** → tu dois voir défiler des nombres (distance) et des `-1` hors plage. Referme-le ensuite.

---

## 5. Bridge Python (série → API)

```powershell
cd python
pip install -r requirements.txt

python lecture_serie.py --list          # affiche les ports disponibles
python lecture_serie.py                 # essaie de détecter automatiquement le port
python lecture_serie.py --port COM3      # Windows : remplace COM3 par ton port
python lecture_serie.py --port /dev/cu.usbmodemXXXX  # macOS : remplace par le port affiché
```

Affichage attendu :
```
📡  Bridge démarré — port=COM3 baud=9600
✅  Connecté à COM3.
📥    42.7 cm  →  enregistré
```

---

## 6. Visualiser sur le site

Ouvrir **http://localhost:5173** :
- **Tableau de bord** : jauge + distance en temps réel (rafraîchie chaque seconde).
- **Historique** : graphique + tableau horodaté des mesures enregistrées en base.

---

## Ordre de démarrage (résumé)

1. XAMPP → MySQL **ON**
2. `backend` → `npm run dev`
3. `frontend` → `npm run dev`
4. TIVA téléversée, moniteur Energia **fermé**
5. `python lecture_serie.py --port COMx`
6. Navigateur → http://localhost:5173

---

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| `/api/health` → `db":"error"` | MySQL éteint / mauvais port / mot de passe | Démarrer MySQL dans XAMPP ; vérifier `backend/.env` (port 3306) |
| `npm run db:init` → `ER_ACCESS_DENIED` | Mot de passe root incorrect | Ajuster `DB_PASSWORD` dans `backend/.env` |
| Python : `could not open port COM3` | Moniteur série Energia encore ouvert, ou mauvais COM | Fermer le moniteur ; `--list` pour le bon port |
| macOS : pas de `COM3` | Les ports macOS s'appellent `/dev/cu.usbmodem...` ou `/dev/cu.usbserial...` | `python lecture_serie.py --list`, puis utiliser le port affiché |
| Python : `Backend injoignable` | Backend non lancé | `npm run dev` dans `backend` |
| Python : `API a refusé (HTTP 400)` | distance hors 0–500 | Normal si capteur débranché/bruit ; vérifier câblage Sharp |
| Site affiche « Mode démo » / valeurs aléatoires | `DEMO_MODE=true` | Mettre `DEMO_MODE=false` dans `backend/.env` puis relancer `npm run dev` |
| Historique vide | Aucune mesure encore POSTée | Lancer le bridge Python avec la TIVA branchée |
| Distance toujours `-1` | Objet hors 10–80 cm, ou câblage PD3/Vcc/GND | Placer un objet à ~30 cm ; vérifier le câblage |

---

## Mode démo (sans capteur)

Pour développer/tester le site **sans la TIVA** : mettre `DEMO_MODE=true` dans `backend/.env`,
relancer `npm run dev`. `GET /api/measurements/latest` renverra des valeurs simulées
(l'historique reste vide car rien n'est inséré en base).
