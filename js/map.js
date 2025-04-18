// Référence à Firestore
const db = firebase.firestore();

// Fonction pour récupérer les données des sentiers et leurs dernières inspections
async function loadTrailsWithLatestInspections() {
  try {
    // Étape 1: Récupérer tous les sentiers
    const trailsSnapshot = await db.collection('trails').get();
    const trails = {};
    
    trailsSnapshot.forEach(doc => {
      trails[doc.id] = {
        id: doc.id,
        ...doc.data(),
        latestInspection: null // Sera mis à jour avec la dernière inspection
      };
    });
    
    // Étape 2: Pour chaque sentier, récupérer la dernière inspection
    for (const trailId in trails) {
      const inspectionsSnapshot = await db.collection('trail_inspections')
        .where('trail_id', '==', trailId)
        .orderBy('date', 'desc')
        .limit(1)
        .get();
      
      if (!inspectionsSnapshot.empty) {
        const inspectionDoc = inspectionsSnapshot.docs[0];
        trails[trailId].latestInspection = {
          id: inspectionDoc.id,
          ...inspectionDoc.data()
        };
      }
    }
    
    return Object.values(trails);
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
    return [];
  }
}

// Fonction pour mettre à jour la carte
async function updateMapWithTrailData() {
  // Afficher un indicateur de chargement si nécessaire
  document.getElementById('map-loading').style.display = 'block';
  
  // Récupérer les données
  const trailsWithInspections = await loadTrailsWithLatestInspections();
  
  // Masquer l'indicateur de chargement
  document.getElementById('map-loading').style.display = 'none';
  
  // Mettre à jour la carte avec les données récupérées
  updateMapMarkers(trailsWithInspections);
}