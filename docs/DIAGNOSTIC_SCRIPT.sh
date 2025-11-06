#!/bin/bash

# Script de diagnostic pour identifier la configuration réseau Daytona
# À exécuter depuis une machine avec accès kubectl (PAS depuis le sandbox)

set -e

echo "🔍 Diagnostic de la Configuration Réseau Daytona"
echo "=================================================="
echo ""

# Vérifier que kubectl est disponible
if ! command -v kubectl &> /dev/null; then
    echo "❌ Erreur: kubectl n'est pas installé ou pas dans le PATH"
    echo "   Installez kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

echo "✅ kubectl trouvé"
echo ""

# 1. Identifier les namespaces
echo "📦 1. Identification des namespaces..."
echo "-------------------------------------"
kubectl get namespaces | grep -E "daytona|sandbox|default" || echo "Aucun namespace daytona/sandbox trouvé"
echo ""

# 2. Identifier les pods sandbox
echo "🐳 2. Identification des pods sandbox..."
echo "----------------------------------------"
SANDBOX_PODS=$(kubectl get pods -A | grep -i sandbox || echo "")
if [ -z "$SANDBOX_PODS" ]; then
    echo "⚠️  Aucun pod sandbox trouvé"
    echo "   Recherche de pods daytona..."
    SANDBOX_PODS=$(kubectl get pods -A | grep -i daytona || echo "")
fi

if [ -n "$SANDBOX_PODS" ]; then
    echo "$SANDBOX_PODS"
    SANDBOX_NS=$(echo "$SANDBOX_PODS" | head -1 | awk '{print $1}')
    SANDBOX_POD=$(echo "$SANDBOX_PODS" | head -1 | awk '{print $2}')
    echo ""
    echo "📌 Namespace identifié: $SANDBOX_NS"
    echo "📌 Pod identifié: $SANDBOX_POD"
else
    echo "⚠️  Aucun pod sandbox/daytona trouvé"
    SANDBOX_NS=""
    SANDBOX_POD=""
fi
echo ""

# 3. Vérifier les NetworkPolicies
echo "🛡️  3. Vérification des NetworkPolicies..."
echo "------------------------------------------"
if [ -n "$SANDBOX_NS" ]; then
    kubectl get networkpolicies -n "$SANDBOX_NS" || echo "Aucune NetworkPolicy dans $SANDBOX_NS"
    kubectl describe networkpolicies -n "$SANDBOX_NS" 2>/dev/null || echo ""
else
    kubectl get networkpolicies -A | head -20
fi
echo ""

# 4. Vérifier les AuthorizationPolicies (Istio)
echo "🔐 4. Vérification des AuthorizationPolicies (Istio)..."
echo "------------------------------------------------------"
if [ -n "$SANDBOX_NS" ]; then
    kubectl get authorizationpolicy -n "$SANDBOX_NS" || echo "Aucune AuthorizationPolicy dans $SANDBOX_NS"
    kubectl describe authorizationpolicy -n "$SANDBOX_NS" 2>/dev/null || echo ""
else
    kubectl get authorizationpolicy -A | head -20
fi
echo ""

# 5. Vérifier les ServiceEntry (Istio)
echo "🌐 5. Vérification des ServiceEntry (Istio)..."
echo "----------------------------------------------"
if [ -n "$SANDBOX_NS" ]; then
    kubectl get serviceentry -n "$SANDBOX_NS" || echo "Aucune ServiceEntry dans $SANDBOX_NS"
else
    kubectl get serviceentry -A | head -20
fi
echo ""

# 6. Vérifier si Istio est installé
echo "🔍 6. Vérification de l'installation Istio..."
echo "---------------------------------------------"
ISTIO_PODS=$(kubectl get pods -n istio-system 2>/dev/null || echo "")
if [ -n "$ISTIO_PODS" ]; then
    echo "✅ Istio semble être installé"
    kubectl get pods -n istio-system | head -5
    echo ""
    echo "📋 Logs envoy récents (erreurs 403/reset)..."
    kubectl logs -n istio-system -l app=istio-proxy --tail=50 2>/dev/null | grep -i "403\|forbidden\|reset\|denied" | tail -10 || echo "Aucune erreur récente trouvée"
else
    echo "⚠️  Istio ne semble pas être installé (namespace istio-system introuvable)"
fi
echo ""

# 7. Vérifier les labels des pods sandbox
echo "🏷️  7. Labels des pods sandbox..."
echo "---------------------------------"
if [ -n "$SANDBOX_NS" ] && [ -n "$SANDBOX_POD" ]; then
    kubectl get pod -n "$SANDBOX_NS" "$SANDBOX_POD" -o jsonpath='{.metadata.labels}' | jq '.' 2>/dev/null || kubectl get pod -n "$SANDBOX_NS" "$SANDBOX_POD" --show-labels
    echo ""
    echo "📝 Labels importants pour la configuration:"
    kubectl get pod -n "$SANDBOX_NS" "$SANDBOX_POD" -o jsonpath='{range .metadata.labels}{.key}{"="}{.value}{"\n"}{end}' | grep -E "app|component|name" || echo "Aucun label app/component trouvé"
fi
echo ""

# 8. Résumé et recommandations
echo "📊 8. Résumé et Recommandations"
echo "================================="
echo ""
if [ -z "$SANDBOX_NS" ]; then
    echo "❌ Impossible d'identifier le namespace des sandbox"
    echo "   Vérifiez manuellement: kubectl get pods -A"
    exit 1
fi

echo "✅ Informations identifiées:"
echo "   - Namespace: $SANDBOX_NS"
if [ -n "$SANDBOX_POD" ]; then
    echo "   - Pod exemple: $SANDBOX_POD"
fi

# Détecter le type d'infrastructure
if [ -n "$ISTIO_PODS" ]; then
    echo ""
    echo "🔧 Configuration recommandée:"
    echo "   1. Utiliser docs/daytona-istio-authorization.yaml"
    echo "   2. Utiliser docs/daytona-service-entry.yaml"
    echo "   3. Modifier le namespace: $SANDBOX_NS"
    echo ""
    echo "   Commandes à exécuter:"
    echo "   sed -i '' 's/namespace: daytona/namespace: $SANDBOX_NS/g' docs/daytona-istio-authorization.yaml"
    echo "   sed -i '' 's/namespace: daytona/namespace: $SANDBOX_NS/g' docs/daytona-service-entry.yaml"
    echo "   kubectl apply -f docs/daytona-istio-authorization.yaml"
    echo "   kubectl apply -f docs/daytona-service-entry.yaml"
else
    echo ""
    echo "🔧 Configuration recommandée:"
    echo "   1. Utiliser docs/daytona-network-policy.yaml"
    echo "   2. Modifier le namespace: $SANDBOX_NS"
    echo ""
    echo "   Commandes à exécuter:"
    echo "   sed -i '' 's/namespace: daytona/namespace: $SANDBOX_NS/g' docs/daytona-network-policy.yaml"
    echo "   kubectl apply -f docs/daytona-network-policy.yaml"
fi

echo ""
echo "✅ Diagnostic terminé!"
echo "   Consultez docs/DAYTONA_NETWORK_CONFIGURATION.md pour plus de détails"

