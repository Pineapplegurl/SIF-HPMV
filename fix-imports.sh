#!/bin/bash

echo "Nettoyage des imports et ajout des imports manquants..."

# Fichiers qui utilisent ${API_BASE_URL}
files=(
  "src/components/SIFTables.js"
  "src/hooks/usePkData.js"
  "src/hooks/useManualPoints.js"
  "src/hooks/useTypePoints.js"
  "src/components/CoordinateEditor.js"
  "src/components/ExcelImporter.js"
  "src/TestMongo.js"
  "src/components/SIFExcelImporter.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Traitement de $file..."
        
        # Supprimer tous les imports API_BASE_URL existants
        sed -i '' '/import.*API_BASE_URL.*from.*config/d' "$file"
        
        # Ajouter l'import après les autres imports React
        sed -i '' '/^import React/a\
import { API_BASE_URL } from '\''../utils/config'\'';
' "$file"
        
        # Si pas d'import React, ajouter en début
        if ! grep -q "^import React" "$file"; then
            sed -i '' '1i\
import { API_BASE_URL } from '\''../utils/config'\'';
' "$file"
        fi
    fi
done

echo "Nettoyage terminé!"
