#!/usr/bin/env python3
"""
Script de test pour vérifier la connexion Bedrock et les fallbacks
"""
import asyncio
import sys
import os

# Ajouter le répertoire parent au path pour les imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_bedrock():
    """Test la connexion Bedrock"""
    print("=" * 70)
    print("TEST DE CONNEXION BEDROCK")
    print("=" * 70)
    print()
    
    # Import après avoir ajouté le path
    from core.utils.config import config
    from core.services.llm import setup_api_keys, setup_provider_router, provider_router
    import litellm
    from litellm import RateLimitError
    
    print("🔍 Étape 1: Vérification de la configuration...")
    print("-" * 70)
    
    # Vérifier la configuration
    bedrock_token = getattr(config, 'AWS_BEARER_TOKEN_BEDROCK', None) if config else None
    env_mode = getattr(config, 'ENV_MODE', None) if config else None
    
    print(f"✅ ENV_MODE: {env_mode}")
    print(f"{'✅' if bedrock_token else '❌'} AWS_BEARER_TOKEN_BEDROCK: {'Configuré' if bedrock_token else 'Non configuré'}")
    
    if not bedrock_token:
        print("\n❌ ERREUR: AWS_BEARER_TOKEN_BEDROCK n'est pas configuré")
        return False
    
    # Configurer les clés API
    print("\n🔧 Étape 2: Configuration des clés API...")
    print("-" * 70)
    setup_api_keys()
    
    # Vérifier que le token est dans l'environnement
    env_token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    print(f"{'✅' if env_token else '❌'} Token dans environnement: {'Oui' if env_token else 'Non'}")
    
    if not env_token:
        print("\n❌ ERREUR: Le token Bedrock n'a pas été chargé dans l'environnement")
        return False
    
    # Configurer le router
    print("\n🔧 Étape 3: Configuration du Router LiteLLM...")
    print("-" * 70)
    setup_provider_router()
    
    if provider_router is None:
        print("❌ ERREUR: provider_router n'est pas initialisé")
        return False
    
    # Vérifier les fallbacks
    print("\n🔍 Étape 4: Vérification des fallbacks...")
    print("-" * 70)
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
            print("   (Cela peut être normal si le mode n'est pas local ou si Bedrock n'est pas détecté)")
    else:
        print("❌ Aucun fallback configuré")
    
    # Test de connexion Bedrock
    print("\n🧪 Étape 5: Test de connexion à Bedrock...")
    print("-" * 70)
    
    test_model = "bedrock/converse/arn:aws:bedrock:us-west-2:935064898258:application-inference-profile/heol2zyy5v48"
    print(f"📡 Modèle de test: {test_model}")
    print("   Envoi d'une requête simple...")
    
    try:
        response = await litellm.acompletion(
            model=test_model,
            messages=[
                {"role": "user", "content": "Réponds uniquement par 'OK' pour confirmer la connexion."}
            ],
            max_tokens=10,
            temperature=0
        )
        
        content = response.choices[0].message.content.strip()
        print(f"✅ Réponse reçue: '{content}'")
        print("\n✅ SUCCÈS: Bedrock est correctement connecté et fonctionnel!")
        return True
        
    except RateLimitError as e:
        print(f"⚠️  Rate limit atteint (mais connexion OK): {str(e)[:100]}")
        print("\n✅ La connexion fonctionne, mais vous avez atteint la limite de taux")
        return True
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ ERREUR lors de l'appel Bedrock:")
        print(f"   {error_msg[:200]}")
        
        # Messages d'erreur spécifiques
        if "authentication" in error_msg.lower() or "unauthorized" in error_msg.lower():
            print("\n💡 SUGGESTION: Vérifiez que AWS_BEARER_TOKEN_BEDROCK est correct")
        elif "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            print("\n💡 SUGGESTION: Vérifiez que le modèle Bedrock existe dans votre compte AWS")
        elif "region" in error_msg.lower():
            print("\n💡 SUGGESTION: Vérifiez la région AWS (us-west-2)")
        elif "timeout" in error_msg.lower():
            print("\n💡 SUGGESTION: Problème de réseau ou timeout")
        
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(test_bedrock())
        print("\n" + "=" * 70)
        if result:
            print("🎉 RÉSULTAT: Tous les tests sont passés avec succès!")
            sys.exit(0)
        else:
            print("⚠️  RÉSULTAT: Certains tests ont échoué")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERREUR FATALE: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

