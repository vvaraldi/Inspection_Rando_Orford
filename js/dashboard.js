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
    
    // Charger TOUTES les inspections de sentiers récentes
    // Nous allons filtrer par sentier unique après
    const trailInspectionsSnapshot = await db.collection('trail_inspections')
      .orderBy('date', 'desc')
      .limit(20) // On prend plus que nécessaire pour avoir assez après filtrage
      .get();
    
    // Charger les données des sentiers
    const trailsMap = new Map();
    const trailsSnapshot = await db.collection('trails').get();
    trailsSnapshot.forEach(doc => {
      trailsMap.set(doc.id, doc.data());
    });
    
    // Charger les données des inspecteurs
    const inspectorsMap = new Map();
    const inspectorsSnapshot = await db.collection('inspectors').get();
    inspectorsSnapshot.forEach(doc => {
      inspectorsMap.set(doc.id, doc.data());
    });
    
    // Traiter les inspections de sentiers
    const recentInspections = [];
    const sentierTraités = new Set(); // Pour suivre les sentiers déjà traités
    
    trailInspectionsSnapshot.forEach(doc => {
      const data = doc.data();
      const trailId = data.trail_id;
      
      // Si on a déjà une inspection pour ce sentier, on passe
      if (sentierTraités.has(trailId)) {
        return;
      }
      
      // Marquer ce sentier comme traité
      sentierTraités.add(trailId);
      
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
        condition: data.condition || 'not-inspected',
        issues: data.issues || []
      });
      
      // Si on a 5 inspections de sentiers différents, on arrête
      if (recentInspections.length >= 5) {
        return;
      }
    });
    
    // Si aucune inspection trouvée
    if (recentInspections.length === 0) {
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
    recentInspections.forEach(inspection => {
      const row = document.createElement('tr');
      
      // Formater la date
      const date = inspection.date;
      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      // Type d'inspection - toujours "Sentier" dans ce cas
      const typeText = 'Sentier';
      const typeClass = 'type-trail';
      
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
      
      // Ajouter un indicateur s'il y a des problèmes signalés
      const hasIssues = inspection.issues && inspection.issues.length > 0;
      const issueIndicator = hasIssues ? 
        `<span class="issue-indicator" title="${inspection.issues.join('\n- ')}">⚠️</span>` : '';
      
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td><span class="type-badge ${typeClass}">${typeText}</span></td>
        <td>${inspection.location} ${issueIndicator}</td>
        <td>${inspection.inspector}</td>
        <td><span class="status-badge status-${inspection.condition}">${statusText}</span></td>
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