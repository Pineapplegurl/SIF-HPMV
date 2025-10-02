#!/bin/bash

echo "🚀 Configuration pour déploiement Railway..."

# Vérifier que les dossiers existent
if [ ! -d "build" ]; then
    echo "⚠️  Le dossier build n'existe pas. Lancement du build..."
    npm run build:frontend
fi

if [ ! -d "sif-backend/node_modules" ]; then
    echo "⚠️  Installation des dépendances backend..."
    cd sif-backend && npm install
fi

echo "✅ Configuration terminée !"
echo "📝 N'oubliez pas de configurer vos variables d'environnement sur Railway :"
echo "   - MONGODB_URI"
echo "   - JWT_SECRET"
echo "   - NODE_ENV=production"