/**
 * Charge toutes les données nécessaires pour le tableau de bord principal
 * - Récapitulatif des inspections
 * - État des pistes et abris
 * - Inspections récentes
 * - Problèmes signalés
 */
// Référence à Firestore

async function loadDashboardData() {
  try {
    // 1. Récupérer les statistiques générales
    //await updateDashboardStats();
    
    // 2. Charger les données pour la carte
    await loadMapData();
    
    // 3. Récupérer les inspections récentes pour le tableau
    //await loadRecentInspections();
    
    // 4. Mettre à jour l'état général du domaine
    //updateOverallStatus();
    
    console.log("Données du tableau de bord chargées avec succès");
  } catch (error) {
    console.error("Erreur lors du chargement des données du tableau de bord:", error);
  }
}

/**
 * Met à jour les cartes de statistiques dans le tableau de bord
 */
async function updateDashboardStats() {
  // Récupérer le nombre total de pistes et d'abris
  const [trailsSnapshot, sheltersSnapshot] = await Promise.all([ db.collection('trails').get(), db.collection('shelters').get() ]);
  const totalTrails = trailsSnapshot.size;
  const totalShelters = sheltersSnapshot.size;
  const totalInspectable = totalTrails + totalShelters;
  
  // Récupérer les inspections d'aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [trailInspToday, shelterInspToday] = await Promise.all([ db.collection('trail_inspections').where('date', '>=', today).get(), db.collection('shelter_inspections').where('date', '>=', today).get() ]);
  const inspectedToday = trailInspToday.size + shelterInspToday.size;
  
  // Mettre à jour l'élément dans le DOM
  document.getElementById('inspections-today').textContent = `${inspectedToday}/${totalInspectable}`;
  
  // Récupérer le nombre de problèmes signalés non résolus
  const [criticalTrails, warningTrails, criticalShelters, warningShelters] = await getLatestIssues();
  const totalIssues = criticalTrails.length + warningTrails.length + criticalShelters.length + warningShelters.length;
  
  document.getElementById('reported-issues').textContent = totalIssues;
  
  // Mettre à jour l'heure de la dernière mise à jour
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('last-update').textContent = `${hours}:${minutes}`;
}

/**
 * Récupère les inspections récentes pour affichage dans le tableau
 */
async function loadRecentInspections() {
  // Récupérer les 5 dernières inspections de sentiers
  const trailInspections = await db.collection('trail_inspections')
    .orderBy('date', 'desc')
    .limit(5)
    .get();
  
  // Récupérer les 5 dernières inspections d'abris
  const shelterInspections = await db.collection('shelter_inspections')
    .orderBy('date', 'desc')
    .limit(5)
    .get();
  
  // Combiner, trier et limiter à 5 au total
  const recentInspections = [];
  
  trailInspections.forEach(doc => {
    recentInspections.push({
      id: doc.id,
      type: 'trail',
      ...doc.data()
    });
  });
  
  shelterInspections.forEach(doc => {
    recentInspections.push({
      id: doc.id,
      type: 'shelter',
      ...doc.data()
    });
  });
  
  // Trier par date (plus récente en premier)
  recentInspections.sort((a, b) => b.date.seconds - a.date.seconds);
  
  // Limiter à 5
  const latestInspections = recentInspections.slice(0, 5);
  
  // Récupérer les informations supplémentaires (noms des sentiers/abris et inspecteurs)
  const enrichedInspections = await enrichInspectionsWithDetails(latestInspections);
  
  // Mettre à jour le tableau
  updateRecentInspectionsTable(enrichedInspections);
}

/**
 * Ajoute les détails des sentiers/abris et inspecteurs aux inspections
 */
async function enrichInspectionsWithDetails(inspections) {
  const enriched = [];
  
  for (const inspection of inspections) {
    let targetName = '';
    let inspectorName = '';
    
    // Récupérer le nom du sentier ou de l'abri
    if (inspection.type === 'trail') {
      const trailDoc = await db.collection('trails').doc(inspection.trail_id).get();
      if (trailDoc.exists) {
        targetName = trailDoc.data().name;
      }
    } else {
      const shelterDoc = await db.collection('shelters').doc(inspection.shelter_id).get();
      if (shelterDoc.exists) {
        targetName = `Abri ${shelterDoc.data().name}`;
      }
    }
    
    // Récupérer le nom de l'inspecteur
    const inspectorDoc = await db.collection('inspectors').doc(inspection.inspector_id).get();
    if (inspectorDoc.exists) {
      inspectorName = inspectorDoc.data().name;
    }
    
    enriched.push({
      ...inspection,
      targetName,
      inspectorName
    });
  }
  
  return enriched;
}

/**
 * Met à jour le tableau HTML des inspections récentes
 */
function updateRecentInspectionsTable(inspections) {
  const tableBody = document.getElementById('recent-inspections-table');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  inspections.forEach(inspection => {
    const date = inspection.date.toDate();
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    const typeLabel = inspection.type === 'trail' ? 'Sentier' : 'Abri';
    const typeClass = inspection.type === 'trail' ? 'type-trail' : 'type-shelter';
    
    const statusClass = `status-${inspection.condition}`;
    const statusLabel = getStatusText(inspection.condition);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td><span class="type-badge ${typeClass}">${typeLabel}</span></td>
      <td>${inspection.targetName}</td>
      <td>${inspection.inspectorName}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td><button class="view-btn" data-id="${inspection.id}" data-type="${inspection.type}">Voir détails</button></td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Ajouter les écouteurs d'événements pour les boutons "Voir détails"
  document.querySelectorAll('.view-btn').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const type = this.getAttribute('data-type');
      
      // Rediriger vers la page d'historique avec les paramètres appropriés
      window.location.href = `pages/inspection-history.html?id=${id}&type=${type}`;
    });
  });
}

/**
 * Met à jour le statut général du domaine basé sur l'état des pistes et abris
 */
function updateOverallStatus() {
  // Cette fonction serait appelée après avoir chargé les données de la carte
  // Elle analyserait l'état des pistes et abris pour déterminer l'état général
  
  const statusCounts = { good: document.querySelectorAll('.marker-good').length, warning: document.querySelectorAll('.marker-warning').length, critical: document.querySelectorAll('.marker-critical').length, notInspected: document.querySelectorAll('.marker-not-inspected').length };
  
  let overallStatus = 'Bon';
  
  // Si plus de 20% des éléments sont en état critique, l'état global est critique
  if (statusCounts.critical > 0.2 * (statusCounts.good + statusCounts.warning + statusCounts.critical + statusCounts.notInspected)) {
    overallStatus = 'Critique';
  }
  // Sinon, si plus de 30% sont en état d'attention, l'état global est à surveiller
  else if (statusCounts.warning > 0.3 * (statusCounts.good + statusCounts.warning + statusCounts.critical + statusCounts.notInspected)) {
    overallStatus = 'À surveiller';
  }
  
  // Mettre à jour l'affichage
  document.getElementById('overall-status').textContent = overallStatus;
}

/**
 * Utilitaire pour convertir les codes de statut en texte
 */
function getStatusText(status) {
  switch (status) {
    case 'good': return 'Bon';
    case 'warning': return 'Attention';
    case 'critical': return 'Critique';
    default: return 'Non inspecté';
  }
}