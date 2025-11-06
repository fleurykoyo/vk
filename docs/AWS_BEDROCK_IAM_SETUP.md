# Configuration AWS IAM pour Bedrock

Ce guide vous aide à configurer les permissions IAM nécessaires pour que votre application puisse utiliser AWS Bedrock.

## Problème détecté

L'erreur suivante indique que l'utilisateur IAM n'a pas les permissions nécessaires :

```
User: arn:aws:iam::906116142576:user/BedrockAPIKey-rti4 
is not authorized to perform: bedrock:InvokeModel
```

## Solution : Configurer les permissions IAM

### Option 1 : Via AWS Console (Recommandé)

#### Étape 1 : Accéder à IAM

1. Connectez-vous à la [Console AWS](https://console.aws.amazon.com/)
2. Naviguez vers **IAM** (Identity and Access Management)
3. Dans le menu de gauche, cliquez sur **Users**
4. Recherchez l'utilisateur : `BedrockAPIKey-rti4`

#### Étape 2 : Ajouter une politique inline ou attachée

**Méthode A : Attacher une politique AWS gérée (Recommandé)**

1. Cliquez sur l'utilisateur `BedrockAPIKey-rti4`
2. Allez dans l'onglet **Permissions**
3. Cliquez sur **Add permissions** → **Attach policies directly**
4. Recherchez et sélectionnez : `AmazonBedrockFullAccess` (ou `AmazonBedrockInvokeModel` pour des permissions plus restrictives)
5. Cliquez sur **Add permissions**

**Méthode B : Créer une politique personnalisée (Plus sécurisée)**

1. Dans IAM, allez dans **Policies** → **Create policy**
2. Cliquez sur l'onglet **JSON** et collez le contenu suivant :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
                "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0",
                "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
                "arn:aws:bedrock:us-west-2:935064898258:application-inference-profile/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:ListFoundationModels",
                "bedrock:GetFoundationModel"
            ],
            "Resource": "*"
        }
    ]
}
```

3. Cliquez sur **Next**
4. Nommez la politique : `BedrockInvokeModelPolicy`
5. Cliquez sur **Create policy**
6. Retournez à l'utilisateur `BedrockAPIKey-rti4`
7. Dans **Permissions**, cliquez sur **Add permissions** → **Attach policies directly**
8. Recherchez `BedrockInvokeModelPolicy` et sélectionnez-la
9. Cliquez sur **Add permissions**

#### Étape 3 : Vérifier les permissions

1. Vérifiez que l'utilisateur a maintenant les permissions suivantes :
   - `bedrock:InvokeModel`
   - `bedrock:InvokeModelWithResponseStream` (optionnel, pour le streaming)

### Option 2 : Via AWS CLI

Si vous avez AWS CLI configuré, vous pouvez exécuter :

```bash
# Créer la politique
aws iam create-policy \
    --policy-name BedrockInvokeModelPolicy \
    --policy-document file://bedrock-policy.json

# Attacher la politique à l'utilisateur
aws iam attach-user-policy \
    --user-name BedrockAPIKey-rti4 \
    --policy-arn arn:aws:iam::906116142576:policy/BedrockInvokeModelPolicy
```

## Vérification des permissions

### Test via AWS CLI

```bash
# Tester l'accès Bedrock
aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-haiku-4-5-20251001-v1:0 \
    --region us-west-2 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"Test"}]}' \
    output.json

# Vérifier le résultat
cat output.json
```

### Test via l'endpoint API

Une fois les permissions configurées, testez via l'endpoint :

```bash
curl http://localhost:8000/api/test-bedrock | python3 -m json.tool
```

Vous devriez voir :
```json
{
    "status": "success",
    "message": "Bedrock est correctement connecté et fonctionnel",
    ...
}
```

## Modèles Bedrock utilisés

Votre application utilise les modèles suivants via des Application Inference Profiles :

1. **Haiku 4.5** : `arn:aws:bedrock:us-west-2:935064898258:application-inference-profile/heol2zyy5v48`
2. **Sonnet 4** : `arn:aws:bedrock:us-west-2:935064898258:application-inference-profile/tyj1ks3nj9qf`
3. **Sonnet 4.5** : `arn:aws:bedrock:us-west-2:935064898258:application-inference-profile/few7z4l830xh`

## Permissions minimales requises

Pour que les fallbacks fonctionnent, l'utilisateur IAM doit avoir :

- ✅ `bedrock:InvokeModel` sur les Application Inference Profiles
- ✅ Accès à la région `us-west-2`
- ✅ Accès au compte AWS `935064898258`

## Dépannage

### Erreur : "User is not authorized"

1. Vérifiez que la politique est bien attachée à l'utilisateur
2. Vérifiez que les ARN des ressources dans la politique correspondent
3. Attendez quelques minutes pour que les changements IAM se propagent

### Erreur : "Resource not found"

1. Vérifiez que les Application Inference Profiles existent dans votre compte AWS
2. Vérifiez que vous utilisez la bonne région (`us-west-2`)
3. Vérifiez que le compte AWS ID est correct (`935064898258`)

### Vérifier les permissions actuelles

```bash
# Lister les politiques attachées à l'utilisateur
aws iam list-attached-user-policies --user-name BedrockAPIKey-rti4

# Voir le contenu d'une politique
aws iam get-policy --policy-arn arn:aws:iam::906116142576:policy/BedrockInvokeModelPolicy
aws iam get-policy-version \
    --policy-arn arn:aws:iam::906116142576:policy/BedrockInvokeModelPolicy \
    --version-id v1
```

## Notes importantes

1. **Propagation des changements** : Les changements IAM peuvent prendre quelques minutes à se propager
2. **Sécurité** : Utilisez le principe du moindre privilège - donnez uniquement les permissions nécessaires
3. **Application Inference Profiles** : Ces profiles sont spécifiques à votre compte AWS et région

## Support

Si vous continuez à avoir des problèmes après avoir configuré les permissions :

1. Vérifiez les logs CloudTrail dans AWS Console pour voir les détails de l'erreur
2. Contactez votre administrateur AWS si vous n'avez pas accès à IAM
3. Vérifiez que le token Bedrock (`AWS_BEARER_TOKEN_BEDROCK`) est toujours valide

