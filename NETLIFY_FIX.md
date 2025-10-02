# 🚨 CORRECTION URGENTE - API Configuration

## Problème détecté :
❌ L'API pointe vers `https://your-production-domain.com` au lieu de Netlify Functions  
❌ Content Security Policy bloque les connexions  

## ✅ Corrections appliquées :

### 1. **API_BASE_URL corrigé**
- Avant: `https://your-production-domain.com`
- Après: URL relative `''` pour Netlify Functions

### 2. **Content Security Policy mis à jour**
- Ajouté: `connect-src 'self' /.netlify/functions/`
- Autorise les connexions aux Functions Netlify

## 🔧 **Actions nécessaires sur Netlify :**

### **Variables d'environnement à vérifier :**
Aller dans **Site settings** → **Environment variables** et s'assurer que ces variables sont bien définies :

```
MONGODB_URI=mongodb+srv://inesber:jetest12@cluster0.0qfq8.mongodb.net/SIF?retryWrites=true&w=majority
JWT_SECRET=3857da5e30d3eb310ef3635a895684f0ce9df7c396f24817c30f8e7d6dc5ba63553d50bfdd9e34fd7762caed7f5beb740052170f613475514dfea6994d55e630
ADMIN_HASH=$2b$10$e7skCrUC5/KXWwem75QrzeidYTcoRP/iwmwnVO07.goSegaa7y4li
NODE_ENV=production
```

## 🚀 **Résultat attendu après redéploiement :**
- ✅ API calls vers `/.netlify/functions/api/*`
- ✅ MongoDB connexion fonctionnelle
- ✅ Authentification admin working
- ✅ Pas d'erreurs CSP

## 📱 **URLs après correction :**
- **Frontend**: `https://your-netlify-url.netlify.app`
- **API Health**: `https://your-netlify-url.netlify.app/api/health`
- **API Login**: `https://your-netlify-url.netlify.app/api/login`