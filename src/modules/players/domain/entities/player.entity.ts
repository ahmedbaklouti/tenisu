/**
 * Modèle métier du joueur de tennis.
 * Cette couche ne dépend ni de NestJS, ni de HTTP, ni de l'infrastructure.
 */

/** Sexe du joueur tel que défini par le référentiel de données. */
export type PlayerSex = 'M' | 'F';

/** Pays de rattachement du joueur. */
export interface PlayerCountry {
  /** URL du drapeau. */
  picture: string;
  /** Code pays sur trois lettres majuscules (ex. `SRB`). */
  code: string;
}

/** Données sportives et physiques du joueur. */
export interface PlayerData {
  /** Classement : 1 correspond au meilleur classement. */
  rank: number;
  /** Points au classement. */
  points: number;
  /** Poids en grammes. */
  weight: number;
  /** Taille en centimètres. */
  height: number;
  /** Âge en années. */
  age: number;
  /** Cinq derniers matchs : `1` pour une victoire, `0` pour une défaite. */
  last: number[];
}

/** Joueur de tennis. */
export interface Player {
  id: number;
  firstname: string;
  lastname: string;
  shortname: string;
  sex: PlayerSex;
  country: PlayerCountry;
  picture: string;
  data: PlayerData;
}

/**
 * Joueur en cours de création : identifiant facultatif.
 * S'il est omis, il est attribué par le cas d'usage de création.
 */
export type PlayerDraft = Omit<Player, 'id'> & { id?: number };
