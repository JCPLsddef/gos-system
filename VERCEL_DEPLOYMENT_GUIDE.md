# Guide Déploiement Vercel - GOS System

## ✅ Configuration Actuelle

Ton app est **déjà déployée sur Vercel**: https://gos-system.vercel.app

GitHub est déjà configuré pour pointer vers Vercel (visible dans la section "About" du repo).

## 🚀 Step-by-Step: Assurer le Déploiement Vercel

### 1. Vérifier la Connexion GitHub → Vercel

**a) Aller sur Vercel Dashboard:**
- Va sur: https://vercel.com/dashboard
- Connecte-toi avec ton compte GitHub

**b) Vérifier le Projet:**
- Cherche "gos-system" dans tes projets
- Clique dessus pour voir les détails
- Tu devrais voir:
  - ✅ Connected to: `JCPLsddef/gos-system`
  - ✅ Production Branch: `main`
  - ✅ Auto-deploy: Enabled

### 2. Configurer les Variables d'Environnement

**Important:** Vercel a besoin des mêmes variables que ton `.env`

**a) Dans Vercel Dashboard:**
1. Va dans ton projet `gos-system`
2. Clique sur **Settings** (haut de page)
3. Clique sur **Environment Variables** (menu gauche)

**b) Ajouter les Variables:**

Ajoute ces variables pour **tous les environnements** (Production, Preview, Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://mhrsxkxayfvypjyopkce.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocnN4a3hheWZ2eXBqeW9wa2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODI0MzAsImV4cCI6MjA4MzA1ODQzMH0.5P8m8Lh87iZ3_SpVj7D9K_eX2fU4YFMR5wjRgD46ias
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocnN4a3hheWZ2eXBqeW9wa2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ4MjQzMCwiZXhwIjoyMDgzMDU4NDMwfQ.dtiBHXua7SPwWZEv_dHG4GHwy9tVZQSqggud-X3_97c
```

**c) Sauvegarder:**
- Clique sur **Save** pour chaque variable

### 3. Redéployer pour Appliquer les Variables

**a) Trigger un Nouveau Déploiement:**

**Option 1 - Via Git (Recommandé):**
```bash
git commit --allow-empty -m "chore: Trigger Vercel deployment"
git push
```

**Option 2 - Via Vercel Dashboard:**
1. Va dans **Deployments**
2. Clique sur les 3 points `...` du dernier déploiement
3. Clique sur **Redeploy**
4. Sélectionne **Use existing Build Cache** pour plus rapide
5. Clique sur **Redeploy**

**b) Attendre le Déploiement:**
- Temps estimé: ~2-3 minutes
- Status visible dans **Deployments**
- Notification quand c'est prêt

### 4. Vérifier que Tout Marche

**a) Tester l'URL de Production:**
- Ouvre: https://gos-system.vercel.app
- Teste la connexion avec tes credentials
- Vérifie que tu accèdes au dashboard
- Vérifie les battlefronts, missions, calendar

**b) Vérifier les Logs (si problème):**
1. Va dans **Deployments**
2. Clique sur le déploiement le plus récent
3. Onglet **Functions** → voir les logs des erreurs
4. Onglet **Runtime Logs** → voir les erreurs en temps réel

### 5. Configuration du Domaine (Optionnel)

**Si tu veux un domaine custom type `gos.ton-domaine.com`:**

**a) Ajouter un Domaine:**
1. Va dans **Settings** > **Domains**
2. Clique sur **Add**
3. Entre ton domaine (ex: `gos.example.com`)
4. Suis les instructions pour configurer les DNS

**b) Configurer les DNS:**
- Ajoute un enregistrement `CNAME` pointant vers `cname.vercel-dns.com`
- Attends propagation DNS (~10-60 min)

## 🔧 Workflow de Déploiement

### Déploiements Automatiques

**Chaque fois que tu push sur GitHub:**

```bash
git add .
git commit -m "feat: Nouvelle fonctionnalité"
git push
```

**→ Vercel détecte automatiquement:**
1. ✅ Récupère le code depuis GitHub
2. ✅ Lance `npm run build`
3. ✅ Déploie sur production si branch = `main`
4. ✅ Envoie notification de succès/échec

**→ Preview Deployments:**
- Si tu crées une branche et PR → Vercel crée un preview deployment
- URL unique pour tester avant merge
- Exemple: `gos-system-git-feature-xyz.vercel.app`

### Rollback en Cas de Problème

**Si un déploiement casse quelque chose:**

1. Va dans **Deployments**
2. Trouve le dernier déploiement qui marchait
3. Clique sur les 3 points `...`
4. Clique sur **Promote to Production**
5. → Retour instantané à la version précédente

## 📱 Mobile et PWA

### Pour Que Mobile Utilise Vercel

**Si ton mobile utilise encore Netlify ou ancienne version:**

1. **Désinstaller la PWA actuelle:**
   - iOS: Appui long sur icône > Supprimer l'app
   - Android: Paramètres > Apps > GOS > Désinstaller

2. **Vider le Cache:**
   - iOS Safari: Réglages > Safari > Effacer historique
   - Android Chrome: Paramètres > Confidentialité > Effacer données

3. **Visiter la Nouvelle URL:**
   - Ouvre Safari/Chrome
   - Va sur: **https://gos-system.vercel.app**
   - Connecte-toi

4. **Réinstaller PWA:**
   - iOS: Partager > Sur l'écran d'accueil
   - Android: Menu > Installer l'application

## 🎯 Bonnes Pratiques

### Variables Sensibles

**IMPORTANT:** Ne jamais commit les fichiers `.env*` dans Git
- ✅ Fichier `.gitignore` contient déjà `.env*`
- ✅ Variables stockées dans Vercel Dashboard
- ✅ Aucun secret dans le code

### Branches et Déploiements

**Setup Recommandé:**

```
main → Production (gos-system.vercel.app)
develop → Preview (gos-system-git-develop.vercel.app)
feature/* → Preview (gos-system-git-feature-xyz.vercel.app)
```

**Workflow:**
1. Crée une branche pour nouvelle feature
2. Vercel crée un preview deployment
3. Teste le preview
4. Merge dans `main` si OK
5. Auto-deploy en production

### Monitoring

**Vérifier la Santé de l'App:**

1. **Analytics (Gratuit):**
   - Va dans **Analytics**
   - Voir les performances (Core Web Vitals)
   - Voir le trafic

2. **Speed Insights (Recommandé):**
   - Activer dans **Settings** > **Speed Insights**
   - Monitoring des performances réelles

3. **Logs (En Cas d'Erreur):**
   - Va dans **Deployments** > dernier déploiement
   - **Runtime Logs** pour voir erreurs en temps réel

## 🆘 Troubleshooting

### Problème: Déploiement Échoue

**Solution:**
1. Vérifie les logs dans **Deployments**
2. Cherche l'erreur exacte
3. Vérifie que toutes les variables d'environnement sont configurées
4. Teste `npm run build` en local pour reproduire

### Problème: Variables d'Environnement Manquantes

**Solution:**
1. Va dans **Settings** > **Environment Variables**
2. Ajoute les variables manquantes
3. Redéploie (via git push ou redeploy button)

### Problème: Build Lent

**Solution:**
1. Vercel cache automatiquement `node_modules`
2. Si problème, force un fresh build:
   - **Deployments** > **Redeploy** > Décoche "Use existing Build Cache"

### Problème: 404 sur Routes

**Solution:**
- Next.js gère automatiquement les routes
- Vercel configure automatiquement les rewrites
- Pas besoin de fichier `vercel.json` pour Next.js

## ✅ Checklist Finale

**Vérifie que tout est OK:**

- [ ] Projet visible sur https://vercel.com/dashboard
- [ ] Variables d'environnement configurées (3 minimum)
- [ ] Dernier déploiement = "Ready" (vert)
- [ ] App accessible sur https://gos-system.vercel.app
- [ ] Login fonctionne
- [ ] Dashboard, battlefronts, missions fonctionnent
- [ ] Mobile peut se connecter et utiliser l'app
- [ ] Push sur GitHub trigger un nouveau déploiement

## 🎉 C'est Bon!

Une fois cette checklist complétée, ton app est **100% déployée sur Vercel** avec déploiements automatiques!

**URL Production:** https://gos-system.vercel.app

**Chaque push sur `main` = déploiement automatique en ~2-3 minutes**

---

**Questions? Problèmes?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/help
