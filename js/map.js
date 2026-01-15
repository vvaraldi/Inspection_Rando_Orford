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
// QUICK STATUS TOGGLE FEATURE (Right-click for admin users in status view)
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
    // Not in status view - don't prevent default context menu
    return;
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

// ============================================================================
// BULK STATUS TOGGLE FEATURE (Admin only - Close/Open all trails at once)
// ============================================================================

/**
 * Initialize bulk status buttons (admin only, status view only)
 * Should be called after authentication is confirmed
 */
function initBulkStatusButtons() {
  const bulkButtonsContainer = document.getElementById('bulk-status-buttons');
  const closeAllBtn = document.getElementById('close-all-trails-btn');
  const openAllBtn = document.getElementById('open-all-trails-btn');
  
  if (!bulkButtonsContainer || !closeAllBtn || !openAllBtn) {
    console.log('Bulk status buttons not found - this is normal if not on main map page');
    return;
  }
  
  // Check if user is admin
  if (typeof isAdmin !== 'function' || !isAdmin()) {
    console.log('Bulk status buttons: User is not admin, hiding buttons');
    bulkButtonsContainer.style.display = 'none';
    return;
  }
  
  // Show buttons for admin users (only if in simple/status view)
  if (currentBadgeView === 'simple') {
    bulkButtonsContainer.style.display = 'block';
  }
  console.log('Bulk status buttons initialized for admin user');
  
  // Bind click events
  closeAllBtn.addEventListener('click', () => handleBulkStatusToggle('closed'));
  openAllBtn.addEventListener('click', () => handleBulkStatusToggle('open'));
}

/**
 * Handle bulk status toggle for all trails
 * @param {string} newStatus - 'open' or 'closed'
 */
async function handleBulkStatusToggle(newStatus) {
  // Double-check admin status
  if (typeof isAdmin !== 'function' || !isAdmin()) {
    console.log('Bulk status toggle: User is not admin');
    alert('Accès refusé - Droits administrateur requis');
    return;
  }
  
  // Check if we're in simple/status view mode
  if (currentBadgeView !== 'simple') {
    alert('Cette action est uniquement disponible en mode Status.');
    return;
  }
  
  // Build confirmation message
  const statusLabel = newStatus === 'open' ? '🟢 OUVERTS' : '🔴 FERMÉS';
  const actionVerb = newStatus === 'open' ? 'OUVRIR' : 'FERMER';
  const frenchComment = newStatus === 'open' 
    ? 'Ouverture de toutes les pistes en une seule fois pour réinitialiser la montagne'
    : 'Fermeture de toutes les pistes en une seule fois pour réinitialiser la montagne';
  
  const trailCount = allTrails ? allTrails.length : 0;
  
  const confirmMessage = `⚠️ Action groupée - ${actionVerb} TOUS LES SENTIERS\n\n` +
    `Cette action va changer le statut de ${trailCount} sentier(s) à ${statusLabel}.\n\n` +
    `Un rapport d'inspection sera créé pour chaque sentier avec le commentaire:\n` +
    `"${frenchComment}"\n\n` +
    `Êtes-vous sûr de vouloir continuer?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // Show loading indicator
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'flex';
    }
    
    // Process all trails
    const results = await processBulkStatusChange(newStatus, frenchComment);
    
    // Reload map data to refresh markers
    await loadMapData();
    
    // Show success message
    const successMessage = `✅ Opération terminée!\n\n` +
      `${results.success} sentier(s) mis à jour avec succès.\n` +
      (results.errors > 0 ? `${results.errors} erreur(s) rencontrée(s).` : '');
    
    alert(successMessage);
    
    console.log(`Bulk status toggle completed: ${results.success} success, ${results.errors} errors`);
    
  } catch (error) {
    console.error('Error in bulk status toggle:', error);
    alert('Erreur lors du changement de statut groupé: ' + error.message);
  } finally {
    // Hide loading indicator
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'none';
    }
  }
}

/**
 * Process bulk status change for all trails
 * @param {string} newStatus - 'open' or 'closed'
 * @param {string} comment - French comment for the inspection report
 * @returns {Object} - { success: number, errors: number }
 */
async function processBulkStatusChange(newStatus, comment) {
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
  
  let successCount = 0;
  let errorCount = 0;
  
  // Process each trail
  for (const trail of allTrails) {
    try {
      await saveBulkTrailInspection(trail, newStatus, comment, user, userData);
      successCount++;
    } catch (error) {
      console.error(`Error updating trail ${trail.id}:`, error);
      errorCount++;
    }
  }
  
  return { success: successCount, errors: errorCount };
}

/**
 * Save a bulk inspection report for a single trail
 * @param {Object} trail - The trail object
 * @param {string} newStatus - The new status ('open' or 'closed')
 * @param {string} comment - The French comment
 * @param {Object} user - Firebase user object
 * @param {Object} userData - User data from inspectors collection
 */
async function saveBulkTrailInspection(trail, newStatus, comment, user, userData) {
  // Prepare the inspection data
  const now = new Date();
  
  // Preserve last inspection data if available, or use defaults
  const lastInspection = trail.lastInspection || {};
  
  // Create inspection data - preserve existing condition data
  const inspectionData = {
    trail_id: trail.id,
    inspector_id: user.uid,
    inspector_name: userData.name || 'Admin',
    date: firebase.firestore.Timestamp.fromDate(now),
    trail_status: newStatus,
    condition: lastInspection.condition || 'good',
    snow_condition: lastInspection.snow_condition || null,
    issues: lastInspection.issues || [],
    notes: comment,
    photos: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    isBulkToggle: true // Flag to identify bulk toggle inspections
  };
  
  // Use batch to save inspection and update trail
  const batch = db.batch();
  
  const inspectionRef = db.collection('trail_inspections').doc();
  batch.set(inspectionRef, inspectionData);
  
  const trailRef = db.collection('trails').doc(trail.id);
  batch.update(trailRef, {
    status: newStatus,
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
    lastInspectionId: inspectionRef.id
  });
  
  await batch.commit();
  console.log(`Bulk trail inspection saved for ${trail.name}: ${inspectionRef.id}`);
}

/**
 * Update visibility of bulk status buttons based on current view
 * Called when badge view toggle changes
 */
function updateBulkButtonsVisibility() {
  const bulkButtonsContainer = document.getElementById('bulk-status-buttons');
  if (!bulkButtonsContainer) return;
  
  // Only show in simple/status view AND if user is admin
  if (currentBadgeView === 'simple' && typeof isAdmin === 'function' && isAdmin()) {
    bulkButtonsContainer.style.display = 'block';
  } else {
    bulkButtonsContainer.style.display = 'none';
  }
}

// ============================================================================
// END BULK STATUS TOGGLE FEATURE
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
    
    // Event listeners (unchanged)
    marker.addEventListener('click', async () => {
      try {
        await openInspectionModal(trail);
      } catch (error) {
        console.error('Error opening modal:', error);
        alert('Erreur lors de l\'ouverture des détails');
      }
    });
    
    // NEW: Right-click for quick status toggle (admin only, status view only)
    marker.addEventListener('contextmenu', (e) => handleQuickStatusToggle(e, trail, 'trail'));
    
    // UPDATED: Dynamic tooltip based on current view
    let tooltipText = trail.name;
    
    if (currentBadgeView === 'simple') {
      // Simple view tooltip: show trail status (check lastInspection first)
      const trailStatus = (trail.lastInspection && trail.lastInspection.trail_status) || trail.trail_status || trail.trailStatus || 'unknown';
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
    
    // Event listeners (unchanged)
    marker.addEventListener('click', async () => {
      try {
        await openInspectionModal(shelter);
      } catch (error) {
        console.error('Error opening modal:', error);
        alert('Erreur lors de l\'ouverture des détails');
      }
    });
    
    // NEW: Right-click for quick status toggle (admin only, status view only)
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
  
  // FIXED: Declare overallStatus in proper scope
  let overallStatus = 'Bon';
  if (stats.critical > 0) {
    overallStatus = 'Critique';
  } else if (stats.warning > 0) {
    overallStatus = 'À surveiller';
  }
  
  // Calculate issues count
  const issuesCount = stats.warning + stats.critical;
  
  // Mettre à jour les éléments du tableau de bord
  
  // 1. Inspections aujourd'hui
  const todayElement = document.getElementById('inspections-today');
  if (todayElement) {
    todayElement.textContent = `${stats.inspectedToday}/${stats.total}`;
    console.log("Updated inspections-today:", `${stats.inspectedToday}/${stats.total}`);
  }
  
  // 2. État général du domaine
  const statusElement = document.getElementById('overall-status');
  if (statusElement) {
    statusElement.textContent = overallStatus;
    console.log("Updated overall-status:", overallStatus);
  }
  
  // 3. Problèmes signalés (warning + critical)
  const issuesElement = document.getElementById('reported-issues');
  if (issuesElement) {
    issuesElement.textContent = issuesCount;
    console.log("Updated reported-issues:", issuesCount);
  }
  
  // 4. Heure de dernière mise à jour
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  const updateElement = document.getElementById('last-update');
  if (updateElement) {
    updateElement.textContent = `${hours}:${minutes}`;
    console.log("Updated last-update:", `${hours}:${minutes}`);
  }
  
  // 5. Individual status counts
  const goodElement = document.getElementById('good-status');
  if (goodElement) {
    goodElement.textContent = stats.good;
  }

  const warningElement = document.getElementById('warning-status');
  if (warningElement) {
    warningElement.textContent = stats.warning;
  }

  const criticalElement = document.getElementById('critical-status');
  if (criticalElement) {
    criticalElement.textContent = stats.critical;
  }

  // FIXED: Move console.log inside function scope where all variables are defined
  console.log("Stats summary:", {
    total: stats.total,
    inspectedToday: stats.inspectedToday,
    good: stats.good,
    warning: stats.warning,
    critical: stats.critical,
    notInspected: stats.notInspected,
    overallStatus: overallStatus,
    issuesCount: issuesCount
  });
}

/**
 * Configure des écouteurs en temps réel pour les mises à jour automatiques
 */
function setupRealtimeListeners() {
  // Écouteur pour les inspections de sentiers
  db.collection('trail_inspections')
    .orderBy('date', 'desc')
    .limit(1)
    .onSnapshot(snapshot => {
      if (!snapshot.empty) {
        console.log("Nouvelles données d'inspection de sentiers détectées");
        loadMapData();
      }
    }, error => {
      console.error("Erreur dans l'écouteur d'inspections de sentiers:", error);
    });
  
  // Écouteur pour les inspections d'abris
  db.collection('shelter_inspections')
    .orderBy('date', 'desc')
    .limit(1)
    .onSnapshot(snapshot => {
      if (!snapshot.empty) {
        console.log("Nouvelles données d'inspection d'abris détectées");
        loadMapData();
      }
    }, error => {
      console.error("Erreur dans l'écouteur d'inspections d'abris:", error);
    });
}

/**
 * Convertit les codes de statut en texte lisible
 * @param {string} status - Code de statut ('good', 'warning', etc.)
 * @returns {string} - Texte correspondant au statut
 */
function getStatusText(status) {
  switch (status) {
    case 'good': return 'Bon';
    case 'warning': return 'Attention';
    case 'critical': return 'Critique';
    default: return 'Non inspecté';
  }
}

/**
 * Convertit les codes de difficulté en texte lisible
 * @param {string} difficulty - Code de difficulté ('easy', 'medium', etc.)
 * @returns {string} - Texte correspondant à la difficulté
 */
function getDifficultyText(difficulty) {
  switch (difficulty) {
    case 'easy': return 'Facile';
    case 'medium': return 'Intermédiaire';
    case 'hard': return 'Difficile';
    default: return difficulty;
  }
}

// ajout pour les filtres
// ajout pour les filtres
// ajout pour les filtres

// Variables pour stocker les données et les filtres
let allTrails = [];
let allShelters = [];

let currentFilters = {
  status: 'all',
  type: 'all',
  difficulty: 'all',
  date: 'all',
  issues: 'all'
};

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
    
    // Stocker les données complètes
    allTrails = trailsWithStatus;
    allShelters = sheltersWithStatus;
    
    // Masquer l'indicateur de chargement
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'none';
    }
    
    // Afficher les marqueurs sur la carte (avec filtres)
    displayFilteredMarkers();
    
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
    } else if (currentFilters.date !== 'all' && !trail.lastInspection) {
      // S'il n'y a pas d'inspection et qu'un filtre de date est actif, ne pas afficher
      return false;
    }

    // NOUVEAU: Filtre par problèmes
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
    // Filtre par statut
    if (currentFilters.status !== 'all' && shelter.status !== currentFilters.status) {
      return false;
    }
    
    // Filtre par type (toujours true pour les abris si type=all ou type=shelter)
    if (currentFilters.type !== 'all' && currentFilters.type !== 'shelter') {
      return false;
    }
    
    // Les abris n'ont pas de difficulté, donc on les affiche toujours 
    // sauf si un filtre de difficulté est actif
    if (currentFilters.difficulty !== 'all') {
      return false;
    }
    
      // Filtre par date d'inspection
    if (currentFilters.date !== 'all' && shelter.lastInspection) {
      const inspectionDate = shelter.lastInspection.date.toDate();
      
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
    } else if (currentFilters.date !== 'all' && !shelter.lastInspection) {
      // S'il n'y a pas d'inspection et qu'un filtre de date est actif, ne pas afficher
      return false;
    }
    
    // NOUVEAU: Filtre par problèmes
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
  
  // Afficher les marqueurs filtrés
  displayTrailMarkers(filteredTrails);
  displayShelterMarkers(filteredShelters);
  
  // Mettre à jour le compteur d'éléments affichés si un tel élément existe
  const filterCounter = document.getElementById('filter-counter');
  if (filterCounter) {
    updateFilterCounter(filteredTrails.length + filteredShelters.length);
	// filterCounter.textContent = `${filteredTrails.length + filteredShelters.length} éléments affichés`;
  }
}

/**
 * Initialiser les contrôles de filtrage
 */
function initFilterControls() {
  console.log('Initializing filter controls...');
  
  // REMOVED: initMapFilterToggle() - those elements don't exist in your HTML
  // We only need the badge toggle, not the map filter toggle
  
  // Get filter elements
  const statusFilter = document.getElementById('status-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const dateFilter = document.getElementById('date-filter');
  const issuesFilter = document.getElementById('issues-filter');
  const resetBtn = document.getElementById('reset-filters');
  const applyBtn = document.getElementById('apply-map-filters');
  
  // Check if elements exist (these are optional - they exist in some pages but not others)
  if (!statusFilter || !typeFilter || !difficultyFilter || !dateFilter || !issuesFilter) {
    console.log("Some filter controls were not found - this is normal if not on dashboard page");
    return;
  }
  
  console.log('Filter elements found, setting up event listeners...');
  
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
 * Update the filter counter display with better styling
 */
function updateFilterCounter(count) {
  const filterCounter = document.getElementById('filter-counter');
  if (filterCounter) {
    filterCounter.textContent = `${count} élément${count !== 1 ? 's' : ''} affiché${count !== 1 ? 's' : ''}`;
  }
}

/**
 * Update the existing filterAndDisplayMarkers function to use new counter
 */
function filterAndDisplayMarkers() {
  if (!allTrails || !allShelters) {
    console.warn('Data not loaded yet');
    return;
  }
  
  // Filter trails
  const filteredTrails = allTrails.filter(trail => {
    // Date filter
    if (currentFilters.date !== 'all') {
      if (!trail.lastInspection) {
        return currentFilters.date === 'not-inspected';
      }
      
      const inspectionDate = trail.lastInspection.date.toDate();
      const now = new Date();
      
      switch (currentFilters.date) {
        case 'today':
          if (!isSameDay(inspectionDate, now)) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (inspectionDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (inspectionDate < monthAgo) return false;
          break;
      }
    }
    
    // Status filter
    if (currentFilters.status !== 'all') {
      const status = trail.lastInspection ? trail.lastInspection.condition : 'not-inspected';
      if (status !== currentFilters.status) return false;
    }
    
    // Type filter
    if (currentFilters.type !== 'all' && currentFilters.type !== 'trail') {
      return false;
    }
    
    // Difficulty filter
    if (currentFilters.difficulty !== 'all' && trail.difficulty !== currentFilters.difficulty) {
      return false;
    }
    
    // Issues filter
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
  
  // Filter shelters
  const filteredShelters = allShelters.filter(shelter => {
    // Date filter
    if (currentFilters.date !== 'all') {
      if (!shelter.lastInspection) {
        return currentFilters.date === 'not-inspected';
      }
      
      const inspectionDate = shelter.lastInspection.date.toDate();
      const now = new Date();
      
      switch (currentFilters.date) {
        case 'today':
          if (!isSameDay(inspectionDate, now)) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (inspectionDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (inspectionDate < monthAgo) return false;
          break;
      }
    }
    
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
      // Ensure we have the trail/shelter reference data
      length: item.lastInspection.length || item.length,
      difficulty: item.lastInspection.difficulty || item.difficulty,
      capacity: item.lastInspection.capacity || item.capacity
    };
    
    // Call the same function that the list uses
    await viewInspectionDetails(inspection.id);
    
    // If viewInspectionDetails doesn't work because inspection isn't in allInspectionsData,
    // temporarily add it
    if (typeof allInspectionsData !== 'undefined') {
      const existingIndex = allInspectionsData.findIndex(i => i.id === inspection.id);
      if (existingIndex === -1) {
        allInspectionsData.push(inspection);
      }
      await viewInspectionDetails(inspection.id);
    }
    
  } catch (error) {
    console.error('Error opening modal:', error);
    alert('Erreur lors du chargement des détails d\'inspection');
  }
}


// Global variable to track current badge view
let currentBadgeView = 'detailed'; // 'detailed' or 'simple'

/**
 * Initialize badge view toggle functionality
 */
function initBadgeViewToggle() {
  console.log('Initializing badge view toggle...');
  
  const toggle = document.getElementById('badge-view-toggle');
  const detailedLegend = document.getElementById('detailed-legend');
  const simpleLegend = document.getElementById('simple-legend');
  
  console.log('Badge toggle elements:', {
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
    
    // Update bulk buttons visibility (admin only feature)
    updateBulkButtonsVisibility();
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
  
  // Initialize bulk status buttons (admin only, delayed to ensure auth state is ready)
  setTimeout(() => {
    if (typeof initBulkStatusButtons === 'function') {
      console.log('Initializing bulk status buttons...');
      initBulkStatusButtons();
    }
  }, 500);
  
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