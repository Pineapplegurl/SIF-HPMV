# 🚀 Déploiement Rapide sur Railway

## Checklist Pré-déploiement ✅

- [ ] Code pushé sur GitHub
- [ ] Base MongoDB Atlas configurée
- [ ] Variables d'environnement prêtes

## 1. Déploiement Express (2 minutes)

1. **Aller sur [Railway](https://railway.app)**
2. **New Project** → **Deploy from GitHub repo**
3. **Sélectionner** votre repo SIF-HPMV
4. **Attendre** la détection automatique du `railway.json`

## 2. Configuration Variables (1 minute)

Dans Railway → Variables, ajouter :

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/SIF
JWT_SECRET=your-super-secret-jwt-key
```

⚠️ **Important** : Remplacer par vos vraies valeurs !

## 3. Vérification (30 secondes)

1. Attendre la fin du build
2. Cliquer sur l'URL générée
3. Tester la connexion

## 🔧 Variables MongoDB Atlas

```bash
MONGODB_URI=mongodb+srv://inesber:jetest12@cluster0.0qfq8.mongodb.net/SIF?retryWrites=true&w=majority
JWT_SECRET=3857da5e30d3eb310ef3635a895684f0ce9df7c396f24817c30f8e7d6dc5ba63553d50bfdd9e34fd7762caed7f5beb740052170f613475514dfea6994d55e630
```

## 🚨 Dépannage Express

**Erreur 500** → Vérifier MONGODB_URI  
**Build fail** → Vérifier les logs Railway  
**App ne charge pas** → Vérifier les variables d'environnement

---
*Total : ~3-4 minutes pour un déploiement complet*