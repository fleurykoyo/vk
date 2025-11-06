#!/usr/bin/env python3
"""
Script de test pour vérifier la connexion Bedrock
"""
import asyncio
import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.utils.config import config
from core.services.llm import setup_api_keys, setup_provider_router, provider_router
import litellm
from litellm import RateLimitError

async def test_bedrock_connection():
    """Test la connexion Bedrock avec un appel simple"""
    print("🔍 Vérification de la configuration Bedrock...")
    print("-" * 60)
    
    # Vérifier la configuration
    bedrock_token = getattr(config, 'AWS_BEARER_TOKEN_BEDROCK', None) if config else None
    env_mode = getattr(config, 'ENV_MODE', None) if config else None
    
    print(f"✅ ENV_MODE: {env_mode}")
    print(f"{'✅' if bedrock_token else '❌'} AWS_BEARER_TOKEN_BEDROCK: {'Configuré' if bedrock_token else 'Non configuré'}")
    
    if not bedrock_token:
        print("\n❌ ERREUR: AWS_BEARER_TOKEN_BEDROCK n'est pas configuré dans .env")
        return False
    
    # Configurer les clés API
    setup_api_keys()
    setup_provider_router()
    
    # Vérifier que le token est dans l'environnement
    env_token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    print(f"{'✅' if env_token else '❌'} Token dans environnement: {'Oui' if env_token else 'Non'}")
    
    if not env_token:
        print("\n❌ ERREUR: Le token Bedrock n'a pas été chargé dans l'environnement")
        return False
    
    print("\n🧪 Test de connexion à Bedrock...")
    print("-" * 60)
    
    # Test avec un modèle Bedrock
    test_model = "bedrock/converse/arn:aws:bedrock:us-west-2:935064898258:application-inference-profile/heol2zyy5v48"
    
    try:
        print(f"📡 Appel à: {test_model}")
        response = await litellm.acompletion(
            model=test_model,
            messages=[
                {"role": "user", "content": "Bonjour, peux-tu répondre avec juste 'OK' pour confirmer la connexion?"}
            ],
            max_tokens=10,
            temperature=0
        )
        
        content = response.choices[0].message.content
        print(f"✅ Réponse reçue: {content}")
        print("\n✅ SUCCÈS: Bedrock est correctement connecté!")
        return True
        
    except RateLimitError as e:
        print(f"⚠️  Rate limit atteint (mais connexion OK): {str(e)}")
        print("\n✅ La connexion fonctionne, mais vous avez atteint la limite de taux")
        return True
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ ERREUR lors de l'appel Bedrock:")
        print(f"   {error_msg}")
        
        # Messages d'erreur spécifiques
        if "authentication" in error_msg.lower() or "unauthorized" in error_msg.lower():
            print("\n💡 SUGGESTION: Vérifiez que AWS_BEARER_TOKEN_BEDROCK est correct")
        elif "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            print("\n💡 SUGGESTION: Vérifiez que le modèle Bedrock existe dans votre compte AWS")
        elif "region" in error_msg.lower():
            print("\n💡 SUGGESTION: Vérifiez la région AWS (us-west-2)")
        
        return False

async def test_fallback_configuration():
    """Vérifie que les fallbacks sont correctement configurés"""
    print("\n🔍 Vérification de la configuration des fallbacks...")
    print("-" * 60)
    
    setup_provider_router()
    
    if provider_router is None:
        print("❌ ERREUR: provider_router n'est pas initialisé")
        return False
    
    # Vérifier les fallbacks
    fallbacks = getattr(provider_router, 'fallbacks', None)
    if fallbacks:
        print(f"✅ {len(fallbacks)} règle(s) de fallback configurée(s)")
        
        # Chercher le fallback pour anthropic/claude-haiku-4-5
        haiku_fallback = None
        for fallback in fallbacks:
            if "anthropic/claude-haiku-4-5" in fallback:
                haiku_fallback = fallback["anthropic/claude-haiku-4-5"]
                break
        
        if haiku_fallback:
            print(f"✅ Fallback pour anthropic/claude-haiku-4-5 trouvé:")
            for i, model in enumerate(haiku_fallback, 1):
                print(f"   {i}. {model}")
        else:
            print("⚠️  Fallback pour anthropic/claude-haiku-4-5 non trouvé")
    else:
        print("❌ Aucun fallback configuré")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("TEST DE CONNEXION BEDROCK")
    print("=" * 60)
    print()
    
    # Test 1: Connexion Bedrock
    connection_ok = asyncio.run(test_bedrock_connection())
    
    # Test 2: Configuration des fallbacks
    fallback_ok = asyncio.run(test_fallback_configuration())
    
    print("\n" + "=" * 60)
    print("RÉSUMÉ")
    print("=" * 60)
    print(f"Connexion Bedrock: {'✅ OK' if connection_ok else '❌ ÉCHEC'}")
    print(f"Fallbacks configurés: {'✅ OK' if fallback_ok else '❌ ÉCHEC'}")
    print()
    
    if connection_ok and fallback_ok:
        print("🎉 Tout est correctement configuré!")
        sys.exit(0)
    else:
        print("⚠️  Certains tests ont échoué. Vérifiez la configuration.")
        sys.exit(1)

