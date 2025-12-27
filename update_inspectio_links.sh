#!/bin/bash
# Script de modification minimaliste pour Inspectio_Orford
# Remplace les liens "Infractions" par "Menu principal" vers Orford_Patrouille

echo "=== SCRIPT DE MODIFICATION INSPECTIO_ORFORD ==="
echo ""
echo "Ce script effectue 3 remplacements dans chaque fichier HTML :"
echo "1. Style CSS : .infraction-link → .main-menu-link"
echo "2. Navigation desktop : lien Infractions → Menu principal"
echo "3. Navigation mobile : lien Infractions → Menu principal"
echo ""

# Fonction pour faire les 3 remplacements dans un fichier
update_file() {
    local file=$1
    echo "Traitement de $file..."
    
    # 1. Remplacer dans le style CSS
    sed -i 's/\.infraction-link {/.main-menu-link {/g' "$file"
    sed -i 's/\.infraction-icon {/.main-menu-icon {/g' "$file"
    
    # 2. Remplacer le divider ID
    sed -i 's/id="infraction-divider"/id="main-menu-divider"/g' "$file"
    
    # 3. Remplacer le lien desktop
    sed -i 's|id="infraction-link" class="infraction-link"|id="main-menu-link" class="main-menu-link"|g' "$file"
    sed -i 's|Accéder aux Infractions|Accéder au Menu principal|g' "$file"
    sed -i 's|<span class="infraction-icon">🚨</span> Infractions|<span class="main-menu-icon">🏠</span> Menu principal|g' "$file"
    sed -i 's|https://vvaraldi.github.io/Infraction_Orford/index.html|https://vvaraldi.github.io/Orford_Patrouille/index.html|g' "$file"
    
    # 4. Remplacer le lien mobile
    sed -i 's|id="mobile-infraction-link"|id="mobile-main-menu-link"|g' "$file"
    sed -i 's|>🚨 Infractions</a>|>🏠 Menu principal</a>|g' "$file"
    
    echo "✓ $file mis à jour"
}

# Appliquer les modifications
# Note: Ce script doit être exécuté dans le répertoire racine du projet Inspectio_Orford

if [ -f "pages/trail-inspection.html" ]; then
    update_file "pages/trail-inspection.html"
fi

if [ -f "pages/shelter-inspection.html" ]; then
    update_file "pages/shelter-inspection.html"
fi

if [ -f "pages/inspection-history.html" ]; then
    update_file "pages/inspection-history.html"
fi

if [ -f "pages/change-password.html" ]; then
    update_file "pages/change-password.html"
fi

echo ""
echo "=== TERMINÉ ==="
echo "N'oubliez pas de remplacer pages/admin.html par le nouveau fichier"
