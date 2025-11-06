# Guide de Déploiement en Production - Kortix/Suna

Ce guide vous explique comment déployer Kortix/Suna en production.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

1. **Infrastructure Cloud** :
   - Serveur VPS/Cloud (AWS EC2, DigitalOcean, Hetzner, etc.)
   - Docker et Docker Compose installés
   - Au moins 4GB RAM, 2 vCPUs recommandés
   - 20GB+ d'espace disque

2. **Services Externes** :
   - Compte Supabase (production)
   - Clés API pour les LLMs (Anthropic, OpenAI, etc.)
   - Clés API pour les services optionnels (Tavily, Firecrawl, etc.)

3. **Domaines et SSL** :
   - Nom de domaine configuré
   - Certificat SSL (Let's Encrypt recommandé)

## 🚀 Méthode 1 : Déploiement avec Docker Compose (Recommandé)

### Étape 1 : Préparer le serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker
```

### Étape 2 : Cloner le projet

```bash
# Créer un répertoire pour l'application
mkdir -p /opt/suna
cd /opt/suna

# Cloner le dépôt
git clone https://github.com/kortix-ai/suna.git .
# OU si vous avez votre propre fork :
# git clone https://github.com/votre-username/suna.git .
```

### Étape 3 : Configurer les variables d'environnement

```bash
cd backend
cp .env.example .env  # Si un fichier .env.example existe
nano .env  # Ou utilisez votre éditeur préféré
```

**Variables d'environnement critiques pour la production :**

```bash
# ============================================
# MODE ENVIRONNEMENT
# ============================================
ENV_MODE=production  # ⚠️ IMPORTANT : Passer en production

# ============================================
# SUPABASE (Production)
# ============================================
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
SUPABASE_JWT_SECRET=votre-jwt-secret

# ============================================
# REDIS
# ============================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=votre-mot-de-passe-securise  # ⚠️ Utiliser un mot de passe fort
REDIS_SSL=false

# ============================================
# API KEYS - LLMs
# ============================================
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
# Ajoutez d'autres clés API selon vos besoins

# ============================================
# AWS BEDROCK (Optionnel)
# ============================================
AWS_BEARER_TOKEN_BEDROCK=votre-token-bedrock

# ============================================
# SERVICES OPTIONNELS
# ============================================
TAVILY_API_KEY=votre-tavily-key
FIRECRAWL_API_KEY=votre-firecrawl-key
SERPER_API_KEY=votre-serper-key
EXA_API_KEY=votre-exa-key

# ============================================
# DAYTONA (Pour les sandboxes)
# ============================================
DAYTONA_API_KEY=votre-daytona-key
DAYTONA_SERVER_URL=https://app.daytona.io/api
DAYTONA_TARGET=us

# ============================================
# SÉCURITÉ
# ============================================
ENCRYPTION_KEY=generez-une-cle-32-bytes
KORTIX_ADMIN_API_KEY=generez-une-cle-admin

# ============================================
# URLS PRODUCTION
# ============================================
NEXT_PUBLIC_URL=https://votre-domaine.com
FRONTEND_URL=https://votre-domaine.com
```

### Étape 4 : Configurer le Frontend

```bash
cd ../frontend
cp .env.local.example .env.local  # Si un fichier existe
nano .env.local
```

**Variables frontend pour la production :**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com/api
NEXT_PUBLIC_URL=https://votre-domaine.com
NEXT_PUBLIC_ENV_MODE=PRODUCTION  # ⚠️ IMPORTANT
```

### Étape 5 : Modifier docker-compose.yaml pour la production

Créez un fichier `docker-compose.prod.yaml` :

```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD} --save 60 1
    restart: always
    networks:
      - suna-network

  backend:
    image: ghcr.io/suna-ai/suna-backend:latest
    # OU construire localement :
    # build:
    #   context: ./backend
    #   dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend/.env:/app/.env:ro
    environment:
      - ENV_MODE=production  # ⚠️ Pas de override en production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_SSL=False
    depends_on:
      - redis
    restart: always
    networks:
      - suna-network

  worker:
    image: ghcr.io/suna-ai/suna-backend:latest
    # OU construire localement :
    # build:
    #   context: ./backend
    #   dockerfile: Dockerfile
    command: uv run dramatiq --skip-logging --processes 4 --threads 4 run_agent_background
    volumes:
      - ./backend/.env:/app/.env:ro
    environment:
      - ENV_MODE=production  # ⚠️ Pas de override en production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_SSL=False
    depends_on:
      - redis
    restart: always
    networks:
      - suna-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_ENV_MODE=PRODUCTION
    depends_on:
      - backend
    restart: always
    networks:
      - suna-network

volumes:
  redis_data:

networks:
  suna-network:
    driver: bridge
```

### Étape 6 : Configurer Nginx (Reverse Proxy)

Installez Nginx :

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Créez la configuration Nginx (`/etc/nginx/sites-available/suna`) :

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

# Frontend
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

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

# Backend API
server {
    listen 443 ssl http2;
    server_name api.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

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
        
        # Timeouts pour les longues requêtes
        proxy_read_timeout 1800s;
        proxy_connect_timeout 1800s;
        proxy_send_timeout 1800s;
    }
}
```

Activez la configuration :

```bash
sudo ln -s /etc/nginx/sites-available/suna /etc/nginx/sites-enabled/
sudo nginx -t  # Tester la configuration
sudo systemctl reload nginx
```

### Étape 7 : Obtenir un certificat SSL

```bash
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com
```

### Étape 8 : Construire et démarrer les services

```bash
cd /opt/suna

# Construire les images
docker compose -f docker-compose.prod.yaml build

# Démarrer les services
docker compose -f docker-compose.prod.yaml up -d

# Vérifier les logs
docker compose -f docker-compose.prod.yaml logs -f
```

## 🚀 Méthode 2 : Déploiement avec AWS ECS (Avancé)

Si vous utilisez AWS, vous pouvez déployer sur ECS comme le fait le projet officiel.

### Prérequis AWS

1. Cluster ECS créé
2. Services ECS configurés (`suna-api-svc`, `suna-worker-svc`)
3. Rôles IAM configurés
4. ECR ou GitHub Container Registry pour les images

### Workflow de déploiement

Le projet utilise GitHub Actions pour déployer automatiquement. Voir `.github/workflows/docker-build.yml`.

## 🔧 Configuration Post-Déploiement

### 1. Vérifier les services

```bash
# Vérifier que tous les conteneurs tournent
docker compose -f docker-compose.prod.yaml ps

# Vérifier les logs
docker compose -f docker-compose.prod.yaml logs backend
docker compose -f docker-compose.prod.yaml logs worker
docker compose -f docker-compose.prod.yaml logs frontend
```

### 2. Tester l'API

```bash
curl https://api.votre-domaine.com/api/health
```

### 3. Configurer les backups

**Backup Redis :**
```bash
# Créer un script de backup
cat > /opt/suna/backup-redis.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec suna-redis-1 redis-cli --rdb /data/dump-${DATE}.rdb
EOF
chmod +x /opt/suna/backup-redis.sh

# Ajouter au cron (backup quotidien à 2h du matin)
echo "0 2 * * * /opt/suna/backup-redis.sh" | crontab -
```

**Backup Supabase :** Configurez les backups automatiques dans votre dashboard Supabase.

### 4. Monitoring

Configurez un monitoring (Prometheus, Grafana, ou services cloud) pour :
- CPU, RAM, Disque
- Logs d'erreurs
- Temps de réponse API
- Utilisation des sandboxes

## 🔄 Mises à jour

### Mettre à jour l'application

```bash
cd /opt/suna

# Récupérer les dernières modifications
git pull origin main

# Reconstruire les images
docker compose -f docker-compose.prod.yaml build

# Redémarrer les services
docker compose -f docker-compose.prod.yaml up -d

# Nettoyer les anciennes images
docker image prune -f
```

## ⚠️ Checklist de Sécurité Production

- [ ] `ENV_MODE=production` dans tous les fichiers de configuration
- [ ] Mots de passe Redis forts et sécurisés
- [ ] Certificats SSL valides et auto-renouvellement configuré
- [ ] Firewall configuré (seulement ports 80, 443 ouverts)
- [ ] Clés API stockées de manière sécurisée (pas dans le code)
- [ ] Backups automatiques configurés
- [ ] Logs surveillés et alertes configurées
- [ ] Rate limiting configuré sur Nginx
- [ ] Mises à jour de sécurité automatiques
- [ ] Accès SSH sécurisé (clés, pas de mots de passe)

## 📊 Optimisations Performance

1. **Redis** : Configurez la persistance selon vos besoins
2. **Workers** : Ajustez le nombre de processus selon votre CPU
3. **Gunicorn** : Ajustez `WORKERS` dans le Dockerfile backend
4. **Nginx** : Activez le cache pour les assets statiques
5. **CDN** : Utilisez Cloudflare ou similaire pour le frontend

## 🆘 Dépannage

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker compose -f docker-compose.prod.yaml logs

# Vérifier les variables d'environnement
docker compose -f docker-compose.prod.yaml config
```

### Problèmes de connexion à Supabase

- Vérifiez que les URLs et clés sont correctes
- Vérifiez les règles RLS dans Supabase
- Vérifiez les logs backend pour les erreurs d'authentification

### Problèmes de sandbox

- Vérifiez que `DAYTONA_API_KEY` est valide
- Vérifiez les quotas Daytona
- Vérifiez les logs worker pour les erreurs de sandbox

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Docker](https://docs.docker.com/)
- [Documentation Nginx](https://nginx.org/en/docs/)
- [Documentation Let's Encrypt](https://letsencrypt.org/docs/)

---

**Note** : Ce guide est une base. Adaptez-le selon votre infrastructure et vos besoins spécifiques.

