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
- Ajouter des **participants** au projet (optionnel) — nom libre, max 100 caractères
- Page dédiée aux informations du projet (toutes les infos sont modifiables)
- Guard "Quitter sans enregistrer" si des modifications non sauvegardées sont détectées
- Plusieurs projets peuvent coexister

### Catégories & sous-catégories (données initiales, seeded une seule fois)
```
Transports  → Avion, Voiture, Essence, Péage, Parking, Bus/Métro/Tramway, Train
Nourriture  → Restaurant, Sur le pouce, Supérette
Visites     → Stade, Musée, Autres
Shopping    → Perso, Cadeaux
Logement    → Hôtel, Air BNB, Appart'Hôtel
```

### Ajout / modification d'une dépense (page dédiée)
- Date de la dépense (max : aujourd'hui, pas de dépense future)
- Montant + devise (EUR par défaut, modifiable via picker intégré dans le champ)
- Catégorie + sous-catégorie
- Participant (optionnel — visible uniquement si le projet a des participants)
- Commentaire libre (optionnel, max 500 caractères)
- Modification et suppression depuis la liste des dépenses

### Récapitulatif des dépenses (par projet)
- Bilan budget : dépensé, budget initial, restant, barre de progression colorée
- Calcul du **budget restant par jour** = (budget initial − total dépensé) ÷ jours restants
- Dépenses du jour en cours (si le voyage a commencé)
- Résumé **par participant** (masqué si aucun participant)
- Tableau **par catégorie** : montant total — clic → détail par sous-catégorie

### Liste des dépenses
- Dépenses groupées **par jour**, triées par date décroissante
- Chaque groupe est collapsible (le jour le plus récent est ouvert par défaut)
- En-tête affichant le total du jour
- Chaque ligne affiche : sous-catégorie, catégorie · participant (si applicable), commentaire, montant, devise
- Actions modifier et supprimer sur chaque dépense (suppression avec confirmation)
- En-tête de liste : total dépensé + budget initial prévu

### Export PDF
- Bilan budget avec camembert (dépensé vs restant, ou dépassement)
- Récapitulatif par catégorie avec camemberts par sous-catégorie
- Liste complète des dépenses groupées par catégorie/sous-catégorie
- Partage natif via expo-sharing

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

-- Participants d'un projet (optionnel)
CREATE TABLE participants (
  id         INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL
);

-- Dépenses
CREATE TABLE expenses (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
  participant_id INTEGER REFERENCES participants(id),  -- NULL si non attribué
  amount         REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'EUR',
  date           TEXT NOT NULL,  -- ISO 8601
  comment        TEXT,           -- NULL si absent
  created_at     TEXT NOT NULL
);
```

Index présents : `(project_id, date DESC)`, `(subcategory_id)`, `(project_id)` sur participants, `(project_id, subcategory_id)` sur expenses.

> Les colonnes `comment` et `participant_id` sont ajoutées par migration `ALTER TABLE` au démarrage si absentes (compatibilité bases existantes).

---

## Structure des écrans (navigation)

```
App (Stack racine)
├── HomeScreen                  — liste des projets vacances
├── CreateProjectScreen         — création d'un nouveau voyage
├── EditProjectScreen           — modification d'un voyage (même composant, mode détecté via params)
├── ProjectTabs (Bottom Tabs, par projet)
│   ├── SummaryScreen           — récapitulatif budget + catégories + participants
│   ├── ExpenseListScreen       — liste des dépenses groupées par jour
│   └── ProjectInfoScreen       — infos du projet, export PDF, suppression
├── (modal) AddExpenseScreen    — ajout d'une dépense
├── (modal) EditExpenseScreen   — modification d'une dépense (même composant que AddExpense)
└── (modal) CategoryDetailScreen — détail sous-catégories avec dépenses (depuis SummaryScreen)
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
| Budget positif | `#2E7D32` (vert — budget restant positif) |
| Titres | Poppins SemiBold |
| Corps | Poppins Regular |
| Border radius cartes | 16 |
| Icônes | Material outlined |

Toutes les couleurs sémantiques sont centralisées dans `src/theme/index.ts` (objet `theme` pour les couleurs Material Design 3, objet `colors` pour les couleurs utilitaires).

---

## Structure du projet

```
src/
├── db/
│   └── database.ts       — init SQLite, migrations, toutes les requêtes
├── stores/
│   ├── projectStore.ts   — CRUD projets
│   ├── expenseStore.ts   — CRUD dépenses, résumé catégories, résumé participants
│   └── participantStore.ts — CRUD participants (utilisé par ProjectInfoScreen)
├── screens/
│   ├── HomeScreen.tsx
│   ├── CreateProjectScreen.tsx  — création ET modification (param projectId → mode edit)
│   ├── ProjectInfoScreen.tsx
│   ├── SummaryScreen.tsx
│   ├── ExpenseListScreen.tsx
│   ├── AddExpenseScreen.tsx     — ajout ET modification (param expenseId → mode edit)
│   └── CategoryDetailScreen.tsx
├── components/
│   ├── CurrencyPicker.tsx  — modal de sélection de devise, mode autonome ou contrôlé
│   ├── OptionPicker.tsx    — modal de sélection générique (catégorie, sous-catégorie)
│   └── ParticipantManager.tsx — ajout/suppression de participants dans un formulaire
├── navigation/
│   ├── index.tsx           — RootNavigator (Stack + ProjectTabs)
│   └── types.ts            — types des paramètres de navigation
├── utils/
│   ├── pdfExport.ts        — génération HTML + SVG camemberts + export PDF
│   └── validation.ts       — parseAmount (virgule/point, max 1 000 000)
└── types/
    └── index.ts            — interfaces TypeScript partagées
```

---

## Conventions de code

- TypeScript strict, pas de `any`
- Un fichier par composant, nommé en PascalCase
- Stores Zustand dans `src/stores/` — cache par `loadedForProjectId`, invalidation explicite après mutation
- Accès SQLite uniquement via `src/db/database.ts` (jamais directement depuis les screens)
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
