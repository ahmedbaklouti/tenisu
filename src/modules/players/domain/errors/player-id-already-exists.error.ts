/** Erreur métier : l'identifiant demandé est déjà utilisé par un autre joueur. */
export class PlayerIdAlreadyExistsError extends Error {
  constructor(readonly playerId: number) {
    super(`Un joueur possède déjà l'identifiant ${playerId}.`);
    this.name = PlayerIdAlreadyExistsError.name;
  }
}
