# Configuration Réseau Daytona pour l'Accès Internet

## Problème Identifié

Les sandbox créés via Daytona ne peuvent pas accéder à Internet à cause d'un proxy **Envoy** (probablement Istio) qui bloque les connexions sortantes. 

### Symptômes
- ✅ **Ping fonctionne** : La connectivité réseau de base est opérationnelle
- ❌ **HTTP retourne 403 Forbidden** : Le proxy envoy bloque les requêtes HTTP
- ❌ **HTTPS est bloqué** : Connection reset par le proxy
- ❌ **Navigateur ne peut pas accéder aux sites web**

### Diagnostic
```bash
# Dans le sandbox, testez :
curl -I http://www.google.com
# Résultat: HTTP/1.1 403 Forbidden (server: envoy)

curl -I https://www.google.com
# Résultat: Connection reset by peer

ping -c 3 8.8.8.8
# Résultat: ✅ Fonctionne (connectivité réseau OK)
```

### Diagnostic Rapide - Identifier la Règle qui Bloque

⚠️ **Important** : Ces commandes doivent être exécutées depuis une machine avec accès à `kubectl`, **PAS depuis le sandbox**. Le sandbox est un conteneur isolé et n'a pas accès à kubectl.

Pour identifier rapidement quelle règle bloque, exécutez ces commandes depuis votre machine locale ou une machine d'administration (avec accès kubectl) :

```bash
# 1. Identifier le namespace et les pods sandbox
kubectl get pods -A | grep -i sandbox
kubectl get pods -A | grep -i daytona

# 2. Vérifier s'il y a des AuthorizationPolicy qui bloquent
kubectl get authorizationpolicy -A
kubectl get authorizationpolicy -A -o yaml | grep -i "deny\|block\|403"

# 3. Vérifier les NetworkPolicies
kubectl get networkpolicies -A
kubectl describe networkpolicies -A | grep -i "deny\|block"

# 4. Vérifier les logs envoy pour voir exactement ce qui bloque
kubectl logs -n istio-system -l app=istio-proxy --tail=200 | grep -i "403\|forbidden\|denied\|reset" | tail -20

# 5. Vérifier la configuration envoy d'un pod sandbox spécifique
SANDBOX_POD=$(kubectl get pods -A | grep sandbox | head -1 | awk '{print $2}')
SANDBOX_NS=$(kubectl get pods -A | grep sandbox | head -1 | awk '{print $1}')
kubectl exec -n $SANDBOX_NS $SANDBOX_POD -c istio-proxy -- curl localhost:15000/config_dump | grep -i "authorization\|deny\|403"
```

## Solutions

### Solution 1 : Autoriser l'Accès Internet Complet (Recommandé)

Cette solution permet à tous les sandbox d'accéder à Internet sans restriction.

#### Configuration Istio/Envoy

Si votre infrastructure Daytona utilise Istio, vous devez créer une **VirtualService** ou modifier la **AuthorizationPolicy** pour autoriser le trafic sortant.

**AuthorizationPolicy pour autoriser le trafic sortant :**

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-internet-access
  namespace: daytona  # ou votre namespace
spec:
  selector:
    matchLabels:
      app: daytona-sandbox  # ou le label de vos sandbox
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts: ["*"]  # Autoriser tous les hosts externes
```

**Alternative : ServiceEntry pour définir les services externes :**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-http
  namespace: daytona
spec:
  hosts:
  - "*.google.com"
  - "*.github.com"
  - "*"  # Pour autoriser tous les domaines
  ports:
  - number: 80
    name: http
    protocol: HTTP
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

#### Configuration NetworkPolicy (Kubernetes)

Si vous utilisez Kubernetes avec NetworkPolicy :

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-internet
  namespace: daytona
spec:
  podSelector:
    matchLabels:
      app: daytona-sandbox
  policyTypes:
  - Egress
  egress:
  # Autoriser le trafic DNS
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: UDP
      port: 53
  # Autoriser le trafic HTTP/HTTPS sortant
  - to: []
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
```

### Solution 2 : Whitelist de Domaines Spécifiques

Si vous voulez limiter l'accès à certains domaines uniquement :

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-domains
  namespace: daytona
spec:
  selector:
    matchLabels:
      app: daytona-sandbox
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts:
        - "*.google.com"
        - "*.github.com"
        - "*.stackoverflow.com"
        - "*.wikipedia.org"
        # Ajoutez d'autres domaines autorisés
```

### Solution 3 : Configuration via Variables d'Environnement

Si Daytona supporte la configuration de proxy via variables d'environnement, vous pouvez configurer :

```python
# Dans backend/core/sandbox/sandbox.py
env_vars={
    "CHROME_PERSISTENT_SESSION": "true",
    "RESOLUTION": "1048x768x24",
    "RESOLUTION_WIDTH": "1048",
    "RESOLUTION_HEIGHT": "768",
    "VNC_PASSWORD": password,
    "ANONYMIZED_TELEMETRY": "false",
    # Ajoutez ces variables si un proxy externe est disponible
    # "HTTP_PROXY": "http://proxy.example.com:8080",
    # "HTTPS_PROXY": "http://proxy.example.com:8080",
    # "NO_PROXY": "localhost,127.0.0.1",
    "CHROME_PATH": "",
    "CHROME_USER_DATA": "",
    "CHROME_DEBUGGING_PORT": "9222",
    "CHROME_DEBUGGING_HOST": "localhost",
    "CHROME_CDP": ""
}
```

## Étapes de Configuration

⚠️ **Prérequis** : Vous devez avoir accès à `kubectl` configuré pour votre cluster Daytona depuis votre machine locale ou une machine d'administration. Ces commandes ne peuvent PAS être exécutées depuis le sandbox.

### ⚠️ Si Vous N'Avez Pas Accès à kubectl

Si vous n'avez pas accès à `kubectl` ou à la configuration Kubernetes :

1. **Contactez l'administrateur Daytona** :
   - Partagez ce document avec l'administrateur
   - Demandez-lui d'appliquer les configurations réseau appropriées
   - Fournissez les fichiers YAML dans `docs/` pour référence

2. **Utilisez l'Interface Web Daytona** (si disponible) :
   - Vérifiez s'il existe une interface pour configurer les règles réseau
   - Cherchez les paramètres de sécurité réseau ou firewall
   - Configurez les règles pour autoriser l'accès Internet

3. **Contactez le Support Daytona** :
   - Expliquez que les sandbox ne peuvent pas accéder à Internet
   - Mentionnez que le proxy envoy bloque les connexions (403 Forbidden, Connection reset)
   - Demandez comment configurer les règles réseau pour autoriser l'accès Internet

4. **Vérifiez la Documentation Daytona** :
   - Consultez la documentation sur la configuration réseau
   - Cherchez des paramètres de sécurité réseau ou firewall
   - Vérifiez s'il existe des variables d'environnement pour configurer le réseau

### 🚀 Démarrage Rapide avec Script de Diagnostic

Un script de diagnostic automatisé est disponible pour identifier rapidement votre configuration :

```bash
# Depuis votre machine locale (avec kubectl configuré)
cd /Users/fleurykoyo/Documents/LoftAI/Vicia/suna
./docs/DIAGNOSTIC_SCRIPT.sh
```

Ce script va :
- ✅ Identifier automatiquement votre namespace et labels
- ✅ Détecter si Istio est installé
- ✅ Lister les NetworkPolicies et AuthorizationPolicies existantes
- ✅ Fournir les commandes exactes à exécuter pour votre configuration

### 1. Configurer l'Accès kubectl

Si vous n'avez pas encore `kubectl` configuré :

```bash
# Installer kubectl (macOS)
brew install kubectl

# Ou télécharger depuis https://kubernetes.io/docs/tasks/tools/

# Vérifier l'installation
kubectl version --client
```

#### Obtenir l'Accès au Cluster Daytona

Pour obtenir l'accès au cluster Kubernetes de Daytona :

**Option 1 : Via l'Interface Web Daytona**
1. Connectez-vous à votre instance Daytona (https://app.daytona.io ou votre instance)
2. Allez dans les paramètres ou la section "Kubernetes"
3. Téléchargez le fichier `kubeconfig`
4. Configurez-le :
   ```bash
   export KUBECONFIG=/path/to/daytona-kubeconfig.yaml
   # Ou ajoutez-le à votre ~/.kube/config
   ```

**Option 2 : Via Daytona CLI**
```bash
# Si vous avez Daytona CLI installé
daytona kubeconfig > ~/.kube/daytona-config
export KUBECONFIG=~/.kube/daytona-config
```

**Option 3 : Via l'API Daytona**
```bash
# Récupérer le kubeconfig via l'API Daytona
curl -H "Authorization: Bearer $DAYTONA_API_KEY" \
     $DAYTONA_SERVER_URL/api/kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml
```

**Vérifier l'accès :**
```bash
# Tester la connexion
kubectl cluster-info
kubectl get nodes
kubectl get pods -A
```

### 2. Identifier votre Infrastructure

Vérifiez si vous utilisez :
- **Istio** : Vérifiez avec `kubectl get pods -n istio-system`
- **Kubernetes NetworkPolicy** : Vérifiez avec `kubectl get networkpolicies`
- **Autre solution de service mesh** : Consultez votre documentation

```bash
# Vérifier si Istio est installé
kubectl get pods -n istio-system

# Vérifier les NetworkPolicies
kubectl get networkpolicies -A

# Vérifier les AuthorizationPolicies (Istio)
kubectl get authorizationpolicy -A
```

### 3. Accéder à la Configuration

```bash
# Identifier le namespace de vos sandbox
kubectl get pods -A | grep -i sandbox
kubectl get pods -A | grep -i daytona

# Vérifier les AuthorizationPolicy existantes
kubectl get authorizationpolicy -A
kubectl describe authorizationpolicy -A

# Vérifier les NetworkPolicies existantes
kubectl get networkpolicy -A
kubectl describe networkpolicy -A

# Vérifier les ServiceEntry (Istio)
kubectl get serviceentry -A
```

### 4. Appliquer la Configuration

**⚠️ Important** : Ces commandes doivent être exécutées depuis votre machine locale avec kubectl, **PAS depuis le sandbox**.

Des exemples de fichiers de configuration sont disponibles dans le répertoire `docs/` :

```bash
# Depuis le répertoire racine du projet suna
cd /Users/fleurykoyo/Documents/LoftAI/Vicia/suna

# Pour NetworkPolicy (Kubernetes)
kubectl apply -f docs/daytona-network-policy.yaml

# Pour AuthorizationPolicy (Istio)
kubectl apply -f docs/daytona-istio-authorization.yaml

# Pour ServiceEntry (Istio)
kubectl apply -f docs/daytona-service-entry.yaml
```

**⚠️ Important** : Avant d'appliquer, modifiez les fichiers pour :
- Remplacer `namespace: daytona` par votre namespace réel (identifié à l'étape 3)
- Remplacer `app: daytona-sandbox` par le label réel de vos sandbox
- Ajuster les domaines autorisés selon vos besoins de sécurité

**Exemple de modification** :
```bash
# 1. Identifier le namespace réel
NAMESPACE=$(kubectl get pods -A | grep sandbox | head -1 | awk '{print $1}')
echo "Namespace trouvé: $NAMESPACE"

# 2. Identifier le label réel
LABEL=$(kubectl get pods -A | grep sandbox | head -1 | awk '{print $2}' | xargs kubectl get pod -A -o jsonpath='{.metadata.labels.app}')
echo "Label trouvé: $LABEL"

# 3. Modifier les fichiers YAML avec ces valeurs
```

### 5. Vérifier la Configuration

```bash
# Vérifier que les politiques sont appliquées
kubectl get authorizationpolicy -n <votre-namespace>
kubectl get networkpolicy -n <votre-namespace>

# Vérifier les logs Istio si disponible
kubectl logs -n istio-system -l app=istio-proxy --tail=50
```

### 6. Tester dans un Sandbox

```bash
# Créer un nouveau sandbox et tester
curl -I http://www.google.com
curl -I https://www.google.com
ping -c 3 8.8.8.8

# Tester depuis le navigateur dans le sandbox
# L'agent devrait maintenant pouvoir accéder aux sites web
```

## Configuration Alternative : Bypass via Variables d'Environnement

Si vous ne pouvez pas modifier la configuration réseau au niveau infrastructure, vous pouvez essayer de configurer Chrome pour bypasser certaines restrictions :

### Modifier browserApi.ts

Les flags Chrome ont déjà été ajoutés dans `backend/core/sandbox/docker/browserApi.ts` :
- `--ignore-certificate-errors`
- `--ignore-ssl-errors`
- `--disable-web-security`

Cependant, ces flags ne peuvent pas contourner un proxy qui bloque complètement les connexions.

## Dépannage

### Diagnostic Complet

Si le problème persiste après avoir appliqué les configurations, effectuez ces vérifications :

#### 1. Vérifier les Logs Envoy/Istio

```bash
# Logs du proxy envoy
kubectl logs -n istio-system -l app=istio-proxy | grep -i "403\|forbidden\|denied\|reset"

# Logs du sandbox
kubectl logs -n daytona <sandbox-pod-name> | grep -i "network\|proxy\|403"

# Vérifier les événements Kubernetes
kubectl get events -n daytona --sort-by='.lastTimestamp' | grep -i "network\|policy\|forbidden"
```

#### 2. Tester la Connectivité Depuis le Pod

```bash
# Exécuter une commande dans le sandbox
kubectl exec -it -n daytona <sandbox-pod-name> -- /bin/bash

# Tests de connectivité
curl -v http://www.google.com          # Devrait retourner 403 Forbidden (envoy)
curl -v https://www.google.com         # Devrait retourner Connection reset
ping -c 3 8.8.8.8                      # Devrait fonctionner ✅
nslookup google.com                    # Test DNS
dig google.com                         # Test DNS alternatif
```

#### 3. Vérifier les Variables d'Environnement

```bash
# Vérifier les variables d'environnement du sandbox
kubectl exec -n daytona <sandbox-pod-name> -- env | grep -i proxy

# Vérifier les variables d'environnement du conteneur
kubectl describe pod <sandbox-pod-name> -n daytona | grep -i proxy
```

#### 4. Vérifier les NetworkPolicies et AuthorizationPolicies

```bash
# Lister toutes les NetworkPolicies
kubectl get networkpolicies -n daytona -o yaml

# Lister toutes les AuthorizationPolicies
kubectl get authorizationpolicies -n daytona -o yaml

# Vérifier les règles appliquées
kubectl describe networkpolicy -n daytona
kubectl describe authorizationpolicy -n daytona
```

#### 5. Vérifier les ServiceEntry Istio

```bash
# Lister les ServiceEntry
kubectl get serviceentry -n daytona
kubectl get serviceentry -n istio-system

# Vérifier la configuration
kubectl describe serviceentry -n daytona
```

### Solutions Alternatives si la Configuration Standard Ne Fonctionne Pas

#### Solution A : Utiliser un Proxy SOCKS5/HTTP

Si vous avez accès à un proxy externe, configurez-le dans le navigateur Chrome :

```typescript
// Dans browserApi.ts, ajoutez ces flags Chrome :
args: [
    // ... autres flags ...
    "--proxy-server=socks5://proxy.example.com:1080",  // ou http://proxy:8080
    "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE proxy.example.com"
]
```

#### Solution B : Désactiver Temporairement le Proxy Envoy

⚠️ **Attention** : Cette solution réduit la sécurité. À utiliser uniquement pour le développement.

```yaml
# Créer une AuthorizationPolicy qui bypass envoy
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: bypass-envoy
  namespace: daytona
spec:
  selector:
    matchLabels:
      app: daytona-sandbox
  action: ALLOW
  rules:
  - {}
```

#### Solution C : Utiliser un ServiceEntry avec IP Directe

Si DNS fonctionne mais HTTPS est bloqué, essayez d'accéder directement par IP :

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: google-direct-ip
  namespace: daytona
spec:
  hosts:
  - "142.250.191.14"  # IP de google.com (vérifiez avec nslookup)
  - "142.250.191.46"
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: STATIC
  endpoints:
  - address: "142.250.191.14"
```

#### Solution D : Contourner via un Tunnel SSH

Si vous avez accès SSH, créez un tunnel SOCKS :

```bash
# Sur votre machine locale
ssh -D 1080 user@sandbox-host

# Puis configurez Chrome pour utiliser ce proxy local
```

#### Solution E : Vérifier la Configuration Envoy Directement

```bash
# Accéder à la configuration envoy
kubectl exec -it -n istio-system <istio-proxy-pod> -- /bin/bash

# Vérifier les listeners envoy
curl localhost:15000/listeners

# Vérifier les clusters
curl localhost:15000/clusters

# Vérifier les routes
curl localhost:15000/routes
```

### Problèmes Courants et Solutions

#### Problème : "Connection reset by peer" sur HTTPS uniquement

**Cause** : Le proxy envoy bloque spécifiquement TLS/HTTPS après la poignée de main.

**Solution** :
1. Vérifier que le ServiceEntry autorise bien le port 443
2. Vérifier que l'AuthorizationPolicy n'a pas de règles restrictives sur HTTPS
3. Vérifier les règles de sécurité TLS dans Istio

#### Problème : HTTP retourne 403 mais le ping fonctionne

**Cause** : Le proxy envoy intercepte les requêtes HTTP et les bloque.

**Solution** :
1. Vérifier que l'AuthorizationPolicy autorise bien les méthodes HTTP (GET, POST, etc.)
2. Vérifier que le ServiceEntry inclut bien les domaines ciblés
3. Vérifier les règles de rate limiting qui pourraient bloquer les requêtes

#### Problème : Les configurations sont appliquées mais ne fonctionnent pas

**Cause** : Les règles peuvent être en conflit ou l'ordre d'application peut être important.

**Solution** :
1. Vérifier l'ordre des AuthorizationPolicy (les règles sont évaluées dans l'ordre)
2. Vérifier s'il y a des règles DENY qui prennent le dessus
3. Supprimer toutes les anciennes politiques et réappliquer
4. Vérifier les logs envoy pour voir quelle règle bloque exactement

## Configuration Recommandée pour Production

Pour un environnement de production, nous recommandons :

1. **Autoriser l'accès Internet complet** pour les sandbox (Solution 1)
2. **Monitorer le trafic** avec des outils de logging
3. **Limiter les domaines** si nécessaire pour des raisons de sécurité
4. **Utiliser un proxy externe** si vous avez besoin de contrôle supplémentaire

## Support Daytona

Si vous avez besoin d'aide pour configurer Daytona :

1. Consultez la documentation Daytona sur la configuration réseau
2. Contactez le support Daytona pour les problèmes de proxy envoy
3. Vérifiez les forums/communauté Daytona pour des solutions similaires

## Notes Importantes

- ⚠️ **Sécurité** : Autoriser l'accès Internet complet peut présenter des risques de sécurité. Assurez-vous que vos sandbox sont isolés et ne peuvent pas être utilisés pour des activités malveillantes.
- 🔒 **Isolation** : Les sandbox devraient toujours être isolés les uns des autres, même avec l'accès Internet.
- 📊 **Monitoring** : Surveillez le trafic réseau des sandbox pour détecter les activités suspectes.

## Références

- [Istio AuthorizationPolicy Documentation](https://istio.io/latest/docs/reference/config/security/authorization-policy/)
- [Kubernetes NetworkPolicy Documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Daytona Documentation](https://www.daytona.io/docs)

## Commandes de Dépannage Rapide

### Checklist Complète

```bash
# 1. Vérifier que le sandbox existe
kubectl get pods -n daytona | grep sandbox

# 2. Vérifier les NetworkPolicies
kubectl get networkpolicies -n daytona

# 3. Vérifier les AuthorizationPolicies
kubectl get authorizationpolicies -n daytona

# 4. Vérifier les ServiceEntry
kubectl get serviceentry -n daytona

# 5. Tester depuis le sandbox
kubectl exec -it -n daytona <sandbox-pod> -- curl -v http://www.google.com
kubectl exec -it -n daytona <sandbox-pod> -- curl -v https://www.google.com

# 6. Vérifier les logs envoy
kubectl logs -n istio-system -l app=istio-proxy --tail=100 | grep -i "403\|reset\|denied"

# 7. Vérifier la configuration envoy
kubectl exec -n istio-system <istio-proxy-pod> -- curl localhost:15000/config_dump | jq '.configs[2].dynamic_route_configs'
```

### Commandes pour Identifier le Problème

```bash
# Identifier le namespace
kubectl get namespaces | grep daytona

# Identifier les labels des sandbox
kubectl get pods -n daytona --show-labels

# Vérifier les règles de sécurité appliquées
kubectl describe authorizationpolicy -n daytona
kubectl describe networkpolicy -n daytona

# Vérifier les événements récents
kubectl get events -n daytona --sort-by='.lastTimestamp' | tail -20
```

## Contact et Support

Pour toute question ou problème, consultez :
- Les logs du backend : `docker compose logs backend`
- Les logs du sandbox via Daytona : `kubectl logs -n daytona <sandbox-pod>`
- La documentation de votre infrastructure Daytona
- Les logs envoy/Istio : `kubectl logs -n istio-system -l app=istio-proxy`

### Si le Problème Persiste

1. **Vérifiez les logs envoy** pour voir exactement quelle règle bloque
2. **Contactez l'administrateur Daytona** avec les informations de diagnostic
3. **Vérifiez si d'autres services** dans le même namespace ont accès Internet
4. **Consultez la documentation Istio** pour des configurations avancées

