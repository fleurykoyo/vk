# 🚀 Guide : Créer un Fork et Déployer sur Railway

## Étape 1 : Créer un Fork sur GitHub

1. **Allez sur le repo original** : https://github.com/kortix-ai/suna
2. **Cliquez sur "Fork"** (bouton en haut à droite)
3. **Choisissez votre compte** GitHub
4. **Attendez** que le fork soit créé
5. **Notez le nom** : `votre-username/suna`

---

## Étape 2 : Configurer le Remote

Une fois le fork créé, exécutez ces commandes dans votre terminal :

```bash
cd /Users/fleurykoyo/Documents/LoftAI/Vicia/suna

# Ajouter votre fork comme remote (remplacez votre-username)
git remote add fork https://github.com/votre-username/suna.git

# Vérifier les remotes
git remote -v
```

Vous devriez voir :
```
fork    https://github.com/votre-username/suna.git (fetch)
fork    https://github.com/votre-username/suna.git (push)
origin  https://github.com/kortix-ai/suna.git (fetch)
origin  https://github.com/kortix-ai/suna.git (push)
```

---

## Étape 3 : Mettre à jour depuis Origin (optionnel mais recommandé)

```bash
# Récupérer les dernières modifications du repo original
git fetch origin

# Mettre à jour votre branche main
git pull origin main
```

---

## Étape 4 : Commiter vos modifications

```bash
# Voir les fichiers modifiés
git status

# Ajouter tous les fichiers (modifications + nouveaux fichiers)
git add .

# Créer un commit
git commit -m "Prepare for Railway deployment: add Railway config, update Dockerfile for $PORT, add deployment docs"

# Vérifier que tout est commité
git status
```

---

## Étape 5 : Pousser vers votre Fork

```bash
# Pousser vers votre fork
git push fork main

# Si c'est la première fois, Railway peut demander :
# git push -u fork main
```

---

## Étape 6 : Connecter Railway à votre Fork

1. **Dans Railway**, allez dans votre projet
2. **Supprimez le service "vicia"** (s'il existe) :
   - Settings → Danger → Delete Service
3. **Créez un nouveau service** :
   - Cliquez sur **"+ New"** → **"GitHub Repo"**
   - Recherchez et sélectionnez **`votre-username/suna`**
   - Railway va créer un nouveau service
4. **Configurez le service** :
   - Settings → Source → **"Add Root Directory"** → Entrez `backend`
   - Vérifiez que la branche est `main`
5. **Répétez pour Worker et Frontend** (voir le guide Railway complet)

---

## ✅ Vérification

Après avoir poussé, vérifiez sur GitHub :

1. Allez sur `https://github.com/votre-username/suna`
2. Vérifiez que :
   - ✅ La branche `main` existe
   - ✅ Vos fichiers sont présents (railway.json, docs/, etc.)
   - ✅ Le Dockerfile backend est modifié

---

## 🔄 Mises à jour futures

Pour récupérer les mises à jour du repo original :

```bash
# Récupérer les modifications
git fetch origin

# Fusionner dans votre branche
git merge origin/main

# Pousser vers votre fork
git push fork main
```

Railway déploiera automatiquement les nouvelles modifications !

---

## 🆘 Dépannage

### Erreur : "remote fork already exists"

```bash
# Supprimer le remote existant
git remote remove fork

# Réessayer
git remote add fork https://github.com/votre-username/suna.git
```

### Erreur : "failed to push"

Vérifiez que vous avez les droits d'écriture sur votre fork GitHub.

### Erreur : "branch main does not exist"

Assurez-vous que votre fork a bien la branche `main` :
- Allez sur GitHub → votre fork
- Vérifiez l'onglet "branches"

---

**Une fois ces étapes terminées, votre code sera sur GitHub et Railway pourra s'y connecter !** 🎉

