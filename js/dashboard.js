// dashboard.js
// Ce fichier peut être utilisé pour des fonctionnalités supplémentaires 
// spécifiques au tableau de bord qui ne sont pas dans map.js

// Fonction appelée après l'authentification
function loadDashboardData() {
  // Cette fonction peut être vide si loadMapData gère déjà tout
  console.log("Chargement du tableau de bord");
  
  // Si vous souhaitez charger des données supplémentaires non gérées par map.js
  loadRecentInspections();
}

// Fonction pour charger les inspections récentes
async function loadRecentInspections() {
  try {
    // Cette fonction pourrait être implémentée pour charger 
    // les données du tableau des inspections récentes
    console.log("Chargement des inspections récentes");
    
    // Exemple d'implémentation dans une future version
  } catch (error) {
    console.error("Erreur lors du chargement des inspections récentes:", error);
  }
}