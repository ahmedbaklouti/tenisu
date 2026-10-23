/** Erreur métier : aucun joueur ne correspond à l'identifiant demandé. */
export class PlayerNotFoundError extends Error {
  constructor(readonly playerId: number) {
    super(`Aucun joueur ne correspond à l'identifiant ${playerId}.`);
    this.name = PlayerNotFoundError.name;
  }
}
