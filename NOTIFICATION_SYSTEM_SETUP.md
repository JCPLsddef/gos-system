# Notification System Setup Guide

## Overview

Le système de notifications a été repensé pour envoyer des notifications **en temps réel** 15 minutes avant le début d'une mission, plutôt que de les créer lors de la création de la mission.

## Architecture

### Ancienne Approche (Avant)
1. Mission créée → Notification créée dans la BD avec `scheduled_for` = start_at - 15min
2. Client poll chaque 60s → Si `scheduled_for <= now`, envoyer la notification
3. **Problème**: Les notifications étaient créées à la création de la mission, pas en temps réel

### Nouvelle Approche (Maintenant)
1. Mission créée → **AUCUNE** notification créée
2. Edge Function s'exécute chaque minute via cron job
3. Edge Function vérifie: Y a-t-il des missions qui commencent dans 15-16 minutes?
4. Si oui et aucune notification n'existe → Créer la notification **maintenant**
5. Client poll comme avant → Envoie la notification immédiatement
6. **Avantage**: Notifications créées en temps réel, 15 minutes avant le début

## Fichiers Modifiés

### 1. Edge Function Créée
- **Fichier**: `supabase/functions/check-mission-notifications/index.ts`
- **Rôle**: Vérifie les missions toutes les minutes et crée les notifications en temps réel

### 2. Mission Service Modifié
- **Fichier**: `lib/missions-service.ts`
- **Changements**:
  - Supprimé les appels `scheduleNotificationForMission` de `createMission`
  - Supprimé les appels `scheduleNotificationForMission` de `updateMission`
  - Supprimé les appels `scheduleNotificationForMission` de `uncompleteMission`
  - Gardé les appels `cancelNotificationForMission` dans `completeMission` et `deleteMission`

### 3. Calendar Sync Modifié
- **Fichier**: `lib/mission-calendar-sync.ts`
- **Changements**:
  - Supprimé les appels `scheduleNotificationForMission` lors de la création d'événements calendrier
  - Supprimé les appels `scheduleNotificationForMission` lors de la mise à jour d'événements calendrier

## Déploiement

### Prérequis
1. Supabase CLI installé (`supabase --version`)
2. Projet Supabase configuré

### Étape 1: Déployer la Edge Function

```bash
# Naviguer vers le répertoire du projet
cd "/Users/jcpl/Downloads/GOS SYSTEM"

# Déployer la fonction
supabase functions deploy check-mission-notifications
```

### Étape 2: Configurer le Cron Job

Il y a deux méthodes pour configurer le cron job:

#### Méthode A: Via le Dashboard Supabase (Recommandé)

1. Aller dans votre projet Supabase Dashboard
2. Aller dans **Database → Extensions**
3. Activer l'extension `pg_cron` si pas déjà activée
4. Aller dans **SQL Editor**
5. Exécuter ce SQL:

```sql
-- Activer pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Créer le cron job pour vérifier les notifications chaque minute
SELECT cron.schedule(
  'check-mission-notifications',  -- nom du job
  '* * * * *',                     -- chaque minute
  $$
  SELECT
    net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-mission-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

**IMPORTANT**: Remplacer:
- `YOUR_PROJECT_REF` avec votre référence de projet Supabase
- `YOUR_ANON_KEY` avec votre clé publique Supabase (anon key)

#### Méthode B: Via Migration SQL

1. Créer un nouveau fichier de migration:

```bash
supabase migration new setup_notification_cron
```

2. Ajouter le contenu suivant dans le fichier créé:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the notification checker to run every minute
SELECT cron.schedule(
  'check-mission-notifications',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-mission-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

3. Appliquer la migration:

```bash
supabase db push
```

### Étape 3: Vérifier le Cron Job

```sql
-- Voir tous les cron jobs actifs
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Étape 4: Tester la Fonction Manuellement

```bash
# Tester localement
supabase functions invoke check-mission-notifications --no-verify-jwt

# Ou via curl
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-mission-notifications' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

### Voir les Logs de la Edge Function

```bash
# Via CLI
supabase functions logs check-mission-notifications

# Ou dans le Dashboard
# Aller dans Edge Functions → check-mission-notifications → Logs
```

### Vérifier les Notifications dans la BD

```sql
-- Voir toutes les notifications en attente
SELECT * FROM notifications
WHERE sent_at IS NULL
ORDER BY scheduled_for;

-- Voir les notifications récemment créées
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### La fonction ne s'exécute pas
1. Vérifier que `pg_cron` est activé: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Vérifier les logs du cron job: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. Vérifier l'URL et la clé API dans la configuration du cron

### Les notifications ne sont pas créées
1. Vérifier les logs de la fonction: `supabase functions logs check-mission-notifications`
2. Créer une mission de test qui commence dans 16 minutes
3. Attendre 1-2 minutes et vérifier si une notification a été créée
4. Vérifier que la mission a bien un `start_at` et pas de `completed_at`

### Les notifications sont créées en double
- La fonction vérifie déjà si une notification existe avant de la créer
- Si vous voyez des doublons, vérifier les logs pour identifier le problème

## Désactiver l'Ancien Système

L'ancien système a déjà été désactivé dans le code:
- ✅ `createMission` ne crée plus de notifications
- ✅ `updateMission` ne crée plus de notifications (mais annule les anciennes)
- ✅ `uncompleteMission` ne crée plus de notifications
- ✅ `syncMissionToCalendar` ne crée plus de notifications

Les fonctions de nettoyage sont toujours actives:
- ✅ `completeMission` annule les notifications
- ✅ `deleteMission` annule les notifications

## Flow Complet

```
1. User crée une mission avec start_at = "2026-01-07 16:30:00"
   └─> AUCUNE notification créée

2. À 16:14:00, Edge Function s'exécute (cron)
   └─> Cherche missions entre 16:29:00 et 16:30:00
   └─> Trouve la mission
   └─> Vérifie si notification existe → NON
   └─> Crée notification avec scheduled_for = "2026-01-07 16:15:00"

3. À 16:15:00, Client poll (chaque 60s)
   └─> Trouve notification avec scheduled_for <= now
   └─> Affiche la notification à l'utilisateur
   └─> Met à jour sent_at = "2026-01-07 16:15:00"

4. User voit la notification 15 minutes avant le début de la mission ✅
```

## Avantages du Nouveau Système

1. **Temps réel**: Les notifications sont créées dynamiquement, pas à la création de la mission
2. **Plus fiable**: Fonctionne même si la mission est créée des semaines à l'avance
3. **Moins de données**: Pas de notifications inutiles dans la BD pour les missions lointaines
4. **Flexible**: Facile de changer le timing (ex: 10 min, 5 min, etc.)
5. **Scalable**: Le cron job gère toutes les missions automatiquement
