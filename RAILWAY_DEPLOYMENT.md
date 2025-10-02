# Déploiement SIF-HPMV sur Railway

## Guide de déploiement étape par étape

### 1. Prérequis
- Compte Railway (railway.app)
- Repository GitHub avec votre code
- Base de données MongoDB (MongoDB Atlas recommandé)

### 2. Configuration MongoDB Atlas (recommandé)

1. Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un nouveau cluster
3. Configurez un utilisateur de base de données
4. Obtenez votre chaîne de connexion MongoDB
5. Autorisez toutes les adresses IP (0.0.0.0/0) pour Railway

### 3. Déploiement sur Railway

#### Méthode 1 : Via GitHub
1. Connectez-vous à [Railway](https://railway.app)
2. Cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Choisissez votre repository SIF-HPMV
5. Railway détectera automatiquement le `railway.json`

#### Méthode 2 : Via Railway CLI
```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Déployer
railway up
```

### 4. Configuration des variables d'environnement

Dans Railway, ajoutez ces variables d'environnement :

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/SIF?retryWrites=true&w=majority
JWT_SECRET=votre-secret-jwt-super-securise
PORT=5000
```

**Important** : 
- Remplacez `MONGODB_URI` par votre vraie chaîne de connexion MongoDB
- Générez un `JWT_SECRET` fort et unique
- Railway configure automatiquement `PORT`, mais vous pouvez le spécifier

### 5. Processus de build automatique

Railway exécutera automatiquement :
```bash
npm install
npm run build:frontend
cd sif-backend && npm install
cd sif-backend && npm start
```

### 6. Vérification du déploiement

1. Railway vous donnera une URL automatiquement
2. Testez l'accès à votre application
3. Vérifiez que la base de données se connecte correctement
4. Testez les fonctionnalités principales

### 7. Configuration du domaine (optionnel)

1. Dans Railway, allez dans Settings
2. Ajoutez votre domaine personnalisé
3. Configurez les DNS selon les instructions

### 8. Monitoring et logs

- Utilisez l'interface Railway pour voir les logs
- Configurez des alertes si nécessaire
- Surveillez l'utilisation des ressources

## Structure des fichiers importants

```
├── railway.json          # Configuration Railway
├── package.json          # Dépendances frontend
├── .env.example          # Variables d'environnement modèles
├── Dockerfile            # Configuration Docker (optionnel)
└── sif-backend/
    ├── package.json      # Dépendances backend
    ├── server.js         # Serveur principal
    └── .env             # Variables d'environnement (à ne pas commiter)
```

## Dépannage courant

### Erreur de connexion MongoDB
- Vérifiez votre `MONGODB_URI`
- Assurez-vous que l'adresse IP est autorisée
- Vérifiez les credentials

### Erreur de build
- Vérifiez que toutes les dépendances sont listées
- Regardez les logs de build dans Railway

### Application ne se lance pas
- Vérifiez les logs Railway
- Assurez-vous que le `PORT` est correctement configuré
- Vérifiez que toutes les variables d'environnement sont définies

## Support

En cas de problème, consultez :
- [Documentation Railway](https://docs.railway.app)
- [Documentation MongoDB Atlas](https://docs.atlas.mongodb.com)