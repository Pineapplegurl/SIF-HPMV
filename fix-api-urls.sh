#!/bin/bash

# Script pour remplacer http://localhost:5000 par ${API_BASE_URL}
# dans tous les fichiers JavaScript du dossier src

echo "Remplacement des URLs localhost par API_BASE_URL..."

# Trouver tous les fichiers .js dans src/ et remplacer les URLs
find src/ -name "*.js" -type f -exec sed -i '' 's|http://localhost:5000|\${API_BASE_URL}|g' {} \;

# Ajouter l'import API_BASE_URL dans les fichiers qui l'utilisent
FILES_WITH_API=$(grep -l "\${API_BASE_URL}" src/**/*.js)

for file in $FILES_WITH_API; do
    # Vérifier si l'import existe déjà
    if ! grep -q "import.*API_BASE_URL.*from.*config" "$file"; then
        # Ajouter l'import après les autres imports
        sed -i '' '/^import.*from/a\
import { API_BASE_URL } from '"'"'../utils/config'"'"';
' "$file"
    fi
done

echo "Remplacement terminé!"
