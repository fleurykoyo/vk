# Guide de Déploiement sur Railway - Kortix/Suna

Railway est une plateforme cloud simple qui permet de déployer vos applications directement depuis GitHub avec un minimum de configuration.

## 🎯 Pourquoi Railway ?

- ✅ **Très simple** : Connectez votre repo GitHub, Railway fait le reste
- ✅ **Auto-deploy** : Déploiement automatique à chaque push
- ✅ **HTTPS inclus** : Certificats SSL automatiques
- ✅ **Variables d'environnement** : Interface simple pour gérer les secrets
- ✅ **Monitoring** : Logs et métriques intégrés
- ✅ **Pricing flexible** : Payez seulement ce que vous utilisez

## 📋 Prérequis

1. **Compte Railway** : Créez un compte sur [railway.app](https://railway.app)
2. **Compte GitHub** : Votre code doit être sur GitHub
3. **Services externes configurés** :
   - Supabase (production)
   - Clés API LLMs
   - Daytona (pour les sandboxes)

---

## 🚀 Étape 1 : Préparer le projet

### 1.1 Créer le fichier railway.json (optionnel mais recommandé)

Créez `railway.json` à la racine du projet :

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "uv run gunicorn api:app --workers 7 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 1800",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.2 S'assurer que le code est sur GitHub

```bash
# Si ce n'est pas déjà fait
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## 🚀 Étape 2 : Créer les services sur Railway

Railway utilise un système de **services** - vous devez créer 3 services :
1. **Backend** (API)
2. **Worker** (tâches en arrière-plan)
3. **Frontend** (interface web)
4. **Redis** (base de données - service Railway)

### 2.1 Créer un nouveau projet Railway

1. Allez sur [railway.app](https://railway.app)
2. Cliquez sur **"New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Choisissez votre dépôt `suna`

### 2.2 Créer le service Backend

1. Dans votre projet Railway, cliquez sur **"+ New"** → **"GitHub Repo"**
2. Sélectionnez votre repo `suna`
3. Railway détectera automatiquement le Dockerfile
4. **Configurez le service :**

   **Settings → General :**
   - **Name** : `suna-backend`
   - **Root Directory** : `/backend` (important !)
   - **Dockerfile Path** : `Dockerfile`

   **Settings → Deploy :**
   - **Start Command** : 
     ```
     uv run gunicorn api:app --workers 7 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 1800 --graceful-timeout 600 --keep-alive 1800 --max-requests 0 --forwarded-allow-ips '*' --worker-connections 2000 --worker-tmp-dir /dev/shm --preload --log-level info
     ```

### 2.3 Créer le service Worker

1. Cliquez sur **"+ New"** → **"GitHub Repo"** (même repo)
2. **Configurez le service :**

   **Settings → General :**
   - **Name** : `suna-worker`
   - **Root Directory** : `/backend` (important !)
   - **Dockerfile Path** : `Dockerfile`

   **Settings → Deploy :**
   - **Start Command** : 
     ```
     uv run dramatiq --skip-logging --processes 4 --threads 4 run_agent_background
     ```

### 2.4 Créer le service Frontend

1. Cliquez sur **"+ New"** → **"GitHub Repo"** (même repo)
2. **Configurez le service :**

   **Settings → General :**
   - **Name** : `suna-frontend`
   - **Root Directory** : `/frontend` (important !)
   - **Dockerfile Path** : `Dockerfile`

   **Settings → Deploy :**
   - Railway utilisera automatiquement le CMD du Dockerfile

### 2.5 Créer le service Redis

1. Cliquez sur **"+ New"** → **"Database"** → **"Add Redis"**
2. Railway créera automatiquement un service Redis managé
3. Notez les variables d'environnement générées (elles seront automatiquement partagées)

---

## 🔧 Étape 3 : Configurer les variables d'environnement

### 3.1 Variables pour le Backend

Allez dans **suna-backend** → **Variables** et ajoutez :

```bash
# ============================================
# MODE ENVIRONNEMENT - ⚠️ CRITIQUE
# ============================================
ENV_MODE=production

# ============================================
# SUPABASE (Production)
# ============================================
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=votre-jwt-secret

# ============================================
# REDIS (Railway génère automatiquement)
# ============================================
# Railway ajoute automatiquement :
# REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_URL
# Vous pouvez aussi utiliser les variables partagées du service Redis

# ============================================
# API KEYS - LLMs
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
# Ajoutez d'autres selon vos besoins

# ============================================
# DAYTONA (Pour les sandboxes)
# ============================================
DAYTONA_API_KEY=dtn_...
DAYTONA_SERVER_URL=https://app.daytona.io/api
DAYTONA_TARGET=us

# ============================================
# SÉCURITÉ
# ============================================
ENCRYPTION_KEY=generez-une-cle-32-bytes-base64
KORTIX_ADMIN_API_KEY=generez-une-cle-admin-hex

# ============================================
# SERVICES OPTIONNELS
# ============================================
TAVILY_API_KEY=...
FIRECRAWL_API_KEY=...
SERPER_API_KEY=...
EXA_API_KEY=...
AWS_BEARER_TOKEN_BEDROCK=...

# ============================================
# URLS (Railway génère automatiquement)
# ============================================
# Railway génère automatiquement RAILWAY_PUBLIC_DOMAIN
# Utilisez-le pour FRONTEND_URL et NEXT_PUBLIC_URL
```

**⚠️ IMPORTANT :** Railway génère automatiquement `$PORT` - votre application doit l'utiliser.

### 3.2 Variables pour le Worker

Allez dans **suna-worker** → **Variables** :

- Railway peut **partager les variables** du backend
- Cliquez sur **"Add Variable"** → **"Reference Variable"**
- Sélectionnez les variables du service `suna-backend`
- OU copiez les mêmes variables que le backend

### 3.3 Variables pour le Frontend

Allez dans **suna-frontend** → **Variables** :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BACKEND_URL=https://suna-backend-production.up.railway.app/api
NEXT_PUBLIC_URL=https://suna-frontend-production.up.railway.app
NEXT_PUBLIC_ENV_MODE=PRODUCTION
```

**⚠️ Note :** Remplacez les URLs par les domaines Railway générés (voir section Domaines).

---

## 🌐 Étape 4 : Configurer les domaines

### 4.1 Obtenir les domaines Railway

1. Pour chaque service, allez dans **Settings** → **Networking**
2. Railway génère automatiquement un domaine : `suna-backend-production.up.railway.app`
3. Notez ces domaines

### 4.2 Configurer un domaine personnalisé (optionnel)

1. Dans **Settings** → **Networking** → **Custom Domain**
2. Ajoutez votre domaine : `api.votre-domaine.com`
3. Railway vous donnera un enregistrement DNS à ajouter
4. Ajoutez-le dans votre registrar DNS

### 4.3 Mettre à jour les variables d'environnement

Une fois les domaines configurés, mettez à jour :

**Backend :**
```bash
FRONTEND_URL=https://votre-domaine.com
# OU
FRONTEND_URL=https://suna-frontend-production.up.railway.app
```

**Frontend :**
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com/api
# OU
NEXT_PUBLIC_BACKEND_URL=https://suna-backend-production.up.railway.app/api

NEXT_PUBLIC_URL=https://votre-domaine.com
# OU
NEXT_PUBLIC_URL=https://suna-frontend-production.up.railway.app
```

---

## 🔄 Étape 5 : Adapter le code pour Railway

### 5.1 Modifier le Dockerfile Backend pour Railway

Railway utilise la variable `$PORT` au lieu d'un port fixe. Vérifiez que votre Dockerfile est compatible :

Le Dockerfile actuel utilise le port 8000 en dur. Railway injecte `$PORT` automatiquement, mais vous devez vous assurer que Gunicorn l'utilise.

**Le start command que nous avons configuré utilise déjà `$PORT`**, donc c'est bon !

### 5.2 Modifier le Frontend pour Railway

Le Dockerfile frontend utilise déjà `PORT=3000` et `HOSTNAME="0.0.0.0"`, ce qui est compatible avec Railway.

---

## 🚀 Étape 6 : Déployer

### 6.1 Premier déploiement

1. Railway détecte automatiquement les changements sur GitHub
2. Cliquez sur **"Deploy"** pour chaque service
3. Ou faites un push sur GitHub :
   ```bash
   git push origin main
   ```
4. Railway déploiera automatiquement

### 6.2 Vérifier les déploiements

1. Allez dans chaque service → **Deployments**
2. Vérifiez les logs pour voir si tout fonctionne
3. Cliquez sur **"View Logs"** pour voir les logs en temps réel

---

## ✅ Étape 7 : Vérifier que tout fonctionne

### 7.1 Tester le Backend

```bash
# Utilisez le domaine Railway généré
curl https://suna-backend-production.up.railway.app/api/health

# Devrait retourner : {"status":"ok"}
```

### 7.2 Tester le Frontend

Ouvrez dans votre navigateur :
```
https://suna-frontend-production.up.railway.app
```

### 7.3 Vérifier les logs

Dans Railway, pour chaque service :
- **Logs** → Voir les logs en temps réel
- Vérifiez qu'il n'y a pas d'erreurs

---

## 🔧 Configuration avancée

### Partager des variables entre services

Railway permet de **partager des variables** entre services :

1. Dans un service, créez une variable
2. Dans un autre service, **"Add Variable"** → **"Reference Variable"**
3. Sélectionnez la variable du premier service

**Exemple :** Partagez `SUPABASE_URL` entre backend et frontend.

### Variables partagées au niveau du projet

1. Allez dans **Project Settings** → **Variables**
2. Ajoutez des variables qui seront disponibles pour tous les services
3. Utile pour : `ENCRYPTION_KEY`, `KORTIX_ADMIN_API_KEY`, etc.

### Healthchecks

Railway vérifie automatiquement la santé des services. Assurez-vous que :
- Backend expose `/api/health`
- Frontend répond sur le port configuré

---

## 📊 Monitoring et logs

### Voir les logs

1. Dans chaque service → **Logs**
2. Logs en temps réel
3. Filtrage par niveau (info, error, etc.)

### Métriques

Railway affiche automatiquement :
- CPU usage
- Memory usage
- Network traffic
- Request count

### Alertes

Configurez des alertes dans **Project Settings** → **Notifications**

---

## 🔄 Mises à jour

### Déploiement automatique

Par défaut, Railway déploie automatiquement à chaque push sur `main`.

### Déploiement manuel

1. Allez dans le service → **Deployments**
2. Cliquez sur **"Redeploy"** pour redéployer la dernière version

### Rollback

1. Allez dans **Deployments**
2. Trouvez une version précédente
3. Cliquez sur **"Redeploy"**

---

## 💰 Pricing Railway

Railway utilise un système de **credits** :

- **Hobby Plan** : $5/mois (500 heures gratuites)
- **Pro Plan** : $20/mois (plus de ressources)
- **Pay-as-you-go** : Au-delà des heures gratuites

**Estimation pour Kortix/Suna :**
- Backend : ~$10-20/mois
- Worker : ~$10-20/mois
- Frontend : ~$5-10/mois
- Redis : ~$5/mois
- **Total estimé : ~$30-55/mois**

---

## 🛠️ Dépannage

### Le service ne démarre pas

1. Vérifiez les **logs** dans Railway
2. Vérifiez que `ENV_MODE=production`
3. Vérifiez que toutes les variables d'environnement sont configurées
4. Vérifiez que le **Root Directory** est correct

### Erreur de connexion Redis

1. Vérifiez que le service Redis est créé
2. Vérifiez que les variables Redis sont partagées ou référencées
3. Vérifiez les logs du backend pour les erreurs de connexion

### Erreur de connexion entre services

1. Utilisez les **domaines Railway** générés
2. Vérifiez que `NEXT_PUBLIC_BACKEND_URL` pointe vers le bon service
3. Vérifiez que les services sont déployés et en cours d'exécution

### Le frontend ne peut pas accéder au backend

1. Vérifiez `NEXT_PUBLIC_BACKEND_URL` dans les variables frontend
2. Utilisez le domaine Railway complet : `https://suna-backend-production.up.railway.app/api`
3. Vérifiez les CORS si nécessaire (normalement géré automatiquement)

---

## 📝 Checklist de déploiement

- [ ] Compte Railway créé
- [ ] Projet Railway créé et connecté à GitHub
- [ ] Service Backend créé et configuré
- [ ] Service Worker créé et configuré
- [ ] Service Frontend créé et configuré
- [ ] Service Redis créé
- [ ] Variables d'environnement Backend configurées
- [ ] Variables d'environnement Worker configurées (ou partagées)
- [ ] Variables d'environnement Frontend configurées
- [ ] `ENV_MODE=production` dans Backend et Worker
- [ ] `NEXT_PUBLIC_ENV_MODE=PRODUCTION` dans Frontend
- [ ] Domaines configurés (ou domaines Railway utilisés)
- [ ] URLs mises à jour dans les variables d'environnement
- [ ] Services déployés et en cours d'exécution
- [ ] Backend accessible : `curl https://votre-backend.railway.app/api/health`
- [ ] Frontend accessible dans le navigateur
- [ ] Logs vérifiés (pas d'erreurs)

---

## 🎯 Avantages de Railway

✅ **Simplicité** : Déploiement en quelques clics
✅ **Auto-deploy** : Déploiement automatique depuis GitHub
✅ **HTTPS** : Certificats SSL automatiques
✅ **Monitoring** : Logs et métriques intégrés
✅ **Scaling** : Auto-scaling basique
✅ **Pricing** : Transparent, payez ce que vous utilisez

---

## 📚 Ressources

- [Documentation Railway](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Exemples Railway](https://docs.railway.app/guides/examples)

---

**C'est tout !** Votre application Kortix/Suna est maintenant déployée sur Railway. 🎉

