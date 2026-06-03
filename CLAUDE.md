# myTravel — Budget Vacances

Application mobile de gestion de budget de voyage, disponible sur Android et iOS.

> **Note Expo :** Lire la doc versionnée sur https://docs.expo.dev/versions/v54.0.0/ avant d'écrire du code.

---

## Stack technique

| Couche | Choix |
|---|---|
| Framework | React Native + **Expo** (managed workflow) v54 |
| Langage | TypeScript (strict) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| Base de données locale | expo-sqlite |
| State management | Zustand |
| UI | React Native Paper (Material Design 3) |
| Fonts | Poppins (SemiBold titres, Regular corps) via expo-google-fonts |
| PDF | expo-print + expo-sharing |
| Dates | date-fns |
| Devises | Saisie libre par dépense, pas de conversion — devise par défaut : EUR |

---

## Fonctionnalités

### Projets vacances
- Créer un projet avec : nom (ex. "Rome 2026"), date de début, date de fin, budget initial, devise par défaut
- Page dédiée aux informations du projet (toutes les infos sont modifiables)
- Plusieurs projets peuvent coexister

### Catégories & sous-catégories (données initiales, seeded une seule fois)
```
Transports       → Avion, Voiture, Essence, Péage, Parking
Nourriture       → Restaurant, Sur le pouce, Supérette
Visites          → Stade, Musée, Autres
Shopping         → Perso, Cadeaux
```

### Ajout d'une dépense (page dédiée)
- Date de la dépense
- Montant
- Devise (EUR par défaut, modifiable)
- Catégorie + sous-catégorie

### Récapitulatif des dépenses (par projet)
- Tableau par catégorie : montant total par catégorie
- Clic sur une catégorie → détail par sous-catégorie
- Calcul du **budget restant par jour** = (budget initial − total dépensé) ÷ jours restants

### Liste des dépenses
- Toutes les dépenses du projet, triées par date (décroissant)
- En bas de page : total dépensé + budget initial prévu

### Export PDF
- Récapitulatif par catégorie et sous-catégorie
- Total dépensé vs budget initial
- Nom du fichier : `[nom-projet]_budget_[date-export].pdf`

---

## Schéma de base de données (SQLite)

```sql
-- Seeded une seule fois au premier lancement
CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE subcategories (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name        TEXT NOT NULL
);

-- Projets vacances
CREATE TABLE projects (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  start_date     TEXT NOT NULL,  -- ISO 8601
  end_date       TEXT NOT NULL,  -- ISO 8601
  initial_budget REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'EUR',
  created_at     TEXT NOT NULL
);

-- Dépenses
CREATE TABLE expenses (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
  amount         REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'EUR',
  date           TEXT NOT NULL,  -- ISO 8601
  created_at     TEXT NOT NULL
);
```

---

## Structure des écrans (navigation)

```
App
├── HomeScreen             — liste des projets vacances
├── ProjectStack (par projet)
│   ├── ProjectInfoScreen  — infos + modification du projet
│   ├── SummaryScreen      — récapitulatif par catégorie (+ budget/jour)
│   ├── ExpenseListScreen  — liste chronologique des dépenses
│   └── AddExpenseScreen   — formulaire d'ajout de dépense
└── (modal) CategoryDetail — détail sous-catégories (depuis SummaryScreen)
```

---

## Charte graphique — Bleu Voyage

| Élément | Valeur |
|---|---|
| Primary | `#1A6BAE` (bleu océan) |
| Secondary | `#00BCD4` (turquoise) |
| Background | `#F0F7FF` (blanc bleuté) |
| Surface | `#FFFFFF` |
| Error | `#D32F2F` |
| Text | `#1A237E` |
| Titres | Poppins SemiBold |
| Corps | Poppins Regular |
| Border radius cartes | 16 |
| Icônes | Material outlined |

---

## Structure du projet

```
src/
├── db/          — initialisation SQLite, requêtes
├── stores/      — stores Zustand
├── screens/     — un fichier par écran (PascalCase)
├── components/  — composants réutilisables
└── types/       — types TypeScript partagés
```

---

## Conventions de code

- TypeScript strict, pas de `any`
- Un fichier par composant, nommé en PascalCase
- Stores Zustand dans `src/stores/`
- Accès SQLite via des fonctions dans `src/db/`
- Pas de commentaires sauf pour les invariants non-évidents
- Toutes les dates stockées en ISO 8601, affichées avec date-fns en locale FR

---

## Test & développement

Stratégie de test : **Expo Go** sur téléphone physique (pas d'émulateur).

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"  # activer Node 20
npx expo start --tunnel   # obligatoire sous WSL2 (le téléphone ne voit pas l'IP WSL2)
```

Prérequis :
- Node.js 20 via nvm (`nvm use 20`)
- `@expo/ngrok` installé en devDependency (déjà fait)
- App **Expo Go** installée sur le téléphone (Android ou iOS)

> **WSL2** : ne jamais utiliser `npx expo start` sans `--tunnel`, le téléphone ne peut pas atteindre l'IP de la VM WSL2 depuis le réseau local.
