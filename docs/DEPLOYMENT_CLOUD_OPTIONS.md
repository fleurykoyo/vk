# Options de Déploiement Cloud pour Kortix/Suna

Docker Cloud a été arrêté en 2018. Voici les **alternatives modernes** pour déployer Kortix/Suna dans le cloud.

## 🌐 Options Cloud Disponibles

### 1. **AWS (Amazon Web Services)**

#### AWS ECS (Elastic Container Service)
**Ce que c'est :** Service de gestion de conteneurs Docker sur AWS

**Avantages :**
- ✅ Intégration native avec Docker
- ✅ Auto-scaling automatique
- ✅ Load balancing intégré
- ✅ Gestion des secrets via AWS Secrets Manager
- ✅ Monitoring avec CloudWatch
- ✅ Utilisé par le projet officiel (voir `.github/workflows/docker-build.yml`)

**Comment ça marche :**
```bash
# 1. Push des images vers ECR (Elastic Container Registry)
docker tag suna-backend:latest 123456789.dkr.ecr.us-west-2.amazonaws.com/suna-backend:latest
docker push 123456789.dkr.ecr.us-west-2.amazonaws.com/suna-backend:latest

# 2. Créer un cluster ECS
aws ecs create-cluster --cluster-name suna-cluster

# 3. Créer des services ECS qui déploient automatiquement
aws ecs create-service --cluster suna-cluster --service-name suna-api
```

**Coût :** Payez seulement pour les ressources utilisées (EC2, Fargate)

#### AWS App Runner
**Ce que c'est :** Service simplifié pour déployer des conteneurs sans gérer l'infrastructure

**Avantages :**
- ✅ Très simple à utiliser
- ✅ Auto-scaling automatique
- ✅ HTTPS inclus
- ✅ Pas besoin de gérer les serveurs

**Idéal pour :** Déploiements simples, prototypes

---

### 2. **Google Cloud Platform (GCP)**

#### Google Cloud Run
**Ce que c'est :** Service serverless pour conteneurs Docker

**Avantages :**
- ✅ Payez seulement quand les conteneurs tournent
- ✅ Auto-scaling de 0 à N instances
- ✅ HTTPS inclus
- ✅ Intégration avec Cloud SQL, Cloud Storage

**Comment déployer :**
```bash
# Build et push vers Google Container Registry
gcloud builds submit --tag gcr.io/votre-projet/suna-backend

# Déployer sur Cloud Run
gcloud run deploy suna-backend \
  --image gcr.io/votre-projet/suna-backend \
  --platform managed \
  --region us-central1
```

**Coût :** Payez par requête + temps d'exécution

#### Google Kubernetes Engine (GKE)
**Ce que c'est :** Kubernetes managé par Google

**Avantages :**
- ✅ Kubernetes complet
- ✅ Auto-scaling avancé
- ✅ Multi-région
- ✅ Intégration avec les services GCP

**Idéal pour :** Applications complexes nécessitant Kubernetes

---

### 3. **Microsoft Azure**

#### Azure Container Instances (ACI)
**Ce que c'est :** Déploiement de conteneurs sans orchestrateur

**Avantages :**
- ✅ Simple et rapide
- ✅ Pas de gestion de serveurs
- ✅ Intégration avec Azure services

#### Azure Container Apps
**Ce que c'est :** Service serverless pour conteneurs (similaire à Cloud Run)

**Avantages :**
- ✅ Auto-scaling
- ✅ HTTPS inclus
- ✅ Intégration avec Azure services

#### Azure Kubernetes Service (AKS)
**Ce que c'est :** Kubernetes managé par Azure

---

### 4. **DigitalOcean**

#### DigitalOcean App Platform
**Ce que c'est :** Platform-as-a-Service (PaaS) pour conteneurs

**Avantages :**
- ✅ Très simple à utiliser
- ✅ Prix prévisibles
- ✅ Auto-scaling
- ✅ HTTPS inclus
- ✅ Intégration avec Managed Databases

**Comment déployer :**
```bash
# Via l'interface web ou doctl CLI
doctl apps create --spec app.yaml
```

**Coût :** À partir de $5/mois par service

#### DigitalOcean Droplets + Docker Compose
**Ce que c'est :** VPS avec Docker Compose (comme déploiement manuel)

**Avantages :**
- ✅ Contrôle total
- ✅ Prix bas ($6-12/mois)
- ✅ Facile à configurer

---

### 5. **Hetzner Cloud**

#### Hetzner Cloud + Docker Compose
**Ce que c'est :** VPS européen avec Docker Compose

**Avantages :**
- ✅ Prix très compétitifs (€4-8/mois)
- ✅ Performances excellentes
- ✅ Localisation en Europe
- ✅ Contrôle total

**Idéal pour :** Déploiements européens, budget serré

---

### 6. **Fly.io**

#### Fly.io Platform
**Ce que c'est :** Platform pour déployer des apps globalement

**Avantages :**
- ✅ Déploiement global (edge computing)
- ✅ Auto-scaling
- ✅ HTTPS inclus
- ✅ Pricing simple

**Comment déployer :**
```bash
# Installer flyctl
curl -L https://fly.io/install.sh | sh

# Déployer
fly launch
fly deploy
```

---

### 7. **Railway**

#### Railway Platform
**Ce que c'est :** Platform simple pour déployer des apps

**Avantages :**
- ✅ Très simple (connectez votre repo GitHub)
- ✅ Auto-deploy depuis Git
- ✅ HTTPS inclus
- ✅ Pricing basé sur l'utilisation

**Idéal pour :** Prototypes, petites applications

---

## 📊 Comparaison des Options

| Service | Complexité | Coût | Auto-scaling | Idéal pour |
|---------|-----------|------|--------------|------------|
| **AWS ECS** | Moyenne | Variable | ✅ | Production, échelle |
| **AWS App Runner** | Simple | Variable | ✅ | Prototypes, petites apps |
| **Google Cloud Run** | Simple | Pay-per-use | ✅ | Serverless, variable traffic |
| **GKE** | Complexe | Variable | ✅ | Applications complexes |
| **Azure Container Apps** | Simple | Variable | ✅ | Écosystème Azure |
| **DigitalOcean App Platform** | Simple | $5+/mois | ✅ | Simplicité, prix fixe |
| **DigitalOcean Droplets** | Moyenne | $6-12/mois | ❌ | Contrôle total, budget |
| **Hetzner Cloud** | Moyenne | €4-8/mois | ❌ | Europe, budget serré |
| **Fly.io** | Simple | Variable | ✅ | Global, edge computing |
| **Railway** | Très simple | Pay-per-use | ✅ | Prototypes, rapidité |

---

## 🎯 Recommandations par Cas d'Usage

### Pour débuter rapidement
1. **Railway** ou **Fly.io** - Déploiement en quelques minutes
2. **DigitalOcean App Platform** - Simple et prévisible

### Pour la production (petite/moyenne échelle)
1. **DigitalOcean Droplets + Docker Compose** - Contrôle total, prix fixe
2. **AWS ECS** - Si vous êtes déjà sur AWS
3. **Google Cloud Run** - Si vous voulez du serverless

### Pour la production (grande échelle)
1. **AWS ECS** - Utilisé par le projet officiel
2. **GKE** ou **AKS** - Si vous avez besoin de Kubernetes

### Pour le budget serré
1. **Hetzner Cloud** - Meilleur rapport qualité/prix
2. **DigitalOcean Droplets** - Bon compromis

---

## 🚀 Exemple : Déploiement sur DigitalOcean App Platform

### Étape 1 : Créer app.yaml

```yaml
name: suna-production
services:
  - name: backend
    source_dir: /backend
    github:
      repo: kortix-ai/suna
      branch: main
    dockerfile_path: /backend/Dockerfile
    envs:
      - key: ENV_MODE
        value: production
      - key: SUPABASE_URL
        value: ${SUPABASE_URL}
        scope: RUN_TIME
        type: SECRET
    http_port: 8000
    instance_count: 1
    instance_size_slug: basic-xxs

  - name: worker
    source_dir: /backend
    github:
      repo: kortix-ai/suna
      branch: main
    dockerfile_path: /backend/Dockerfile
    run_command: uv run dramatiq --skip-logging --processes 4 --threads 4 run_agent_background
    envs:
      - key: ENV_MODE
        value: production
    instance_count: 1
    instance_size_slug: basic-xxs

  - name: frontend
    source_dir: /frontend
    github:
      repo: kortix-ai/suna
      branch: main
    dockerfile_path: /frontend/Dockerfile
    envs:
      - key: NEXT_PUBLIC_ENV_MODE
        value: PRODUCTION
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xxs

databases:
  - name: redis
    engine: REDIS
    version: "7"
    production: true
```

### Étape 2 : Déployer

```bash
# Via l'interface web DigitalOcean
# OU via doctl CLI
doctl apps create --spec app.yaml
```

---

## 🚀 Exemple : Déploiement sur AWS ECS

### Étape 1 : Créer le cluster

```bash
aws ecs create-cluster --cluster-name suna-cluster
```

### Étape 2 : Créer les task definitions

```json
{
  "family": "suna-backend",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789.dkr.ecr.us-west-2.amazonaws.com/suna-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENV_MODE",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-west-2:123456789:secret:suna/supabase-url"
        }
      ]
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024"
}
```

### Étape 3 : Créer les services

```bash
aws ecs create-service \
  --cluster suna-cluster \
  --service-name suna-api \
  --task-definition suna-backend \
  --desired-count 2 \
  --launch-type FARGATE
```

---

## 🚀 Exemple : Déploiement sur Google Cloud Run

### Étape 1 : Build et push

```bash
# Configurer gcloud
gcloud auth login
gcloud config set project votre-projet-id

# Build et push
gcloud builds submit --tag gcr.io/votre-projet-id/suna-backend ./backend
```

### Étape 2 : Déployer

```bash
gcloud run deploy suna-backend \
  --image gcr.io/votre-projet-id/suna-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENV_MODE=production \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

---

## 🔄 CI/CD avec GitHub Actions

Le projet utilise déjà GitHub Actions pour déployer automatiquement. Voir `.github/workflows/docker-build.yml`.

**Workflow actuel :**
- Push sur `main` → Déploie en staging
- Push sur `PRODUCTION` → Déploie en production (AWS ECS)

**Vous pouvez adapter pour :**
- DigitalOcean App Platform
- Google Cloud Run
- Azure Container Apps
- etc.

---

## 💡 Recommandation pour Kortix/Suna

### Option 1 : Simple et rapide (Recommandé pour débuter)
**DigitalOcean App Platform** ou **Railway**
- Déploiement en quelques clics
- Auto-scaling
- HTTPS inclus
- Pricing prévisible

### Option 2 : Contrôle total
**DigitalOcean/Hetzner Droplet + Docker Compose**
- Contrôle complet
- Prix fixe et bas
- Utilise le guide `DEPLOYMENT_DOCKER_COMPOSE.md`

### Option 3 : Production à grande échelle
**AWS ECS** (comme le projet officiel)
- Auto-scaling avancé
- Intégration avec AWS services
- Monitoring CloudWatch

---

## 📚 Ressources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
- [Fly.io Documentation](https://fly.io/docs/)
- [Railway Documentation](https://docs.railway.app/)

---

**Note :** Docker Cloud n'existe plus depuis 2018. Utilisez une des options ci-dessus selon vos besoins !

