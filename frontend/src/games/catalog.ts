// Catalogue unique des mini-jeux, réutilisé par la page d'accueil et le GameHub.
// Sélection : 1 jeu « capteur de distance pur » + 5 jeux complets exploitant
// les données des capteurs voisins (couvrant son 8C, écran 8D, LED 8E, état 8B).
export type Difficulty = "Facile" | "Moyen" | "Difficile";

export interface GameMeta {
  id: string;
  n: string;
  name: string;
  /** Description courte (page d'accueil). */
  short: string;
  /** Description complète (GameHub). */
  desc: string;
  diff: Difficulty;
}

export const GAMES: GameMeta[] = [
  {
    id: "maestro",
    n: "01",
    name: "Le Maestro",
    short: "Capteur de distance seul : suis une courbe sur 30 s.",
    desc: "Jeu 100 % capteur de distance : une courbe cible défile à l'écran, reproduisez-la avec votre main pendant trente secondes. Score basé sur l'écart moyen.",
    diff: "Difficile",
  },
  {
    id: "sound_pitch",
    n: "02",
    name: "Diapason",
    short: "Distance + son 8C : la note dicte la distance cible.",
    desc: "Combine votre capteur de distance et le capteur de son du groupe 8C : une vraie note mesurée (fréquence + décibels) définit la distance cible — aigu = main loin, grave = main proche.",
    diff: "Moyen",
  },
  {
    id: "screen_sync",
    n: "03",
    name: "Synchro Écran",
    short: "Distance + écran 8D : suis une cible pilotée en direct.",
    desc: "Combine votre capteur de distance et l'écran OLED du groupe 8D : l'écran pilote une cible mouvante lue en temps réel que vous suivez avec la main pendant trente secondes.",
    diff: "Difficile",
  },
  {
    id: "color_zone",
    n: "04",
    name: "Caméléon",
    short: "Distance + LED 8E : la couleur indique la zone.",
    desc: "Combine votre capteur de distance et la LED RGB du groupe 8E : chaque couleur affichée correspond à une zone de distance, placez votre main dans la bonne zone.",
    diff: "Moyen",
  },
  {
    id: "state_watch",
    n: "05",
    name: "Le Veilleur",
    short: "Distance + état 8B : réagis au passage en alerte.",
    desc: "Combine votre capteur de distance et le capteur d'état du groupe 8B affiché en direct : dès le passage en alerte, rapprochez la main sous 20 cm le plus vite possible.",
    diff: "Moyen",
  },
  {
    id: "hangar_quiz",
    n: "06",
    name: "Quiz du Hangar",
    short: "Tous les capteurs : son 8C, LED 8E, état 8B, écran 8D.",
    desc: "Le jeu le plus complet : une question par capteur du hangar (son 8C, LED 8E, état 8B, écran 8D), basée sur leurs vraies dernières mesures lues en direct dans la base partagée.",
    diff: "Facile",
  },
];

export const TAG: Record<Difficulty, string> = {
  Facile: "tag tag-easy",
  Moyen: "tag tag-medium",
  Difficile: "tag tag-hard",
};
