# 🚂 Déploiement Railway - Guide Rapide

Guide étape par étape pour déployer Kortix/Suna sur Railway en **15 minutes**.

## 📋 Checklist avant de commencer

- [ ] Compte Railway créé ([railway.app](https://railway.app))
- [ ] Code sur GitHub
- [ ] Supabase configuré (production)
- [ ] Clés API LLMs prêtes

---

## 🚀 Déploiement en 7 étapes

### Étape 1 : Créer le projet Railway

1. Allez sur [railway.app](https://railway.app) et connectez-vous
2. Cliquez sur **"New Project"**
3. Sélectionnez **"Deploy from GitHub repo"**
4. Autorisez Railway à accéder à GitHub
5. Choisissez votre dépôt `suna`
6. Cliquez sur **"Deploy Now"**

Railway va créer un premier service automatiquement. **Nous allons le supprimer et créer les bons services.**

---

### Étape 2 : Créer le service Redis

1. Dans votre projet Railway, cliquez sur **"+ New"**
2. Sélectionnez **"Database"** → **"Add Redis"**
3. Railway créera automatiquement un service Redis
4. **Notez les variables d'environnement** (elles seront partagées automatiquement)

**Variables générées automatiquement :**
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_URL`

---

### Étape 3 : Créer le service Backend

1. Cliquez sur **"+ New"** → **"GitHub Repo"**
2. Sélectionnez votre repo `suna`
3. Railway va créer un service. **Configurez-le :**

   **Settings → General :**
   ```
   Name: suna-backend
   Root Directory: backend
   Dockerfile Path: Dockerfile
   ```

   **Settings → Deploy :**
   ```
   Start Command: (laissez vide - le Dockerfile gère déjà $PORT)
   ```

4. **Variables d'environnement** → Cliquez sur **"New Variable"** et ajoutez :

   ```bash
   ENV_MODE=production
   ```

   Puis ajoutez toutes vos autres variables (voir section Variables ci-dessous).

---

### Étape 4 : Créer le service Worker

1. Cliquez sur **"+ New"** → **"GitHub Repo"** (même repo)
2. **Configurez le service :**

   **Settings → General :**
   ```
   Name: suna-worker
   Root Directory: backend
   Dockerfile Path: Dockerfile
   ```

   **Settings → Deploy :**
   ```
   Start Command: uv run dramatiq --skip-logging --processes 4 --threads 4 run_agent_background
   ```

3. **Variables d'environnement** → **"Add Variable"** → **"Reference Variable"**
   - Sélectionnez toutes les variables du service `suna-backend`
   - OU copiez les mêmes variables manuellement

---

### Étape 5 : Créer le service Frontend

1. Cliquez sur **"+ New"** → **"GitHub Repo"** (même repo)
2. **Configurez le service :**

   **Settings → General :**
   ```
   Name: suna-frontend
   Root Directory: frontend
   Dockerfile Path: Dockerfile
   ```

   **Settings → Deploy :**
   ```
   Start Command: (laissez vide - le Dockerfile gère déjà)
   ```

3. **Variables d'environnement** → Ajoutez les variables frontend (voir ci-dessous)

---

### Étape 6 : Configurer les variables d'environnement

#### Variables Backend (Service `suna-backend`)

Allez dans **suna-backend** → **Variables** et ajoutez :

```bash
# Mode production
ENV_MODE=production

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=votre-jwt-secret

# Redis (Railway génère automatiquement - partagé depuis le service Redis)
# REDIS_HOST, REDIS_PORT, REDIS_PASSWORD sont automatiques

# LLMs
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# Daytona
DAYTONA_API_KEY=dtn_...
DAYTONA_SERVER_URL=https://app.daytona.io/api
DAYTONA_TARGET=us

# Sécurité
ENCRYPTION_KEY=generez-une-cle-32-bytes-base64
KORTIX_ADMIN_API_KEY=generez-une-cle-admin-hex

# Services optionnels
TAVILY_API_KEY=...
FIRECRAWL_API_KEY=...
SERPER_API_KEY=...
EXA_API_KEY=...
AWS_BEARER_TOKEN_BEDROCK=...

# URLs (sera mis à jour après avoir les domaines Railway)
FRONTEND_URL=https://suna-frontend-production.up.railway.app
```

#### Variables Worker (Service `suna-worker`)

**Option 1 : Référencer les variables du backend (recommandé)**
1. Cliquez sur **"Add Variable"** → **"Reference Variable"**
2. Sélectionnez le service `suna-backend`
3. Sélectionnez toutes les variables à partager

**Option 2 : Copier manuellement**
- Copiez les mêmes variables que le backend

#### Variables Frontend (Service `suna-frontend`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BACKEND_URL=https://suna-backend-production.up.railway.app/api
NEXT_PUBLIC_URL=https://suna-frontend-production.up.railway.app
NEXT_PUBLIC_ENV_MODE=PRODUCTION
```

**⚠️ IMPORTANT :** Remplacez les URLs par les vrais domaines Railway après le déploiement.

---

### Étape 7 : Obtenir les domaines et finaliser

1. **Attendez que tous les services soient déployés** (vérifiez dans l'onglet "Deployments")

2. **Pour chaque service, allez dans Settings → Networking :**
   - Railway génère automatiquement un domaine : `suna-backend-production.up.railway.app`
   - Notez ces domaines

3. **Mettez à jour les variables d'environnement :**

   **Backend :**
   ```bash
   FRONTEND_URL=https://suna-frontend-production.up.railway.app
   ```

   **Frontend :**
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://suna-backend-production.up.railway.app/api
   NEXT_PUBLIC_URL=https://suna-frontend-production.up.railway.app
   ```

4. **Redéployez les services** (Railway le fera automatiquement si vous avez activé auto-deploy)

---

## ✅ Vérification

### Tester le Backend

```bash
curl https://suna-backend-production.up.railway.app/api/health
```

Devrait retourner : `{"status":"ok"}`

### Tester le Frontend

Ouvrez dans votre navigateur :
```
https://suna-frontend-production.up.railway.app
```

---

## 🔧 Configuration avancée

### Domaines personnalisés

1. Dans **Settings → Networking** → **Custom Domain**
2. Ajoutez votre domaine : `api.votre-domaine.com`
3. Railway vous donnera un enregistrement DNS
4. Ajoutez-le dans votre registrar DNS
5. Mettez à jour les variables d'environnement avec votre domaine

### Partager des variables

Railway permet de **partager des variables** entre services :

1. Dans un service, créez une variable
2. Dans un autre service, **"Add Variable"** → **"Reference Variable"**
3. Sélectionnez la variable du premier service

**Exemple :** Partagez `SUPABASE_URL` entre backend et frontend.

### Variables au niveau du projet

1. Allez dans **Project Settings** → **Variables**
2. Ajoutez des variables disponibles pour tous les services
3. Utile pour : `ENCRYPTION_KEY`, `KORTIX_ADMIN_API_KEY`

---

## 🔄 Mises à jour

### Déploiement automatique

Par défaut, Railway déploie automatiquement à chaque push sur `main`.

### Déploiement manuel

1. Allez dans le service → **Deployments**
2. Cliquez sur **"Redeploy"**

### Rollback

1. Allez dans **Deployments**
2. Trouvez une version précédente
3. Cliquez sur **"Redeploy"**

---

## 🛠️ Dépannage

### Le service ne démarre pas

1. Vérifiez les **logs** dans Railway
2. Vérifiez que `ENV_MODE=production`
3. Vérifiez que toutes les variables sont configurées
4. Vérifiez que le **Root Directory** est correct (`backend` ou `frontend`)

### Erreur de connexion Redis

1. Vérifiez que le service Redis est créé
2. Vérifiez que les variables Redis sont partagées
3. Vérifiez les logs du backend

### Le frontend ne peut pas accéder au backend

1. Vérifiez `NEXT_PUBLIC_BACKEND_URL` dans les variables frontend
2. Utilisez le domaine Railway complet
3. Vérifiez que les deux services sont déployés

---

## 💰 Pricing

Railway utilise un système de **credits** :

- **Hobby Plan** : $5/mois (500 heures gratuites)
- **Pro Plan** : $20/mois (plus de ressources)

**Estimation pour Kortix/Suna :**
- Backend : ~$10-20/mois
- Worker : ~$10-20/mois  
- Frontend : ~$5-10/mois
- Redis : ~$5/mois
- **Total : ~$30-55/mois**

---

## 📚 Ressources

- [Documentation Railway](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)

---

**C'est tout ! Votre application est maintenant déployée sur Railway.** 🎉

