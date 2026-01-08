# Preview Mode - Guide d'Utilisation

## 🎯 Objectif

Le **Preview Mode** permet de visualiser l'UI de l'application dans Bolt.new ou d'autres environnements de preview **SANS** configurer Supabase, tout en maintenant la sécurité stricte en production.

---

## 🔍 Détection Automatique

Le Preview Mode est **automatiquement activé** lorsque les variables d'environnement Supabase sont absentes:

```typescript
// Preview Mode détecté si:
!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Environnements

| Environnement | Variables Supabase | Mode Activé |
|---------------|-------------------|-------------|
| **Production (Vercel)** | ✅ Présentes | Production Mode |
| **Bolt.new** | ❌ Absentes | **Preview Mode** |
| **StackBlitz** | ❌ Absentes | **Preview Mode** |
| **Local (avec .env)** | ✅ Présentes | Production Mode |
| **Local (sans .env)** | ❌ Absentes | **Preview Mode** |

---

## 🎨 Comportement en Preview Mode

### 1. **Authentification**

**Mock User Automatique:**
```typescript
{
  id: 'preview-user-id',
  email: 'preview@example.com',
  role: 'authenticated',
  // ... mock user complet
}
```

- ✅ L'UI s'affiche comme si un utilisateur était connecté
- ✅ Accès à toutes les pages protégées (`/dashboard/*`)
- ❌ Impossible de se connecter réellement (login/signup désactivés)
- ❌ Aucune requête Supabase exécutée

### 2. **Navigation**

**Route Root `/`:**
```
Preview Mode: "/" → "/dashboard/warmap" (redirect automatique)
Production: "/" → "/login" (si non authentifié)
```

**Routes Protégées:**
```
Preview Mode: Accès autorisé sans auth
Production: Middleware bloque si non authentifié
```

### 3. **Middleware**

**Bypass Complet:**
```typescript
// En Preview Mode, le middleware autorise TOUT:
if (isPreviewMode()) {
  return response; // Pas de check auth
}
```

### 4. **Données**

- ❌ **Aucune requête Supabase** n'est exécutée
- ⚠️ Les listes/tableaux seront **vides** (pas de données réelles)
- ✅ L'UI/layout/design s'affiche correctement
- ✅ Navigation entre pages fonctionne

---

## 🔒 Comportement en Production

**AUCUN CHANGEMENT** - Le comportement production reste **strictement identique**:

### 1. **Authentification**

- ✅ Auth Supabase obligatoire
- ✅ Middleware bloque accès non autorisé
- ✅ Login/signup fonctionnent normalement
- ✅ Sessions gérées via cookies Supabase

### 2. **Sécurité**

- ✅ RLS policies actives
- ✅ Validation serveur stricte
- ✅ Aucun bypass possible
- ✅ Aucune régression de sécurité

### 3. **Données**

- ✅ Toutes les requêtes Supabase fonctionnent
- ✅ Données réelles chargées
- ✅ CRUD operations normales

---

## 🧪 Utilisation dans Bolt.new

### Étape 1: Importer le Projet

1. **Aller sur Bolt.new**
2. **Upload/Import** ton code source
3. **NE PAS** ajouter de variables d'environnement

### Étape 2: Lancer le Preview

```bash
# Bolt lance automatiquement:
npm install
npm run dev
```

### Étape 3: Navigation

1. **Preview s'ouvre automatiquement**
2. **"/" redirige vers "/dashboard/warmap"**
3. **Tu peux naviguer librement:**
   - `/dashboard/warmap` - War Map
   - `/dashboard/missions` - Missions
   - `/dashboard/calendar` - Calendrier
   - `/dashboard/strategy` - Stratégie
   - etc.

### Étape 4: Comportement Attendu

**✅ Ce qui marche:**
- Navigation entre pages
- UI/layout/design affichés
- Composants visuels
- Responsive design
- Boutons/interactions UI

**❌ Ce qui ne marche pas (normal):**
- Login réel
- Chargement de données
- CRUD operations
- Synchronisation Supabase
- Notifications

### Console Logs

Tu verras ces logs dans la console:

```
🎨 [Middleware] Preview Mode Active - Auth bypassée, UI seulement
✅ Preview Mode - Accès autorisé sans auth: /dashboard/warmap
🎨 [AuthContext] Preview Mode Active - Auth bypassée, UI seulement
🎨 Preview Mode - Mock user activé
🎨 [RootPage] Preview Mode Active - Auth bypassée, UI seulement
🎨 Preview Mode - Redirect vers /dashboard/warmap
```

---

## 🛠️ API Preview Mode

### Helper `isPreviewMode()`

```typescript
import { isPreviewMode } from '@/lib/preview-mode';

// Dans n'importe quel composant/page
if (isPreviewMode()) {
  // Code spécifique au preview
  console.log('Preview mode actif');
} else {
  // Code production normal
  fetchDataFromSupabase();
}
```

### Helper `isProductionMode()`

```typescript
import { isProductionMode } from '@/lib/preview-mode';

if (isProductionMode()) {
  // Code production uniquement
}
```

### Helper `logCurrentMode()`

```typescript
import { logCurrentMode } from '@/lib/preview-mode';

// Log automatique du mode actuel
logCurrentMode('MonComposant');
// Output: 🎨 [MonComposant] Preview Mode Active...
// ou: 🔒 [MonComposant] Production Mode - Auth stricte active
```

### Mock Data

```typescript
import { PREVIEW_MOCK_USER, PREVIEW_MOCK_SESSION } from '@/lib/preview-mode';

// Utiliser le mock user/session si nécessaire
const user = isPreviewMode() ? PREVIEW_MOCK_USER : realUser;
```

---

## 🎯 Cas d'Usage

### 1. Design Review

**Partager l'UI avec un designer:**
1. Importer dans Bolt.new
2. Partager le lien Bolt
3. Designer peut voir le design sans backend
4. Feedback sur l'UI/UX

### 2. Démo Client

**Montrer l'app à un client:**
1. Preview Bolt.new
2. Client voit l'UI sans accès aux données réelles
3. Sécurisé - aucune donnée exposée

### 3. Développement UI

**Itérer sur le design:**
1. Code dans Bolt.new
2. Voir les changements instantanément
3. Pas besoin de configurer Supabase localement

### 4. Documentation

**Créer des screenshots:**
1. Preview dans Bolt
2. Capturer l'UI
3. Utiliser pour la doc

---

## 🔧 Architecture Technique

### Fichiers Modifiés

1. **`lib/preview-mode.ts`** (NOUVEAU)
   - Helpers de détection: `isPreviewMode()`, `isProductionMode()`
   - Mock data: `PREVIEW_MOCK_USER`, `PREVIEW_MOCK_SESSION`
   - Logging: `logCurrentMode()`

2. **`middleware.ts`**
   - Early return si Preview Mode
   - Bypass auth check complet
   - Logs explicites

3. **`lib/auth-context.tsx`**
   - Mock user/session si Preview Mode
   - Désactivation login/signup en preview
   - Auth normale en production

4. **`app/page.tsx`**
   - Redirect `/dashboard/warmap` en preview
   - Auth check normale en production

### Flux de Détection

```
Requête entrante
    ↓
Vérification env vars
    ↓
┌───────────────────────────────┐
│ NEXT_PUBLIC_SUPABASE_URL ?    │
└───────────────────────────────┘
    ↓                    ↓
  Absent              Présent
    ↓                    ↓
Preview Mode        Production Mode
    ↓                    ↓
Mock User           Auth Supabase
Bypass Middleware   Check Strict
UI seulement       Full Features
```

---

## ⚠️ Limitations Preview Mode

### Ne PAS utiliser pour:

- ❌ Tests fonctionnels (pas de vraie backend)
- ❌ Validation de données (pas de Supabase)
- ❌ Tests d'authentification (mock seulement)
- ❌ Tests de permissions (RLS bypass)
- ❌ Tests de performance (pas de vraies requêtes)

### Utiliser UNIQUEMENT pour:

- ✅ Design review
- ✅ UI/UX feedback
- ✅ Layout verification
- ✅ Navigation flow
- ✅ Responsive design
- ✅ Visual testing

---

## 🚀 Déploiement

### Production (Vercel)

**Aucun changement nécessaire:**
1. Variables Supabase configurées dans Vercel
2. Push to main → auto deploy
3. Production Mode activé automatiquement
4. Comportement normal

### Environnement Variables Vercel

**Vérifier que ces variables sont présentes:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Si présentes → Production Mode (normal)
Si absentes → Preview Mode (Bolt.new)

---

## ✅ Checklist Sécurité

**Production:**
- [x] Auth Supabase stricte
- [x] Middleware bloque accès non autorisé
- [x] RLS policies actives
- [x] Aucun bypass possible
- [x] Sessions sécurisées

**Preview:**
- [x] Aucune requête Supabase
- [x] Aucune donnée réelle exposée
- [x] Pas de vraie auth possible
- [x] UI seulement
- [x] Logs clairs dans console

**Code:**
- [x] TypeScript strict OK
- [x] Pas de `any` dangereux
- [x] Helpers type-safe
- [x] Documentation complète
- [x] Code commenté

---

## 📊 Résumé

| Aspect | Production | Preview |
|--------|-----------|---------|
| **Auth** | Supabase réelle | Mock user |
| **Middleware** | Check strict | Bypass complet |
| **Routes protégées** | Bloquées si non auth | Accessibles |
| **Données** | Chargées de Supabase | Vides (pas de backend) |
| **Login/Signup** | Fonctionnels | Désactivés |
| **UI/Layout** | Affichés | Affichés ✅ |
| **Sécurité** | Maximale | N/A (pas de backend) |

---

## 🎉 Résultat

Avec le Preview Mode, tu peux maintenant:

- ✅ **Importer ton projet dans Bolt.new**
- ✅ **Voir l'UI sans configurer Supabase**
- ✅ **Naviguer dans toutes les pages**
- ✅ **Partager des previews visuels**
- ✅ **Itérer sur le design rapidement**

Tout en gardant:

- ✅ **Production strictement sécurisée**
- ✅ **Aucune régression de sécurité**
- ✅ **Code professionnel et maintenable**

**Happy previewing!** 🚀
