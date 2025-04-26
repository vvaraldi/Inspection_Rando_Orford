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
/**
 * Charge les inspections les plus récentes pour le tableau de bord
 */
async function loadRecentInspections() {
  try {
    const recentInspectionsTable = document.getElementById('recent-inspections-table');
    
    if (!recentInspectionsTable) {
      console.error("Tableau des inspections récentes non trouvé");
      return;
    }
    
    // Afficher un message de chargement
    recentInspectionsTable.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">Chargement des inspections récentes...</td>
      </tr>
    `;
    
    // Charger les inspections de sentiers
    const trailInspectionsSnapshot = await db.collection('trail_inspections')
      .orderBy('date', 'desc')
      .limit(5)
      .get();
    
    // Charger les inspections d'abris
    const shelterInspectionsSnapshot = await db.collection('shelter_inspections')
      .orderBy('date', 'desc')
      .limit(5)
      .get();
    
    // Combiner les deux types d'inspections
    const recentInspections = [];
    
    // Traiter les inspections de sentiers
    const trailsMap = new Map(); // Pour stocker les données des sentiers
    const inspectorsMap = new Map(); // Pour stocker les données des inspecteurs
    
    // Charger les données des sentiers
    const trailsSnapshot = await db.collection('trails').get();
    trailsSnapshot.forEach(doc => {
      trailsMap.set(doc.id, doc.data());
    });
    
    // Charger les données des abris
    const sheltersSnapshot = await db.collection('shelters').get();
    sheltersSnapshot.forEach(doc => {
      trailsMap.set(doc.id, doc.data()); // Utiliser la même map pour simplifier
    });
    
    // Charger les données des inspecteurs
    const inspectorsSnapshot = await db.collection('inspectors').get();
    inspectorsSnapshot.forEach(doc => {
      inspectorsMap.set(doc.id, doc.data());
    });
    
    // Traiter les inspections de sentiers
    trailInspectionsSnapshot.forEach(doc => {
      const data = doc.data();
      const trailId = data.trail_id;
      const inspectorId = data.inspector_id;
      
      // Obtenir les informations du sentier
      const trail = trailsMap.get(trailId) || { name: 'Sentier inconnu' };
      
      // Obtenir les informations de l'inspecteur
      const inspector = inspectorsMap.get(inspectorId) || { name: 'Inspecteur inconnu' };
      
      recentInspections.push({
        id: doc.id,
        type: 'trail',
        date: data.date.toDate(),
        location: trail.name,
        locationId: trailId,
        inspector: inspector.name,
        inspectorId: inspectorId,
        condition: data.condition || 'not-inspected'
      });
    });
    
    // Traiter les inspections d'abris
    shelterInspectionsSnapshot.forEach(doc => {
      const data = doc.data();
      const shelterId = data.shelter_id;
      const inspectorId = data.inspector_id;
      
      // Obtenir les informations de l'abri
      const shelter = trailsMap.get(shelterId) || { name: 'Abri inconnu' };
      
      // Obtenir les informations de l'inspecteur
      const inspector = inspectorsMap.get(inspectorId) || { name: 'Inspecteur inconnu' };
      
      recentInspections.push({
        id: doc.id,
        type: 'shelter',
        date: data.date.toDate(),
        location: shelter.name,
        locationId: shelterId,
        inspector: inspector.name,
        inspectorId: inspectorId,
        condition: data.condition || 'not-inspected'
      });
    });
    
    // Trier par date décroissante (plus récent en premier)
    recentInspections.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Limiter à 10 inspections max
    const limitedInspections = recentInspections.slice(0, 10);
    
    // Si aucune inspection trouvée
    if (limitedInspections.length === 0) {
      recentInspectionsTable.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center;">Aucune inspection récente</td>
        </tr>
      `;
      return;
    }
    
    // Vider le tableau
    recentInspectionsTable.innerHTML = '';
    
    // Créer les lignes du tableau
    limitedInspections.forEach(inspection => {
      const row = document.createElement('tr');
      
      // Formater la date
      const date = inspection.date;
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      // Type d'inspection
      const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
      const typeClass = inspection.type === 'trail' ? 'type-trail' : 'type-shelter';
      
      // État
      let statusText = '';
      switch (inspection.condition) {
        case 'good':
          statusText = 'Bon';
          break;
        case 'warning':
          statusText = 'Attention';
          break;
        case 'critical':
          statusText = 'Critique';
          break;
        default:
          statusText = 'Non inspecté';
      }
      
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td><span class="type-badge ${typeClass}">${typeText}</span></td>
        <td>${inspection.location}</td>
        <td>${inspection.inspector}</td>
        <td><span class="status-badge status-${inspection.condition}">${statusText}</span></td>
        <td>
          <button class="view-btn" onclick="show${inspection.type === 'trail' ? 'Trail' : 'Shelter'}Details('${inspection.locationId}')">Voir détails</button>
        </td>
      `;
      
      recentInspectionsTable.appendChild(row);
    });
    
  } catch (error) {
    console.error("Erreur lors du chargement des inspections récentes:", error);
    
    const recentInspectionsTable = document.getElementById('recent-inspections-table');
    if (recentInspectionsTable) {
      recentInspectionsTable.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #e02424;">Erreur lors du chargement des données</td>
        </tr>
      `;
    }
  }
}