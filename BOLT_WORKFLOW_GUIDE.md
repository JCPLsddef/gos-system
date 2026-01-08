# Guide: Utiliser Bolt.new pour Améliorer GOS System

## 🎯 Workflow Recommandé

### Option A: Améliorer une Page Existante

#### 1. Préparer le Contexte pour Bolt

**Avant d'aller sur Bolt, rassemble:**

- Le code de la page actuelle (copie le fichier .tsx)
- Les dépendances utilisées (shadcn/ui, Tailwind)
- La structure de tes données (Supabase schema si besoin)

**Exemple pour améliorer `/dashboard/warmap`:**

```bash
# Copie le code de la page
cat app/dashboard/warmap/page.tsx

# Note les composants utilisés
# - components/ui/card
# - components/ui/button
# - lib/supabase
# etc.
```

#### 2. Prompt pour Bolt

**Template de Prompt Efficace:**

```
Je veux améliorer cette page de mon app Next.js 14 (App Router).

CONTEXTE:
- Framework: Next.js 14 avec App Router
- Styling: Tailwind CSS
- UI Library: shadcn/ui
- Backend: Supabase
- TypeScript

PAGE ACTUELLE:
[Colle le code de app/dashboard/warmap/page.tsx]

AMÉLIORATION SOUHAITÉE:
[Décris ce que tu veux changer, par exemple:]
- Ajouter des animations fluides quand on survole les battlefronts
- Améliorer le design des cartes pour qu'elles soient plus modernes
- Ajouter un système de filtres par statut (active, paused, completed)
- Rendre le layout plus responsive sur tablette

CONTRAINTES:
- Garde la même structure de données Supabase
- Utilise les mêmes composants shadcn/ui
- Ne change pas la logique d'authentification
- Assure-toi que c'est compatible avec le déploiement Vercel

IMPORTANT: Ne crée PAS de déploiement, je vais intégrer le code moi-même.
```

#### 3. Récupérer le Code de Bolt

**Après que Bolt génère le code:**

a) **Teste dans Bolt** d'abord:
   - Vérifie que le design te plaît
   - Teste les interactions
   - Demande des ajustements si nécessaire

b) **Copie le code amélioré:**
   - Clique sur l'icône `<>` (code) en haut à droite dans Bolt
   - Copie le code du fichier `.tsx` modifié
   - NE COPIE PAS les fichiers de config (package.json, etc.)

c) **Copie uniquement les NOUVEAUX composants** (si Bolt en a créé):
   - Si Bolt a créé un nouveau composant dans `components/`, copie-le
   - Vérifie que le chemin est compatible avec ta structure

#### 4. Intégrer dans Ton Projet

**Retour dans VS Code:**

```bash
# 1. Sauvegarde l'ancienne version (au cas où)
cp app/dashboard/warmap/page.tsx app/dashboard/warmap/page.tsx.backup

# 2. Remplace avec le nouveau code
# (Colle le code de Bolt dans app/dashboard/warmap/page.tsx)

# 3. Vérifie les imports
# Assure-toi que les chemins des imports sont corrects:
# - '@/components/ui/...' ✅
# - '@/lib/...' ✅

# 4. Teste localement
npm run dev

# 5. Ouvre http://localhost:3000/dashboard/warmap
# Vérifie que tout marche
```

#### 5. Vérifier et Ajuster

**Checklist avant de commit:**

- [ ] La page se charge sans erreurs
- [ ] Les données Supabase s'affichent correctement
- [ ] L'authentification marche toujours
- [ ] Responsive sur mobile/desktop
- [ ] Pas d'erreurs TypeScript (`npm run typecheck`)
- [ ] Build réussit (`npm run build`)

#### 6. Déployer

```bash
# Si tout marche bien:
git add app/dashboard/warmap/page.tsx

# Si Bolt a créé de nouveaux composants:
git add components/...

git commit -m "feat: Améliorer UI de la War Map avec animations et filtres"

git push

# → Vercel déploie automatiquement en ~2-3 minutes
```

---

## 🎨 Option B: Créer une Nouvelle Page

### 1. Prompt pour Bolt

```
Crée une nouvelle page pour mon app Next.js 14 GOS System.

CONTEXTE:
- Framework: Next.js 14 avec App Router
- Styling: Tailwind CSS avec thème sombre (slate-900, blue-600)
- UI Library: shadcn/ui (Card, Button, Badge, etc.)
- Backend: Supabase avec TypeScript
- Déploiement: Vercel

NOUVELLE PAGE: Dashboard Analytics
URL: /dashboard/analytics

FONCTIONNALITÉS:
- Afficher des graphiques de statistiques (missions completées, battlefronts actifs)
- Utiliser recharts pour les graphiques
- Design cohérent avec le reste de l'app (thème militaire/commande)
- Récupérer les données depuis Supabase

SCHÉMA SUPABASE (si pertinent):
[Décris tes tables: missions, battlefronts, etc.]

CONTRAINTES:
- Utilise 'use client' si nécessaire pour les interactions
- Respecte la structure Next.js App Router
- Ne crée PAS de déploiement, je vais l'intégrer moi-même

Commence par créer le fichier app/dashboard/analytics/page.tsx
```

### 2. Intégrer la Nouvelle Page

```bash
# 1. Crée le dossier
mkdir -p app/dashboard/analytics

# 2. Crée le fichier et colle le code de Bolt
# app/dashboard/analytics/page.tsx

# 3. Ajoute le lien dans la navigation
# Édite components/dashboard-layout.tsx ou ton menu

# 4. Si Bolt a créé des composants réutilisables:
# Copie-les dans components/

# 5. Si Bolt utilise de nouvelles dépendances (ex: recharts):
npm install recharts

# 6. Teste
npm run dev

# 7. Deploy
git add .
git commit -m "feat: Ajouter page Analytics avec graphiques"
git push
```

---

## ⚠️ Ce qu'il NE FAUT PAS Faire

### ❌ Ne JAMAIS Copier Ces Fichiers de Bolt:

- `package.json` → Risque de casser tes dépendances
- `next.config.js` → Peut casser ta config Vercel
- `middleware.ts` → Ton middleware auth est crucial
- `.env` ou `.env.local` → Contiennent tes secrets
- `lib/supabase.ts` → Configuration custom pour auth
- `tsconfig.json` → Configuration spécifique à ton projet

### ❌ Ne PAS Dire à Bolt:

- "Déploie ça pour moi" → Tu veux déployer sur Vercel, pas sur Bolt
- "Configure Supabase" → Ton Supabase est déjà configuré
- "Crée tout le projet" → Tu veux juste améliorer une page

### ✅ Ce qu'il FAUT Copier de Bolt:

- Les fichiers `.tsx` des pages améliorées
- Les nouveaux composants React
- Les nouveaux styles Tailwind
- Les nouvelles fonctions utilitaires

---

## 🚀 Workflow Complet: Exemple Pratique

### Scénario: Améliorer la Page Missions

**1. Sur Bolt.new:**

```
Améliore cette page de missions de mon app GOS System (Next.js 14).

[Colle le code de app/dashboard/missions/page.tsx]

AMÉLIORATIONS:
- Ajouter un système de tri (par date, priorité, battlefront)
- Ajouter des filtres visuels avec animations
- Améliorer les cartes de missions avec des badges colorés selon statut
- Ajouter un bouton "Quick Add Mission" qui ouvre un modal
- Utiliser shadcn/ui Dialog pour le modal

GARDE:
- La même logique Supabase
- Les mêmes routes Next.js
- L'authentification actuelle

Ne déploie pas, je vais l'intégrer moi-même.
```

**2. Bolt Génère le Code:**

Bolt crée:
- `app/dashboard/missions/page.tsx` (amélioré)
- `components/missions/mission-filters.tsx` (nouveau)
- `components/missions/quick-add-dialog.tsx` (nouveau)

**3. Dans Ton Projet:**

```bash
# Backup
cp app/dashboard/missions/page.tsx app/dashboard/missions/page.tsx.backup

# Copie le code amélioré
# (Colle le nouveau code dans app/dashboard/missions/page.tsx)

# Crée les nouveaux composants
mkdir -p components/missions
# (Colle mission-filters.tsx et quick-add-dialog.tsx)

# Teste
npm run dev

# Si ça marche:
git add app/dashboard/missions/ components/missions/
git commit -m "feat: Améliorer page Missions avec filtres et quick add"
git push
```

**4. Vercel Déploie Automatiquement:**

- Attends 2-3 minutes
- Vérifie sur https://gos-system.vercel.app/dashboard/missions
- Teste sur mobile aussi

---

## 📝 Templates de Prompts pour Bolt

### Template: Améliorer le Design

```
Améliore le design de cette page [NOM] pour mon app GOS System.

[CODE ACTUEL]

STYLE SOUHAITÉ:
- Plus moderne et épuré
- Animations fluides au hover
- Meilleure hiérarchie visuelle
- Plus d'espace blanc (breathing room)

THÈME:
- Garde le thème militaire/command center
- Couleurs: slate-900, blue-600, slate-700
- Utilise les composants shadcn/ui

Ne change pas la logique, juste le design.
```

### Template: Ajouter une Fonctionnalité

```
Ajoute cette fonctionnalité à ma page [NOM] (Next.js 14 + Supabase).

[CODE ACTUEL]

FONCTIONNALITÉ:
[Décris en détail ce que tu veux]

INTÉGRATION SUPABASE:
[Décris quelle table, quelles colonnes]

DESIGN:
- Cohérent avec le reste de l'app
- Utilise shadcn/ui
- Responsive mobile

Ne déploie pas, je vais l'intégrer.
```

### Template: Créer un Nouveau Composant

```
Crée un composant React réutilisable pour mon app GOS System.

COMPOSANT: [NOM]
PATH: components/[chemin]/[nom].tsx

PROPS:
[Définis les props TypeScript]

FONCTIONNALITÉ:
[Décris ce que fait le composant]

STYLE:
- shadcn/ui + Tailwind
- Thème sombre (slate-900)
- Animations fluides

EXEMPLE D'UTILISATION:
[Montre comment tu veux l'utiliser]
```

---

## 🎯 Résumé: Workflow Optimal

1. **Bolt** → Générer/améliorer le code
2. **Local** → Copier uniquement les fichiers nécessaires
3. **Test** → `npm run dev` et vérifier
4. **Commit** → Git add + commit avec message clair
5. **Push** → `git push`
6. **Vercel** → Déploiement automatique (2-3 min)
7. **Test Production** → Vérifier sur gos-system.vercel.app

**Clé du succès:** Bolt génère, toi tu intègres sélectivement! Ne jamais copier aveuglément tout.

---

## 🔥 Conseils Pro

### Pour des Meilleurs Résultats avec Bolt:

1. **Sois spécifique** dans tes prompts
2. **Fournis le contexte** (framework, libs, thème)
3. **Montre le code actuel** si tu améliores
4. **Définis les contraintes** (Supabase, auth, etc.)
5. **Demande exactement ce que tu veux** (pas plus)

### Pour Éviter les Problèmes:

1. **Teste toujours localement** avant de push
2. **Vérifie TypeScript** (`npm run typecheck`)
3. **Vérifie le build** (`npm run build`)
4. **Teste sur mobile** après déploiement
5. **Garde des backups** (fichiers .backup)

---

**Questions? Problèmes d'intégration?** Demande-moi et je t'aide! 🚀
