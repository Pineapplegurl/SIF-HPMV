#!/bin/bash

echo "🔧 Test de connectivité API SIF-HPMV"
echo "=================================="

# URL de base de votre application Netlify
BASE_URL="https://your-app-name.netlify.app"

echo "1. Test du endpoint health..."
curl -s "$BASE_URL/api/health" | jq . || echo "Endpoint health non disponible"

echo -e "\n2. Test du endpoint type-points..."
curl -s "$BASE_URL/api/type-points" | jq . || echo "Endpoint type-points non disponible"

echo -e "\n3. Test du endpoint points..."
curl -s "$BASE_URL/api/points" | jq . || echo "Endpoint points non disponible"

echo -e "\n4. Test d'authentification avec admin/laCONNEXION25..."
curl -s -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"laCONNEXION25"}' | jq . || echo "Test d'authentification échoué"

echo -e "\n✅ Test terminé!"