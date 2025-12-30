// Référence à Firestore - supposée être déjà initialisée dans auth.js
//const db = firebase.firestore();

// Fonction pour formater une date avec le mois en lettres
function formatDateWithMonthName(date) {
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Fonction principale pour charger les données de la carte
 * Récupère les sentiers, abris et leurs dernières inspections
 */
async function loadMapData() {
  try {
    // Afficher un indicateur de chargement si disponible
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'flex';
    }
    
    // Récupérer les données des sentiers
    const trailsSnapshot = await db.collection('trails').get();
    const trails = [];
    
    trailsSnapshot.forEach(doc => {
      trails.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Récupérer les données des abris
    const sheltersSnapshot = await db.collection('shelters').get();
    const shelters = [];
    
    sheltersSnapshot.forEach(doc => {
      shelters.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Récupérer les dernières inspections pour chaque sentier
    const trailsWithStatus = await getTrailsWithLatestStatus(trails);
    
    // Récupérer les dernières inspections pour chaque abri
    const sheltersWithStatus = await getSheltersWithLatestStatus(shelters);
    
    // Masquer l'indicateur de chargement
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'none';
    }
    
    // Afficher les marqueurs sur la carte
    displayTrailMarkers(trailsWithStatus);
    displayShelterMarkers(sheltersWithStatus);

    // Mettre à jour les statistiques du tableau de bord
    updateDashboardStats(trailsWithStatus, sheltersWithStatus);
    
    console.log("Carte mise à jour avec succès");
    return { trails: trailsWithStatus, shelters: sheltersWithStatus };
  } catch (error) {
    console.error("Erreur lors du chargement des données de la carte:", error);
    
    // Masquer l'indicateur de chargement en cas d'erreur
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'none';
    }
    
    return { trails: [], shelters: [] };
  }
}

/**
 * Récupère le statut le plus récent pour chaque sentier
 * @param {Array} trails - Liste des sentiers
 * @returns {Promise<Array>} - Sentiers avec leur dernier statut
 */
async function getTrailsWithLatestStatus(trails) {
  const trailsWithStatus = [];
  
  for (const trail of trails) {
    // Récupérer la dernière inspection pour ce sentier
    const inspectionsSnapshot = await db.collection('trail_inspections')
      .where('trail_id', '==', trail.id)
      .orderBy('date', 'desc')
      .limit(1)
      .get();
    
    let status = 'not-inspected';
    let lastInspection = null;
    
    if (!inspectionsSnapshot.empty) {
      const inspectionDoc = inspectionsSnapshot.docs[0];
      const inspectionData = inspectionDoc.data();
      
      // Récupérer le nom de l'inspecteur
      let inspectorName = "Non spécifié";
      if (inspectionData.inspector_name) {
        inspectorName = inspectionData.inspector_name;
      } else if (inspectionData.inspector_id) {
        inspectorName = await getInspectorName(inspectionData.inspector_id);
      }
      
      lastInspection = {
        id: inspectionDoc.id,
        ...inspectionData,
        inspector: inspectorName,
        inspector_name: inspectorName
      };
      status = lastInspection.condition; // 'good', 'warning', or 'critical'
    }
    
    trailsWithStatus.push({
      ...trail,
      status,
      lastInspection
    });
  }
  
  return trailsWithStatus;
}

/**
 * Récupère le statut le plus récent pour chaque abri
 * @param {Array} shelters - Liste des abris
 * @returns {Promise<Array>} - Abris avec leur dernier statut
 */
async function getSheltersWithLatestStatus(shelters) {
  const sheltersWithStatus = [];
  
  for (const shelter of shelters) {
    // Récupérer la dernière inspection pour cet abri
    const inspectionsSnapshot = await db.collection('shelter_inspections')
      .where('shelter_id', '==', shelter.id)
      .orderBy('date', 'desc')
      .limit(1)
      .get();
    
    let status = 'not-inspected';
    let lastInspection = null;
    
    if (!inspectionsSnapshot.empty) {
      const inspectionDoc = inspectionsSnapshot.docs[0];
      const inspectionData = inspectionDoc.data();
      
      // Récupérer le nom de l'inspecteur
      let inspectorName = "Non spécifié";
      if (inspectionData.inspector_name) {
        inspectorName = inspectionData.inspector_name;
      } else if (inspectionData.inspector_id) {
        inspectorName = await getInspectorName(inspectionData.inspector_id);
      }
      
      lastInspection = {
        id: inspectionDoc.id,
        ...inspectionData,
        inspector: inspectorName,
        inspector_name: inspectorName
      };
      status = lastInspection.condition; // 'good', 'warning', or 'critical'
    }
    
    sheltersWithStatus.push({
      ...shelter,
      status,
      lastInspection
    });
  }
  
  return sheltersWithStatus;
}

/**
 * Supprime tous les marqueurs existants de la carte
 * pour éviter les doublons lors du rafraîchissement
 */
function clearExistingMarkers() {
  // Supprimer tous les marqueurs de sentiers
  document.querySelectorAll('.map-marker').forEach(marker => {
    marker.remove();
  });
  
  // Supprimer tous les marqueurs d'abris
  document.querySelectorAll('.map-marker-shelter').forEach(marker => {
    marker.remove();
  });
}

// ============================================================================
// QUICK STATUS TOGGLE FEATURE (Right-click for admin users)
// ============================================================================

/**
 * Handle right-click quick status toggle for trails and shelters
 * Only available in simple/status view mode for admin users
 * @param {Event} e - The contextmenu event
 * @param {Object} item - The trail or shelter object
 * @param {string} itemType - 'trail' or 'shelter'
 */
async function handleQuickStatusToggle(e, item, itemType) {
  e.preventDefault();
  
  // Check if we're in simple/status view mode
  if (currentBadgeView !== 'simple') {
    console.log('Quick status toggle: Only available in status view mode');
    return; // Silent return - don't show any message, just show default context menu behavior
  }
  
  // Check if user is admin
  if (typeof isAdmin !== 'function' || !isAdmin()) {
    console.log('Quick status toggle: User is not admin');
    return;
  }
  
  // Determine current and new status based on item type
  let currentStatus, newStatus, statusLabel;
  
  if (itemType === 'trail') {
    // For trails: toggle open/closed
    currentStatus = (item.lastInspection && item.lastInspection.trail_status) || 'unknown';
    newStatus = currentStatus === 'open' ? 'closed' : 'open';
    statusLabel = newStatus === 'open' ? '🟢 Ouvert' : '🔴 Fermé';
  } else {
    // For shelters: cycle through good -> warning -> critical -> good
    currentStatus = (item.lastInspection && item.lastInspection.condition) || 'not-inspected';
    const conditionCycle = {
      'good': 'warning',
      'warning': 'critical', 
      'critical': 'good',
      'not-inspected': 'good'
    };
    newStatus = conditionCycle[currentStatus] || 'good';
    const conditionLabels = {
      'good': '🟢 Bon état',
      'warning': '🟠 Attention',
      'critical': '🔴 Critique'
    };
    statusLabel = conditionLabels[newStatus];
  }
  
  // Build confirmation message
  const itemName = item.name || item.id;
  const typeLabel = itemType === 'trail' ? 'sentier' : 'abri';
  const currentStatusLabel = itemType === 'trail' 
    ? (currentStatus === 'open' ? 'Ouvert' : currentStatus === 'closed' ? 'Fermé' : 'Inconnu')
    : (currentStatus === 'good' ? 'Bon état' : currentStatus === 'warning' ? 'Attention' : currentStatus === 'critical' ? 'Critique' : 'Non inspecté');
  
  const confirmMessage = `Changement rapide de statut\n\n` +
    `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}: ${itemName}\n` +
    `Statut actuel: ${currentStatusLabel}\n` +
    `Nouveau statut: ${statusLabel}\n\n` +
    `Une inspection rapide sera créée avec le commentaire:\n` +
    `"Changement de statut rapide suite à évènement (météo ou autre)"\n\n` +
    `Confirmer le changement?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Show loading indicator
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'flex';
    }
    
    // Save the quick inspection
    await saveQuickInspection(item, itemType, newStatus);
    
    // Reload map data to refresh markers
    await loadMapData();
    
    console.log(`Quick status toggle completed: ${itemName} -> ${newStatus}`);
    
  } catch (error) {
    console.error('Error in quick status toggle:', error);
    alert('Erreur lors du changement de statut: ' + error.message);
    
    // Hide loading indicator on error
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'none';
    }
  }
}

/**
 * Save a quick inspection report based on the last inspection
 * @param {Object} item - The trail or shelter object
 * @param {string} itemType - 'trail' or 'shelter'
 * @param {string} newStatus - The new status to set
 */
async function saveQuickInspection(item, itemType, newStatus) {
  // Get current user info
  const user = firebase.auth().currentUser;
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }
  
  // Get user data from inspectors collection
  const userDoc = await db.collection('inspectors').doc(user.uid).get();
  if (!userDoc.exists) {
    throw new Error('Données utilisateur non trouvées');
  }
  const userData = userDoc.data();
  
  // Prepare the quick inspection data
  const now = new Date();
  const quickComment = "Changement de statut rapide suite à évènement (météo ou autre)";
  
  if (itemType === 'trail') {
    // Create trail inspection data
    const inspectionData = {
      trail_id: item.id,
      inspector_id: user.uid,
      inspector_name: userData.name || 'Admin',
      date: firebase.firestore.Timestamp.fromDate(now),
      trail_status: newStatus, // The new open/closed status
      condition: (item.lastInspection && item.lastInspection.condition) || 'good',
      snow_condition: (item.lastInspection && item.lastInspection.snow_condition) || null,
      issues: (item.lastInspection && item.lastInspection.issues) || [],
      notes: quickComment,
      photos: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isQuickToggle: true // Flag to identify quick toggle inspections
    };
    
    // Use batch to save inspection and update trail
    const batch = db.batch();
    
    const inspectionRef = db.collection('trail_inspections').doc();
    batch.set(inspectionRef, inspectionData);
    
    const trailRef = db.collection('trails').doc(item.id);
    batch.update(trailRef, {
      status: newStatus,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      lastInspectionId: inspectionRef.id
    });
    
    await batch.commit();
    console.log('Trail quick inspection saved:', inspectionRef.id);
    
  } else {
    // Create shelter inspection data
    const inspectionData = {
      shelter_id: item.id,
      inspector_id: user.uid,
      inspector_name: userData.name || 'Admin',
      date: firebase.firestore.Timestamp.fromDate(now),
      condition: newStatus, // The new condition (good/warning/critical)
      cleanliness: (item.lastInspection && item.lastInspection.cleanliness) || 'good',
      accessibility: (item.lastInspection && item.lastInspection.accessibility) || 'good',
      cleanliness_details: '',
      accessibility_details: '',
      issues: (item.lastInspection && item.lastInspection.issues) || [],
      notes: quickComment,
      photos: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isQuickToggle: true // Flag to identify quick toggle inspections
    };
    
    // Save shelter inspection
    const docRef = await db.collection('shelter_inspections').add(inspectionData);
    console.log('Shelter quick inspection saved:', docRef.id);
  }
}

// ============================================================================
// END QUICK STATUS TOGGLE FEATURE
// ============================================================================

/**
 * MODIFIED: Affiche les marqueurs des sentiers sur la carte
 * @param {Array} trails - Sentiers avec leur statut
 */
/**
 * MODIFIED: Affiche les marqueurs des sentiers sur la carte avec indicateurs de problèmes
 * @param {Array} trails - Sentiers avec leur statut
 */
function displayTrailMarkers(trails) {
  const mapContainer = document.querySelector('.map-bg');
  if (!mapContainer) {
    console.error("Conteneur de carte non trouvé");
    return;
  }
  
  // Supprimer les marqueurs existants de type sentier
  document.querySelectorAll('.map-marker:not(.map-marker-shelter)').forEach(marker => {
    marker.remove();
  });
  
  // Créer et ajouter les nouveaux marqueurs
  trails.forEach(trail => {
    const marker = document.createElement('div');
    
    // UPDATED: Use getMarkerClass function for dynamic styling based on toggle
    marker.className = getMarkerClass(trail, 'trail');
    
    // Check if there are issues for the exclamation mark indicator
    const hasIssues = trail.lastInspection && 
                     trail.lastInspection.issues && 
                     trail.lastInspection.issues.length > 0;
    
    // Create marker content with potential problem indicator
    if (currentBadgeView === 'detailed' && hasIssues) {
      // In detail mode with issues: add exclamation mark indicator
      marker.innerHTML = `
        <span>${trail.id.replace('trail_', '')}</span>
        <div class="problem-indicator">!</div>
      `;
    } else {
      // Simple mode or no issues: just show the number
      marker.textContent = trail.id.replace('trail_', '');
    }
    
    marker.setAttribute('data-id', trail.id);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    if (trail.coordinates) {
      marker.style.top = `${trail.coordinates.top}px`;
      marker.style.left = `${trail.coordinates.left}px`;
    } else {
      console.warn(`Coordonnées manquantes pour le sentier ${trail.id}`);
      return;
    }
    
    // Event listeners - Left click opens modal
    marker.addEventListener('click', async () => {
      try {
        await openInspectionModal(trail);
      } catch (error) {
        console.error('Error opening modal:', error);
        alert('Erreur lors de l\'ouverture des détails');
      }
    });
    
    // NEW: Right-click for quick status toggle (admin only)
    marker.addEventListener('contextmenu', (e) => handleQuickStatusToggle(e, trail, 'trail'));
    
    // UPDATED: Dynamic tooltip based on current view
    let tooltipText = trail.name;
    
    if (currentBadgeView === 'simple') {
      // Simple view tooltip: show trail status
      const trailStatus = trail.trail_status || trail.trailStatus || 'unknown';
      const statusText = trailStatus === 'open' ? 'Ouvert' : 
                        trailStatus === 'closed' ? 'Fermé' : 'Statut inconnu';
      tooltipText += `\nStatut: ${statusText}`;
    } else {
      // Detailed view tooltip: existing behavior
      if (trail.lastInspection && trail.lastInspection.date) {
        const date = trail.lastInspection.date.toDate();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        tooltipText += `\nDernière inspection: ${formattedDate}`;
      } else {
        tooltipText += '\nAucune inspection récente';
      }
      
      // Add issues info to tooltip in detailed view
      if (hasIssues) {
        tooltipText += `\n⚠ ${trail.lastInspection.issues.length} problème(s) signalé(s)`;
      }
    }
    
    // Add right-click hint for admins (only in simple/status view)
    if (currentBadgeView === 'simple' && typeof isAdmin === 'function' && isAdmin()) {
      tooltipText += '\n\n[Clic droit: changement rapide de statut]';
    }
    
    marker.setAttribute('title', tooltipText);
    mapContainer.appendChild(marker);
  });
}

/**
 * MODIFIED: Affiche les marqueurs des abris sur la carte
 * @param {Array} shelters - Abris avec leur statut
 */
/**
 * UPDATED: Affiche les marqueurs des abris sur la carte (hide in simple view)
 * @param {Array} shelters - Abris avec leur statut
 */
/**
 * MODIFIED: Affiche les marqueurs des abris sur la carte avec indicateurs de problèmes
 * @param {Array} shelters - Abris avec leur statut
 */
function displayShelterMarkers(shelters) {
  // Sélectionner le conteneur de la carte
  const mapContainer = document.querySelector('.map-bg');
  if (!mapContainer) {
    console.error("Conteneur de carte non trouvé");
    return;
  }
  
  // Supprimer les marqueurs existants de type abri
  document.querySelectorAll('.map-marker-shelter').forEach(marker => {
    marker.remove();
  });
  
  // Créer et ajouter les nouveaux marqueurs
  shelters.forEach(shelter => {
    // Créer l'élément du marqueur
    const marker = document.createElement('div');
    
    // NEW: Use getMarkerClass function for consistency (shelters unchanged in simple view)
    marker.className = getMarkerClass(shelter, 'shelter');
    
    // Check if there are issues for the exclamation mark indicator
    const hasIssues = shelter.lastInspection && 
                     shelter.lastInspection.issues && 
                     shelter.lastInspection.issues.length > 0;
    
    // Create marker content with potential problem indicator
    if (currentBadgeView === 'detailed' && hasIssues) {
      // In detail mode with issues: add exclamation mark indicator
      marker.innerHTML = `
        <span>A${shelter.id.replace('shelter_', '')}</span>
        <div class="problem-indicator">!</div>
      `;
    } else {
      // Simple mode or no issues: just show the A + number
      marker.innerHTML = `<span>A${shelter.id.replace('shelter_', '')}</span>`;
    }
    
    marker.setAttribute('data-id', shelter.id);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    if (shelter.coordinates) {
      marker.style.top = `${shelter.coordinates.top}px`;
      marker.style.left = `${shelter.coordinates.left}px`;
    } else {
      console.warn(`Coordonnées manquantes pour l'abri ${shelter.id}`);
      return;
    }
    
    // Event listeners - Left click opens modal
    marker.addEventListener('click', async () => {
      try {
        await openInspectionModal(shelter);
      } catch (error) {
        console.error('Error opening modal:', error);
        alert('Erreur lors de l\'ouverture des détails');
      }
    });
    
    // NEW: Right-click for quick status toggle (admin only)
    marker.addEventListener('contextmenu', (e) => handleQuickStatusToggle(e, shelter, 'shelter'));
    
    // Dynamic tooltip based on current view (same logic as trails)
    let tooltipText = shelter.name;
    
    if (currentBadgeView === 'simple') {
      // Simple view tooltip: show basic status
      const statusText = {
        'good': 'Bon état',
        'warning': 'Attention', 
        'critical': 'Critique',
        'not-inspected': 'Non inspecté'
      }[shelter.status] || 'Statut inconnu';
      tooltipText += `\nÉtat: ${statusText}`;
    } else {
      // Detailed view tooltip: existing behavior
      if (shelter.lastInspection && shelter.lastInspection.date) {
        const date = shelter.lastInspection.date.toDate();
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        tooltipText += `\nDernière inspection: ${formattedDate}`;
      } else {
        tooltipText += '\nAucune inspection récente';
      }
      
      // Add issues info to tooltip in detailed view
      if (hasIssues) {
        tooltipText += `\n⚠ ${shelter.lastInspection.issues.length} problème(s) signalé(s)`;
      }
    }
    
    // Add right-click hint for admins (only in simple/status view)
    if (currentBadgeView === 'simple' && typeof isAdmin === 'function' && isAdmin()) {
      tooltipText += '\n\n[Clic droit: changement rapide de statut]';
    }
    
    marker.setAttribute('title', tooltipText);
    mapContainer.appendChild(marker);
  });
}

/**
 * Récupère le nom de l'inspecteur à partir de son ID
 * @param {string} inspectorId - L'ID de l'inspecteur
 * @returns {Promise<string>} - Le nom de l'inspecteur ou une valeur par défaut
 */
async function getInspectorName(inspectorId) {
  if (!inspectorId) {
    console.warn("ID d'inspecteur manquant");
    return "Inspecteur inconnu";
  }
  
  try {
    const inspectorDoc = await db.collection('inspectors').doc(inspectorId).get();
    
    if (inspectorDoc.exists) {
      const data = inspectorDoc.data();
      return data.name || "Inspecteur sans nom";
    } else {
      console.warn(`Inspecteur non trouvé: ${inspectorId}`);
      return "Inspecteur inconnu";
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du nom de l'inspecteur:", error);
    return "Inspecteur inconnu";
  }
}


// Add these helper functions to map.js if they don't exist:
function getSnowConditionText(condition) {
  const conditionMap = {
    'good': 'Bonnes conditions',
    'warning': 'Conditions moyennes',
    'critical': 'Mauvaises conditions', 
    'none': 'Non évalué'
  };
  return conditionMap[condition] || condition;
}

function getDifficultyText(difficulty) {
  const difficultyMap = {
    'easy': 'Facile',
    'medium': 'Intermédiaire',
    'hard': 'Difficile'
  };
  return difficultyMap[difficulty] || difficulty || 'Non spécifié';
}

/**
 * FIXED: Met à jour les statistiques du tableau de bord
 * @param {Array} trails - Sentiers avec leur statut
 * @param {Array} shelters - Abris avec leur statut
 */
function updateDashboardStats(trails, shelters) {
  console.log("Updating dashboard stats...");
  
  // Calculer les statistiques
  const stats = {
    total: trails.length + shelters.length,
    inspectedToday: 0,
    good: 0,
    warning: 0,
    critical: 0,
    notInspected: 0
  };
  
  // Date d'aujourd'hui à minuit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Compter les statuts des sentiers
  trails.forEach(trail => {
    switch (trail.status) {
      case 'good': stats.good++; break;
      case 'warning': stats.warning++; break;
      case 'critical': stats.critical++; break;
      default: stats.notInspected++; break;
    }
    
    // Vérifier si l'inspection est d'aujourd'hui
    if (trail.lastInspection && trail.lastInspection.date) {
      const inspectionDate = trail.lastInspection.date.toDate ? 
                           trail.lastInspection.date.toDate() : 
                           new Date(trail.lastInspection.date);
      inspectionDate.setHours(0, 0, 0, 0);
      
      if (inspectionDate.getTime() === today.getTime()) {
        stats.inspectedToday++;
      }
    }
  });
  
  // Compter les statuts des abris
  shelters.forEach(shelter => {
    switch (shelter.status) {
      case 'good': stats.good++; break;
      case 'warning': stats.warning++; break;
      case 'critical': stats.critical++; break;
      default: stats.notInspected++; break;
    }
    
    // Vérifier si l'inspection est d'aujourd'hui
    if (shelter.lastInspection && shelter.lastInspection.date) {
      const inspectionDate = shelter.lastInspection.date.toDate ? 
                           shelter.lastInspection.date.toDate() : 
                           new Date(shelter.lastInspection.date);
      inspectionDate.setHours(0, 0, 0, 0);
      
      if (inspectionDate.getTime() === today.getTime()) {
        stats.inspectedToday++;
      }
    }
  });
  
  // Mettre à jour les éléments du DOM
  const totalElements = document.getElementById('total-elements');
  const inspectedToday = document.getElementById('inspected-today');
  const goodStatus = document.getElementById('good-status');
  const warningStatus = document.getElementById('warning-status');
  const criticalStatus = document.getElementById('critical-status');
  const notInspected = document.getElementById('not-inspected');
  
  if (totalElements) totalElements.textContent = stats.total;
  if (inspectedToday) inspectedToday.textContent = stats.inspectedToday;
  if (goodStatus) goodStatus.textContent = stats.good;
  if (warningStatus) warningStatus.textContent = stats.warning;
  if (criticalStatus) criticalStatus.textContent = stats.critical;
  if (notInspected) notInspected.textContent = stats.notInspected;
  
  console.log("Dashboard stats updated:", stats);
}

// Global variables for filters and badge view
let currentFilters = {
  status: 'all',
  type: 'all',
  difficulty: 'all',
  date: 'all',
  issues: 'all'
};

let currentBadgeView = 'detailed'; // 'detailed' or 'simple'
let allTrails = [];
let allShelters = [];

/**
 * Filtre les données selon les critères actuels et affiche les marqueurs
 */
function displayFilteredMarkers() {
  // Calculer les dates limites pour les filtres temporels
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  // Filtrer les sentiers
  const filteredTrails = allTrails.filter(trail => {
    // Filtre par statut
    if (currentFilters.status !== 'all' && trail.status !== currentFilters.status) {
      return false;
    }
    
    // Filtre par type (toujours true pour les sentiers si type=all ou type=trail)
    if (currentFilters.type !== 'all' && currentFilters.type !== 'trail') {
      return false;
    }
    
    // Filtre par difficulté
    if (currentFilters.difficulty !== 'all' && trail.difficulty !== currentFilters.difficulty) {
      return false;
    }

    // Filtre par date d'inspection
    if (currentFilters.date !== 'all' && trail.lastInspection) {
      const inspectionDate = trail.lastInspection.date.toDate();
      
      switch (currentFilters.date) {
        case 'today':
          if (inspectionDate < today) return false;
          break;
        case 'week':
          if (inspectionDate < oneWeekAgo) return false;
          break;
        case 'month':
          if (inspectionDate < oneMonthAgo) return false;
          break;
      }
    }
    
    // Filtre par problèmes
    if (currentFilters.issues !== 'all') {
      const hasIssues = trail.lastInspection && 
                        trail.lastInspection.issues && 
                        trail.lastInspection.issues.length > 0;
                        
      if (currentFilters.issues === 'with-issues' && !hasIssues) {
        return false;
      }
      
      if (currentFilters.issues === 'without-issues' && hasIssues) {
        return false;
      }
    }

    return true;
  });
  
  // Filtrer les abris
  const filteredShelters = allShelters.filter(shelter => {
    // Status filter
    if (currentFilters.status !== 'all') {
      const status = shelter.lastInspection ? shelter.lastInspection.condition : 'not-inspected';
      if (status !== currentFilters.status) return false;
    }
    
    // Type filter
    if (currentFilters.type !== 'all' && currentFilters.type !== 'shelter') {
      return false;
    }
    
    // Issues filter
    if (currentFilters.issues !== 'all') {
      const hasIssues = shelter.lastInspection && 
                        shelter.lastInspection.issues && 
                        shelter.lastInspection.issues.length > 0;
                        
      if (currentFilters.issues === 'with-issues' && !hasIssues) {
        return false;
      }
      
      if (currentFilters.issues === 'without-issues' && hasIssues) {
        return false;
      }
    }

    return true;
  });
  
  // Display filtered markers
  displayTrailMarkers(filteredTrails);
  displayShelterMarkers(filteredShelters);
  
  // Update counter with new function
  updateFilterCounter(filteredTrails.length + filteredShelters.length);
}

// Helper function for date comparison
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Initialize the map filter toggle functionality

function initMapFilterToggle() {
  const toggleBtn = document.getElementById('toggle-map-filters');
  const filtersContent = document.getElementById('map-filters-content');
  const toggleText = document.getElementById('map-filter-toggle-text');
  
  if (!toggleBtn || !filtersContent || !toggleText) {
    console.warn('Map filter toggle elements not found');
    return;
  }
  
  let filtersVisible = true;
  
  toggleBtn.addEventListener('click', function() {
    filtersVisible = !filtersVisible;
    
    if (filtersVisible) {
      filtersContent.style.display = 'block';
      toggleText.textContent = 'Masquer';
    } else {
      filtersContent.style.display = 'none';
      toggleText.textContent = 'Afficher';
    }
  });
}
 */
 
 
/**
 * Ouvre le modal avec les détails d'inspection - Version simple qui réutilise le système dashboard
 */
async function openInspectionModal(item) {
  console.log(`Opening modal for ${item.name}`);
  
  if (!item.lastInspection) {
    alert(`Aucune inspection disponible pour ${item.name}`);
    return;
  }
  
  try {
    // Prepare inspection data in the exact same format as dashboard list
    const inspection = {
      id: item.lastInspection.id || `${item.id}_inspection`,
      type: item.type,
      ...item.lastInspection, // Include all inspection data
      inspector: item.lastInspection.inspector || item.lastInspection.inspector_name || 'Non spécifié',
      locationName: item.name,
      locationId: item.id,
      // Ensure we have the trail/shelter specific data
      length: item.length,
      difficulty: item.difficulty,
      capacity: item.capacity
    };
    
    // Format the date if needed
    if (inspection.date && inspection.date.toDate) {
      inspection.date = inspection.date.toDate();
    }
    
    // Generate modal content using same function as dashboard
    const modalContent = await generateModalContent(inspection);
    
    // Find or create modal
    let modal = document.getElementById('inspection-modal');
    if (!modal) {
      // Create modal if it doesn't exist
      modal = document.createElement('div');
      modal.id = 'inspection-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">Détails de l'inspection</h2>
            <button class="modal-close" id="close-modal">&times;</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="close-modal-btn">Fermer</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Add event listeners
      document.getElementById('close-modal').addEventListener('click', closeModal);
      document.getElementById('close-modal-btn').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
    
    // Update modal body
    document.getElementById('modal-body').innerHTML = modalContent;
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
  } catch (error) {
    console.error('Error opening modal:', error);
    alert('Erreur lors de l\'ouverture des détails');
  }
}

/**
 * Close the inspection modal
 */
function closeModal() {
  const modal = document.getElementById('inspection-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/**
 * Generate modal content HTML (same as dashboard)
 */
async function generateModalContent(inspection) {
  const formattedDate = inspection.date ? formatDateWithMonthName(inspection.date) : 'Non disponible';
  const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
  
  // Status badge
  const statusConfig = {
    'good': { class: 'status-good', text: '🟢 Bon état' },
    'warning': { class: 'status-warning', text: '🟠 Attention' },
    'critical': { class: 'status-critical', text: '🔴 Critique' },
    'not-inspected': { class: 'status-not-inspected', text: '⚪ Non inspecté' }
  };
  const status = statusConfig[inspection.condition] || statusConfig['not-inspected'];
  const statusBadge = `<span class="status-badge ${status.class}">${status.text}</span>`;
  
  let specificInfo = '';
  
  if (inspection.type === 'trail') {
    // Trail status badge
    const trailStatusConfig = {
      'open': { class: 'status-open', text: '🟢 Ouvert' },
      'closed': { class: 'status-closed', text: '🔴 Fermé' }
    };
    const trailStatus = trailStatusConfig[inspection.trail_status] || { class: 'status-unknown', text: '❓ Inconnu' };
    const trailStatusBadge = `<span class="status-badge ${trailStatus.class}">${trailStatus.text}</span>`;
    
    specificInfo = `
      <div class="detail-section">
        <h3>Informations du sentier</h3>
        <ul class="detail-list">
          <li class="detail-item">
            <span class="detail-label">Statut du sentier</span>
            <span class="detail-value">${trailStatusBadge}</span>
          </li>
          <li class="detail-item">
            <span class="detail-label">Longueur</span>
            <span class="detail-value">${inspection.length || 'Non spécifié'} km</span>
          </li>
          <li class="detail-item">
            <span class="detail-label">Difficulté</span>
            <span class="detail-value">${getDifficultyText(inspection.difficulty)}</span>
          </li>
          ${inspection.snow_condition ? `
          <li class="detail-item">
            <span class="detail-label">Conditions de neige</span>
            <span class="detail-value">${getSnowConditionText(inspection.snow_condition)}</span>
          </li>
          ` : ''}
        </ul>
      </div>
    `;
  } else {
    specificInfo = `
      <div class="detail-section">
        <h3>Informations de l'abri</h3>
        <ul class="detail-list">
          <li class="detail-item">
            <span class="detail-label">Capacité</span>
            <span class="detail-value">${inspection.capacity || 'Non spécifié'} personnes</span>
          </li>
          ${inspection.cleanliness ? `
          <li class="detail-item">
            <span class="detail-label">Propreté</span>
            <span class="detail-value">${inspection.cleanliness}</span>
          </li>
          ` : ''}
          ${inspection.accessibility ? `
          <li class="detail-item">
            <span class="detail-label">Accessibilité</span>
            <span class="detail-value">${inspection.accessibility}</span>
          </li>
          ` : ''}
        </ul>
      </div>
    `;
  }
  
  // Issues section
  let issuesHtml = '';
  if (inspection.issues && inspection.issues.length > 0) {
    issuesHtml = `
      <div class="detail-section">
        <h3>⚠️ Problèmes signalés</h3>
        <ul class="issues-list">
          ${inspection.issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  // Notes section
  let notesHtml = '';
  if (inspection.notes) {
    notesHtml = `
      <div class="detail-section">
        <h3>📝 Notes</h3>
        <p class="notes-content">${inspection.notes}</p>
      </div>
    `;
  }
  
  // Photos section
  let photosHtml = '';
  if (inspection.photos && inspection.photos.length > 0) {
    photosHtml = `
      <div class="detail-section">
        <h3>📷 Photos (${inspection.photos.length})</h3>
        <div class="photos-grid">
          ${inspection.photos.map(photo => `
            <div class="photo-item">
              <img src="${photo}" alt="Photo d'inspection" onclick="window.open('${photo}', '_blank')">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  return `
    <div class="inspection-details">
      <div class="detail-section">
        <h3>Informations générales</h3>
        <ul class="detail-list">
          <li class="detail-item">
            <span class="detail-label">Type</span>
            <span class="detail-value">${typeText}</span>
          </li>
          <li class="detail-item">
            <span class="detail-label">Lieu</span>
            <span class="detail-value">${inspection.locationName || 'Non spécifié'}</span>
          </li>
          <li class="detail-item">
            <span class="detail-label">Date d'inspection</span>
            <span class="detail-value">${formattedDate}</span>
          </li>
          <li class="detail-item">
            <span class="detail-label">Inspecteur</span>
            <span class="detail-value">${inspection.inspector}</span>
          </li>
          <li class="detail-item">
            <span class="detail-label">État général</span>
            <span class="detail-value">${statusBadge}</span>
          </li>
        </ul>
      </div>
      ${specificInfo}
      ${issuesHtml}
      ${notesHtml}
      ${photosHtml}
    </div>
  `;
}

/**
 * Update filter counter display
 */
function updateFilterCounter(count) {
  const filterCounter = document.getElementById('filter-counter');
  if (filterCounter) {
    filterCounter.textContent = `${count} élément${count !== 1 ? 's' : ''} affiché${count !== 1 ? 's' : ''}`;
  }
}

/**
 * Initialize filter controls
 */
function initFilterControls() {
  const statusFilter = document.getElementById('status-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const dateFilter = document.getElementById('date-filter');
  const issuesFilter = document.getElementById('issues-filter');
  const applyBtn = document.getElementById('apply-filters-btn');
  const resetBtn = document.getElementById('reset-filters-btn');
  
  if (!statusFilter || !typeFilter) {
    console.log('Filter elements not found - this is normal if not on main map page');
    return;
  }
  
  // Function to apply filters
  const applyFilters = () => {
    // Show loading indicator
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'flex';
    }
    
    // Update current filters
    currentFilters.status = statusFilter.value;
    currentFilters.type = typeFilter.value;
    currentFilters.difficulty = difficultyFilter.value;
    currentFilters.date = dateFilter.value;
    currentFilters.issues = issuesFilter.value;
    
    // Apply filters with a small delay for UI feedback
    setTimeout(() => {
      if (typeof filterAndDisplayMarkers === 'function') {
        filterAndDisplayMarkers();
      } else if (typeof displayFilteredMarkers === 'function') {
        displayFilteredMarkers();
      }
      
      // Hide loading indicator
      if (document.getElementById('map-loading')) {
        document.getElementById('map-loading').style.display = 'none';
      }
    }, 100);
  };
  
  // Add event listeners for auto-apply (existing functionality)
  statusFilter.addEventListener('change', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  difficultyFilter.addEventListener('change', applyFilters);
  dateFilter.addEventListener('change', applyFilters);
  issuesFilter.addEventListener('change', applyFilters);
  
  // Add event listener for manual apply button
  if (applyBtn) {
    applyBtn.addEventListener('click', applyFilters);
  }
  
  // Reset filters functionality
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Reset all filter values
      statusFilter.value = 'all';
      typeFilter.value = 'all';
      difficultyFilter.value = 'all';
      dateFilter.value = 'all';
      issuesFilter.value = 'all';
      
      // Apply the reset filters
      applyFilters();
    });
  }
  
  console.log('Filter controls initialized successfully');
}

/**
 * Initialize badge view toggle
 */
function initBadgeViewToggle() {
  const toggle = document.getElementById('badge-view-toggle');
  const detailedLegend = document.getElementById('detailed-legend');
  const simpleLegend = document.getElementById('simple-legend');
  
  console.log('Attempting to initialize badge toggle with elements:', {
    toggle: !!toggle,
    detailedLegend: !!detailedLegend,
    simpleLegend: !!simpleLegend
  });
  
  if (!toggle) {
    console.log('Badge view toggle not found - this is normal if not on main map page');
    return;
  }
  
  if (!detailedLegend || !simpleLegend) {
    console.warn('Legend elements not found for badge toggle');
    return;
  }
  
  // Add event listener
  toggle.addEventListener('change', function() {
    console.log('Badge toggle changed:', this.checked);
    
    if (this.checked) {
      // Simple view
      console.log('Switching to simple view');
      currentBadgeView = 'simple';
      detailedLegend.style.display = 'none';
      simpleLegend.style.display = 'block';
    } else {
      // Detailed view
      console.log('Switching to detailed view');
      currentBadgeView = 'detailed';
      detailedLegend.style.display = 'block';
      simpleLegend.style.display = 'none';
    }
    
    // Refresh markers with new badge style
    refreshMarkersWithCurrentView();
  });
  
  console.log('Badge view toggle initialized successfully');
}

/**
 * Refresh markers based on current view
 */
function refreshMarkersWithCurrentView() {
  console.log('Refreshing markers with view:', currentBadgeView);
  
  if (typeof displayFilteredMarkers === 'function') {
    displayFilteredMarkers();
  } else if (allTrails && allShelters) {
    // Fallback for simpler implementations
    displayTrailMarkers(allTrails);
    displayShelterMarkers(allShelters);
  } else {
    console.warn('No data available to refresh markers');
  }
}

/**
 * Handle toggle change event
 */
function handleToggleChange(event) {
  console.log('Toggle changed:', event.target.checked);
  
  const toggle = event.target;
  const detailedLegend = document.getElementById('detailed-legend');
  const simpleLegend = document.getElementById('simple-legend');
  
  if (toggle.checked) {
    // Simple view
    console.log('Switching to simple view');
    currentBadgeView = 'simple';
    detailedLegend.style.display = 'none';
    simpleLegend.style.display = 'block';
  } else {
    // Detailed view
    console.log('Switching to detailed view');
    currentBadgeView = 'detailed';
    detailedLegend.style.display = 'block';
    simpleLegend.style.display = 'none';
  }
  
  // Refresh markers with new badge style
  refreshMarkersWithCurrentView();
}

/**
 * Get marker class based on current badge view and item data
 */
/**
 * Get marker class based on current badge view and item data
 */
function getMarkerClass(item, itemType) {
  if (currentBadgeView === 'simple') {
    // Simple view: only show trails with open/closed status
    if (itemType === 'trail') {
      const trailStatus = (item.lastInspection && item.lastInspection.trail_status) || 'unknown';
      console.log(`Trail "${item.name}" status: ${trailStatus}`);
      return `map-marker map-marker-simple-${trailStatus}`;
    } else {
      // Shelters are hidden in simple view
      return `map-marker map-marker-shelter map-marker-hidden`;
    }
  } else {
    // Detailed view: use existing status-based classes for both trails and shelters
    if (itemType === 'shelter') {
      // FIXED: Shelters should use their condition status (good/warning/critical)
      return `map-marker map-marker-shelter map-marker-${item.status}`;
    } else {
      // Trails use their condition status (good/warning/critical) 
      return `map-marker map-marker-${item.status}`;
    }
  }
}

// Initialize when DOM is ready - using a different approach to avoid conflicts
function initializeMapToggle() {
  // Wait a bit to ensure all elements are loaded
  setTimeout(() => {
    console.log('Attempting to initialize badge toggle...');
    initBadgeViewToggle();
  }, 100);
}

// Also try to initialize when the page is fully loaded
window.addEventListener('load', function() {
  console.log('Window loaded - checking toggle initialization...');
  const toggle = document.getElementById('badge-view-toggle');
  if (toggle && !toggle.hasAttribute('data-initialized')) {
    console.log('Toggle not initialized yet, initializing now...');
    initBadgeViewToggle();
    toggle.setAttribute('data-initialized', 'true');
  }
});

// Test function to manually initialize (for debugging)
window.testToggleInit = function() {
  console.log('Manual toggle initialization test...');
  initBadgeViewToggle();
};

// Consolidated DOM Content Loaded listener
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map: DOM Content Loaded - initializing all controls');
  
  // Initialize filter controls if the function exists
  if (typeof initFilterControls === 'function') {
    console.log('Initializing filter controls...');
    initFilterControls();
  }
  
  // Initialize badge view toggle if the function exists
  if (typeof initBadgeViewToggle === 'function') {
    console.log('Initializing badge view toggle...');
    initBadgeViewToggle();
  }
  
  // Check if we're on a page that needs map functionality
  const mapContainer = document.querySelector('.map-bg');
  if (mapContainer) {
    console.log('Map container found - map functionality available');
  }
  
  // Note: loadMapData will be called after authentication
  // in auth.js via checkAuthStatus - this is correct
  
  // Optional: setup real-time listeners (uncomment if needed)
  // if (typeof setupRealtimeListeners === 'function') {
  //   setupRealtimeListeners();
  // }
});

function forceToggleClickability() {
    console.log('🔧 Forcing toggle clickability...');
    
    const toggle = document.getElementById('badge-view-toggle');
    const toggleSwitch = document.querySelector('.toggle-switch');
    const slider = document.querySelector('.toggle-slider');
    const section = document.querySelector('.badge-toggle-section');
    
    if (!toggle) {
        console.log('❌ Toggle not found');
        return;
    }
    
    // Method 1: Direct input click handler
    toggle.addEventListener('click', function(e) {
        console.log('🖱️ Toggle input clicked directly!');
        // Let the default behavior happen
    });
    
    // Method 2: Slider click handler
    if (slider) {
        slider.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Slider clicked - forcing toggle!');
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    
    // Method 3: Toggle switch container click
    if (toggleSwitch) {
        toggleSwitch.addEventListener('click', function(e) {
            console.log('🖱️ Toggle switch container clicked!');
            if (e.target === this || e.target === slider) {
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
    
    // Method 4: Section click (last resort)
    if (section) {
        section.addEventListener('click', function(e) {
            // Only if clicking directly on the section or toggle area
            if (e.target === this || 
                e.target.classList.contains('toggle-slider') ||
                e.target.classList.contains('badge-toggle-label')) {
                console.log('🖱️ Section clicked - toggling!');
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
    
    // Debug click detection
    document.addEventListener('click', function(e) {
        if (e.target.closest('.badge-toggle-section')) {
            console.log('🎯 Click detected in toggle area:', {
                target: e.target.tagName + (e.target.className ? '.' + e.target.className : ''),
                coordinates: { x: e.clientX, y: e.clientY }
            });
        }
    });
    
    console.log('✅ Multiple click handlers added');
}

// Initialize click fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(forceToggleClickability, 500);
    });
} else {
    setTimeout(forceToggleClickability, 500);
}

// Manual test function
window.forceClickTest = function() {
    forceToggleClickability();
    console.log('Force click test applied. Try clicking the toggle now.');
};