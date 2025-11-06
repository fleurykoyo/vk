# Guide de Déploiement avec Docker Compose - Kortix/Suna

Ce guide vous explique **étape par étape** comment déployer Kortix/Suna en production avec Docker Compose.

## 📋 Vue d'ensemble du processus

Le déploiement avec Docker Compose se fait en **5 étapes principales** :

1. **Préparer le serveur** (installer Docker, Docker Compose)
2. **Cloner et configurer** le projet (variables d'environnement)
3. **Configurer le reverse proxy** (Nginx + SSL)
4. **Démarrer les services** (Docker Compose)
5. **Vérifier et maintenir** (logs, mises à jour)

---

## 🚀 Étape 1 : Préparer le serveur

### 1.1 Connexion au serveur

```bash
# Connectez-vous à votre serveur via SSH
ssh utilisateur@votre-serveur.com
```

### 1.2 Installer Docker

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Vérifier l'installation
docker --version
```

### 1.3 Installer Docker Compose

```bash
# Télécharger Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Rendre exécutable
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier l'installation
docker-compose --version
```

### 1.4 Configurer les permissions

```bash
# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Recharger les groupes (ou déconnecter/reconnecter)
newgrp docker

# Tester Docker sans sudo
docker ps
```

---

## 📦 Étape 2 : Cloner et configurer le projet

### 2.1 Cloner le dépôt

```bash
# Créer un répertoire pour l'application
sudo mkdir -p /opt/suna
sudo chown $USER:$USER /opt/suna
cd /opt/suna

# Cloner le dépôt
git clone https://github.com/kortix-ai/suna.git .

# OU si vous avez votre propre fork :
# git clone https://github.com/votre-username/suna.git .
```

### 2.2 Configurer les variables d'environnement Backend

```bash
cd backend

# Créer le fichier .env
nano .env
```

**Contenu minimal du fichier `backend/.env` :**

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
# REDIS - ⚠️ Utiliser un mot de passe fort
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=generez-un-mot-de-passe-fort-et-securise
REDIS_SSL=false

# ============================================
# API KEYS - LLMs (au moins une requise)
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...
# OU
OPENAI_API_KEY=sk-proj-...

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
# URLS PRODUCTION
# ============================================
NEXT_PUBLIC_URL=https://votre-domaine.com
FRONTEND_URL=https://votre-domaine.com

# ============================================
# SERVICES OPTIONNELS (selon vos besoins)
# ============================================
TAVILY_API_KEY=...
FIRECRAWL_API_KEY=...
SERPER_API_KEY=...
EXA_API_KEY=...
AWS_BEARER_TOKEN_BEDROCK=...
```

**Générer les clés de sécurité :**

```bash
# Générer ENCRYPTION_KEY (32 bytes en base64)
python3 -c "import base64, secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())"

# Générer KORTIX_ADMIN_API_KEY (32 bytes en hex)
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2.3 Configurer les variables d'environnement Frontend

```bash
cd ../frontend

# Créer le fichier .env.local
nano .env.local
```

**Contenu du fichier `frontend/.env.local` :**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com/api
NEXT_PUBLIC_URL=https://votre-domaine.com
NEXT_PUBLIC_ENV_MODE=PRODUCTION
```

### 2.4 Vérifier le fichier docker-compose.prod.yaml

```bash
cd /opt/suna

# Vérifier que le fichier existe
ls -la docker-compose.prod.yaml

# Si nécessaire, créer le fichier (voir le guide complet)
```

---

## 🌐 Étape 3 : Configurer Nginx (Reverse Proxy + SSL)

### 3.1 Installer Nginx et Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 3.2 Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/suna
```

**Contenu de la configuration :**

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name votre-domaine.com api.votre-domaine.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# Frontend (votre-domaine.com)
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API (api.votre-domaine.com)
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts pour les longues requêtes (agents)
        proxy_read_timeout 1800s;
        proxy_connect_timeout 1800s;
        proxy_send_timeout 1800s;
    }
}
```

**⚠️ Remplacez `votre-domaine.com` par votre vrai domaine !**

### 3.3 Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/suna /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Si OK, recharger Nginx
sudo systemctl reload nginx
```

### 3.4 Obtenir le certificat SSL

```bash
# Obtenir le certificat Let's Encrypt
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com

# Suivre les instructions :
# - Entrer votre email
# - Accepter les conditions
# - Le certificat sera installé automatiquement
```

**Renouvellement automatique :**

```bash
# Tester le renouvellement automatique
sudo certbot renew --dry-run

# Le renouvellement est automatique via cron (installé par certbot)
```

---

## 🐳 Étape 4 : Démarrer les services avec Docker Compose

### 4.1 Construire les images

```bash
cd /opt/suna

# Construire les images Docker
docker compose -f docker-compose.prod.yaml build

# Cela peut prendre 5-10 minutes la première fois
```

### 4.2 Démarrer les services

```bash
# Démarrer tous les services en arrière-plan
docker compose -f docker-compose.prod.yaml up -d

# Vérifier que tous les conteneurs sont démarrés
docker compose -f docker-compose.prod.yaml ps
```

**Vous devriez voir :**
```
NAME                STATUS          PORTS
suna-backend-1      Up (healthy)    0.0.0.0:8000->8000/tcp
suna-frontend-1     Up (healthy)    0.0.0.0:3000->3000/tcp
suna-redis-1        Up (healthy)    6379/tcp
suna-worker-1       Up              6379/tcp
```

### 4.3 Vérifier les logs

```bash
# Voir tous les logs
docker compose -f docker-compose.prod.yaml logs -f

# Voir les logs d'un service spécifique
docker compose -f docker-compose.prod.yaml logs -f backend
docker compose -f docker-compose.prod.yaml logs -f worker
docker compose -f docker-compose.prod.yaml logs -f frontend
```

---

## ✅ Étape 5 : Vérifier et tester

### 5.1 Tester l'API Backend

```bash
# Depuis votre machine locale ou le serveur
curl https://api.votre-domaine.com/api/health

# Devrait retourner quelque chose comme :
# {"status":"ok"}
```

### 5.2 Tester le Frontend

```bash
# Ouvrir dans un navigateur
https://votre-domaine.com

# Vous devriez voir l'interface Kortix/Suna
```

### 5.3 Vérifier les services

```bash
# Vérifier l'état des conteneurs
docker compose -f docker-compose.prod.yaml ps

# Vérifier l'utilisation des ressources
docker stats

# Vérifier les volumes
docker volume ls
```

---

## 🔄 Gestion quotidienne

### Arrêter les services

```bash
cd /opt/suna
docker compose -f docker-compose.prod.yaml down
```

### Redémarrer les services

```bash
docker compose -f docker-compose.prod.yaml restart

# OU redémarrer un service spécifique
docker compose -f docker-compose.prod.yaml restart backend
```

### Mettre à jour l'application

```bash
cd /opt/suna

# 1. Récupérer les dernières modifications
git pull origin main

# 2. Reconstruire les images
docker compose -f docker-compose.prod.yaml build

# 3. Redémarrer les services
docker compose -f docker-compose.prod.yaml up -d

# 4. Nettoyer les anciennes images
docker image prune -f
```

### Voir les logs en temps réel

```bash
# Tous les services
docker compose -f docker-compose.prod.yaml logs -f

# Un service spécifique
docker compose -f docker-compose.prod.yaml logs -f backend
```

### Accéder à un conteneur

```bash
# Accéder au shell du backend
docker compose -f docker-compose.prod.yaml exec backend sh

# Accéder au shell du worker
docker compose -f docker-compose.prod.yaml exec worker sh
```

---

## 🛠️ Dépannage

### Les services ne démarrent pas

```bash
# 1. Vérifier les logs d'erreur
docker compose -f docker-compose.prod.yaml logs

# 2. Vérifier la configuration
docker compose -f docker-compose.prod.yaml config

# 3. Vérifier les variables d'environnement
cat backend/.env | grep ENV_MODE
# Devrait afficher : ENV_MODE=production
```

### Erreur de connexion Redis

```bash
# Vérifier que Redis est démarré
docker compose -f docker-compose.prod.yaml ps redis

# Vérifier les logs Redis
docker compose -f docker-compose.prod.yaml logs redis

# Tester la connexion Redis
docker compose -f docker-compose.prod.yaml exec redis redis-cli -a $REDIS_PASSWORD ping
```

### Erreur de connexion Supabase

```bash
# Vérifier les variables Supabase
cat backend/.env | grep SUPABASE

# Tester la connexion depuis le conteneur
docker compose -f docker-compose.prod.yaml exec backend curl -I $SUPABASE_URL
```

### Problèmes de SSL

```bash
# Vérifier le certificat
sudo certbot certificates

# Renouveler le certificat manuellement
sudo certbot renew

# Vérifier la configuration Nginx
sudo nginx -t
```

---

## 📊 Monitoring et maintenance

### Script de backup Redis

Créez `/opt/suna/backup-redis.sh` :

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/suna/backups"
mkdir -p $BACKUP_DIR

docker compose -f docker-compose.prod.yaml exec -T redis redis-cli --no-auth-warning -a ${REDIS_PASSWORD} --rdb /data/dump-${DATE}.rdb
docker compose -f docker-compose.prod.yaml cp redis:/data/dump-${DATE}.rdb $BACKUP_DIR/

# Garder seulement les 7 derniers backups
ls -t $BACKUP_DIR/dump-*.rdb | tail -n +8 | xargs rm -f

echo "Backup créé : $BACKUP_DIR/dump-${DATE}.rdb"
```

Rendre exécutable et ajouter au cron :

```bash
chmod +x /opt/suna/backup-redis.sh

# Backup quotidien à 2h du matin
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/suna/backup-redis.sh") | crontab -
```

### Vérifier l'utilisation des ressources

```bash
# Utilisation CPU/RAM en temps réel
docker stats

# Espace disque
df -h

# Espace Docker
docker system df
```

---

## ⚠️ Checklist de sécurité

Avant de mettre en production, vérifiez :

- [ ] `ENV_MODE=production` dans `backend/.env`
- [ ] `NEXT_PUBLIC_ENV_MODE=PRODUCTION` dans `frontend/.env.local`
- [ ] Mot de passe Redis fort configuré
- [ ] Certificat SSL valide et auto-renouvellement configuré
- [ ] Firewall configuré (seulement ports 80, 443 ouverts)
- [ ] Clés API stockées de manière sécurisée
- [ ] Backups automatiques configurés
- [ ] Accès SSH sécurisé (clés, pas de mots de passe)
- [ ] Mises à jour de sécurité automatiques

---

## 📚 Commandes utiles - Référence rapide

```bash
# Démarrer
docker compose -f docker-compose.prod.yaml up -d

# Arrêter
docker compose -f docker-compose.prod.yaml down

# Redémarrer
docker compose -f docker-compose.prod.yaml restart

# Logs
docker compose -f docker-compose.prod.yaml logs -f

# Reconstruire
docker compose -f docker-compose.prod.yaml build

# Mettre à jour
git pull && docker compose -f docker-compose.prod.yaml build && docker compose -f docker-compose.prod.yaml up -d

# Nettoyer
docker system prune -a
```

---

**C'est tout !** Votre application Kortix/Suna est maintenant déployée en production. 🎉

