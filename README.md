# Tenisu API — test technique L'Atelier

API REST permettant de consulter des joueurs de tennis, d'obtenir leurs statistiques et d'ajouter de nouveaux joueurs.

Backend exclusivement : aucune interface utilisateur. Le projet est développé avec NestJS, TypeScript strict et une architecture en quatre couches (domaine, application, infrastructure, présentation).

---

## 1. Objectif du projet

Fournir une API REST de qualité professionnelle, évaluée dans le cadre d'un test technique. Le projet met l'accent sur :

- une architecture claire et justifiable en entretien ;
- une conception REST correcte et des contrats stables ;
- une validation rigoureuse des données entrantes ;
- une gestion prévisible et documentée des erreurs ;
- des calculs métier fiables (agrégation par pays, IMC, médiane) ;
- des tests unitaires et d'intégration HTTP déterministes ;
- une documentation exploitable et un déploiement cloud préparé.

---

## 2. Technologies utilisées

| Domaine | Technologie |
| --- | --- |
| Framework | NestJS 12 (modules, controllers, injection de dépendances) |
| Langage | TypeScript 6 en mode strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) |
| Modules | ESM (`"type": "module"`, `module`/`moduleResolution` = `nodenext`) |
| Validation | `class-validator` + `class-transformer` |
| Documentation | `@nestjs/swagger` (OpenAPI) |
| Tests | Jest uniquement, `@nestjs/testing` + Supertest |
| Qualité | ESLint (flat config, `typescript-eslint` type-checked) + Prettier |
| CI | GitHub Actions |
| Déploiement | Render |
| Gestionnaire de paquets | npm (`package-lock.json`) |

Aucune dépendance supplémentaire n'a été ajoutée lorsque la stack retenue couvrait déjà le besoin.

---

## 3. Architecture et responsabilités des couches

Architecture pragmatique en quatre couches, organisée par module métier.

```text
src/
├── main.ts                     # Amorçage HTTP (port, hôte, logs)
├── app.module.ts               # Module racine
├── app.setup.ts                # ValidationPipe globale + Swagger (partagé prod/tests)
└── modules/
    ├── health/
    │   └── health.controller.ts
    └── players/
        ├── players.module.ts               # Assemblage et injection des dépendances
        ├── domain/
        │   ├── entities/player.entity.ts   # Modèle métier + types
        │   ├── repositories/               # Contrat du repository + token d'injection
        │   └── errors/                     # Erreurs métier indépendantes de NestJS
        ├── application/
        │   ├── use-cases/                  # Lister, détailler, statistiques, ajouter
        │   └── services/                   # Calculs métier (IMC, médiane, ratio par pays)
        ├── infrastructure/
        │   └── persistence/
        │       ├── data/headtohead.json    # Dataset initial
        │       └── in-memory-player.repository.ts
        ├── presentation/
        │   ├── dto/                        # DTO de requête et de réponse
        │   └── http/                       # Controllers + filtre d'exceptions
        └── testing/player.fixture.ts       # Fabrique de joueurs pour les tests
```

| Couche | Responsabilité |
| --- | --- |
| **Domain** | Modèle du joueur, contrat du repository, erreurs métier. Ne dépend ni de NestJS, ni de HTTP, ni de l'infrastructure. |
| **Application** | Cas d'usage et calculs métier. Dépend uniquement de l'abstraction du repository, jamais de son implémentation. |
| **Infrastructure** | Implémentation en mémoire du repository, chargement du dataset initial. |
| **Presentation** | Controllers HTTP, DTO, validation à la frontière, documentation Swagger, traduction des erreurs métier en réponses HTTP. |

Principes appliqués :

- les dépendances pointent vers le domaine et les abstractions ;
- les controllers restent minces et délèguent aux cas d'usage ;
- le repository est injecté via un token explicite (`PLAYER_REPOSITORY`), ce qui permet de le remplacer par une implémentation PostgreSQL sans toucher aux cas d'usage ;
- le dataset JSON est cloné en profondeur (`structuredClone`) : ni l'ordre interne du repository, ni les objets du dataset source ne sont jamais exposés.

---

## 4. Prérequis

- Node.js ≥ 22 (testé avec Node 24)
- npm ≥ 10
- Aucune base de données requise

---

## 5. Installation

```bash
git clone <url-du-depot>
cd tenisu
npm ci
cp .env.example .env   # facultatif : PORT par défaut = 3000
```

---

## 6. Commandes de démarrage

| Commande | Description |
| --- | --- |
| `npm run start:dev` | Démarrage en mode développement avec rechargement à chaud |
| `npm start` | Démarrage via la CLI NestJS |
| `npm run start:prod` | Démarrage du build de production (`node dist/main.js`) |

Une fois l'application démarrée : API sur `http://localhost:3000`, documentation Swagger sur `http://localhost:3000/docs`.

---

## 7. Commandes de build, lint et tests

| Commande | Description |
| --- | --- |
| `npm run build` | Compilation de production dans `dist/` (inclut la copie du dataset JSON) |
| `npm run lint` | Analyse ESLint (`--max-warnings 0`) |
| `npm run format` | Mise en forme Prettier |
| `npm test` | Tests unitaires (calculs, cas d'usage, repository) |
| `npm run test:watch` | Tests unitaires en mode surveillance |
| `npm run test:cov` | Tests unitaires avec couverture |
| `npm run test:e2e` | Tests d'intégration HTTP avec Supertest |

---

## 8. Documentation des endpoints

Base locale : `http://localhost:3000`. Documentation interactive : `GET /docs` (schéma OpenAPI brut : `GET /docs-json`).

### `GET /players`

Retourne la liste complète des joueurs, triée par `data.rank` croissant puis par `id` croissant en cas de rang identique.

```bash
curl http://localhost:3000/players
```

```json
[
  {
    "id": 17,
    "firstname": "Rafael",
    "lastname": "Nadal",
    "shortname": "R.NAD",
    "sex": "M",
    "country": { "picture": "https://tenisu.latelier.co/resources/Espagne.png", "code": "ESP" },
    "picture": "https://tenisu.latelier.co/resources/Nadal.png",
    "data": { "rank": 1, "points": 1982, "weight": 85000, "height": 185, "age": 33, "last": [1, 0, 0, 0, 1] }
  }
]
```

### `GET /players/:id`

Retourne le joueur correspondant à son identifiant.

```bash
curl http://localhost:3000/players/52
```

- `400 Bad Request` : identifiant non entier ou non positif.
- `404 Not Found` : identifiant valide mais inexistant.

### `GET /statistics`

Retourne le pays au meilleur ratio de victoires, l'IMC moyen et la médiane des tailles.

```bash
curl http://localhost:3000/statistics
```

```json
{
  "countryWithHighestWinRatio": { "code": "SRB", "wins": 5, "matches": 5, "ratio": 1 },
  "averageBmi": 23.36,
  "medianHeightCm": 185
}
```

### `POST /players`

Ajoute un joueur. L'identifiant est facultatif : s'il est omis, le prochain entier supérieur au plus grand identifiant existant est attribué (soit `103` avec le dataset initial).

```bash
curl -i -X POST http://localhost:3000/players \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Roger",
    "lastname": "Federer",
    "shortname": "R.FED",
    "sex": "M",
    "country": { "picture": "https://tenisu.latelier.co/resources/Suisse.png", "code": "SUI" },
    "picture": "https://tenisu.latelier.co/resources/Federer.png",
    "data": { "rank": 3, "points": 2000, "weight": 85000, "height": 185, "age": 37, "last": [1, 0, 1] }
  }'
```

```http
HTTP/1.1 201 Created
Location: /players/103
```

- `201 Created` : joueur créé, avec l'en-tête `Location` pointant vers `/players/:id`.
- `400 Bad Request` : charge utile invalide (champ manquant, format incorrect, champ inconnu).
- `409 Conflict` : identifiant déjà utilisé.

### `GET /health`

Utilisé comme health check par l'hébergeur.

```json
{ "status": "ok" }
```

### Validation appliquée aux entrées

`ValidationPipe` est configurée globalement avec `whitelist: true`, `forbidNonWhitelisted: true` et `transform: true` : aucun champ inconnu n'est accepté silencieusement.

- `firstname`, `lastname`, `shortname` : chaînes non vides ;
- `sex` : `M` ou `F` ;
- `country.code` : trois lettres majuscules ; `country.picture` et `picture` : URLs valides ;
- `data.rank`, `data.points`, `data.weight`, `data.height`, `data.age` : entiers positifs ;
- `data.last` : tableau non vide composé uniquement de `0` et `1` ;
- `id`, lorsqu'il est fourni : entier positif.

---

## 9. Règles de calcul des statistiques

### Ratio de victoires par pays

1. Regrouper les joueurs par code pays.
2. Additionner les victoires (`1` dans `data.last`) de tous les joueurs du pays.
3. Additionner les matchs (longueur de `data.last`) de tous les joueurs du pays.
4. Calculer `ratio = totalWins / totalMatches`.

Le ratio est **agrégé** : il n'est jamais calculé comme la moyenne des ratios individuels des joueurs. Le résultat est exprimé entre 0 et 1. En cas d'égalité, le code pays alphabétiquement le premier est retenu (résultat déterministe).

### IMC moyen

1. Convertir le poids des grammes en kilogrammes.
2. Convertir la taille des centimètres en mètres.
3. Calculer `IMC = poidsKg / (tailleM × tailleM)` pour chaque joueur.
4. Faire la moyenne arithmétique des IMC.
5. Arrondir **uniquement la moyenne finale** à deux décimales (aucun arrondi intermédiaire).

La moyenne des poids et la moyenne des tailles ne sont jamais utilisées pour en déduire un IMC.

### Médiane des tailles

1. Trier les tailles (en centimètres) par ordre croissant.
2. Nombre impair de joueurs : retourner la taille centrale.
3. Nombre pair de joueurs : retourner la moyenne des deux tailles centrales.

### Valeurs de référence (dataset initial)

| Indicateur | Valeur |
| --- | --- |
| Pays au meilleur ratio | `SRB` |
| Victoires / matchs du pays | `5` / `5` |
| Ratio | `1` |
| IMC moyen | `23.36` |
| Médiane des tailles | `185` cm |

---

## 10. Statuts d'erreur

Les erreurs suivent le format natif de NestJS :

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Aucun joueur ne correspond à l'identifiant 9999."
}
```

| Code | Cas |
| --- | --- |
| `400 Bad Request` | Paramètre de route ou corps de requête invalide |
| `404 Not Found` | Joueur introuvable |
| `409 Conflict` | Identifiant déjà utilisé |
| `500 Internal Server Error` | Erreur inattendue |

Les erreurs métier du domaine (`PlayerNotFoundError`, `PlayerIdAlreadyExistsError`) sont indépendantes du framework et traduites en réponses HTTP par un filtre d'exceptions (`DomainExceptionFilter`). Aucune stack trace ni détail interne n'est exposé.

---

## 11. Limites du repository en mémoire

Le repository (`InMemoryPlayerRepository`) conserve les joueurs **en mémoire du processus** :

- les joueurs créés via `POST /players` sont consultables tant que le processus tourne ;
- ils sont **perdus à chaque redémarrage ou redéploiement** ; sur Render, un redéploiement ou une remise en veille du service réinitialise les données ;
- les données repartent toujours du dataset `headtohead.json` embarqué dans le build.

Le contrat `PlayerRepository` (`findAll`, `findById`, `save`) est asynchrone et indépendant du stockage : une implémentation PostgreSQL pourra le remplacer sans modifier les cas d'usage ni les controllers.

---

## 12. Déploiement sur Render

Le fichier [`render.yaml`](./render.yaml) décrit un service web minimal :

- **Build command** : `npm ci && npm run build`
- **Start command** : `npm run start:prod`
- **Health check** : `/health`
- **Branche** : `main` (Render utilise `master` par défaut)
- **Déploiement automatique** : `autoDeployTrigger: checksPass`, c'est-à-dire un déploiement uniquement si les checks du workflow GitHub Actions passent sur `main`

Créer le service :

1. Pousser le dépôt sur GitHub.
2. Dans Render : **New → Web Service**, puis connecter le dépôt.
3. Render détecte `render.yaml` (**Blueprint**) ou reprendre manuellement les commandes ci-dessus.
4. Vérifier que la variable `PORT` est bien fournie par Render (le serveur écoute sur `process.env.PORT`, avec `3000` comme repli local, et sur `0.0.0.0`).
5. Après déploiement, contrôler `GET https://<service>.onrender.com/health` (doit renvoyer `{ "status": "ok" }`) puis `GET /statistics` et `GET /docs`.

L'application n'a **pas** été déployée dans le cadre de ce rendu : seules la configuration et les vérifications locales ont été réalisées.

---

## Tests

```bash
npm test         # 33 tests unitaires (calculs, cas d'usage, repository)
npm run test:e2e # 18 tests d'intégration HTTP
```

Scénarios couverts : tri par rang puis par identifiant, détail d'un joueur, `404` et `400` sur identifiant, agrégation des matchs par pays, ratio sur totaux agrégés, conversions d'unités de l'IMC, moyenne des IMC, médiane pour un nombre impair et pair de tailles, égalités de ratio, création valide, génération d'identifiant, `409` sur doublon, rejets de corps invalides et de champs inconnus, health check.

Les tests sont déterministes et indépendants : chaque test construit un repository neuf (avec le dataset réel ou des données de test), sans partage d'état.
