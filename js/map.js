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
      lastInspection = {
        id: inspectionDoc.id,
        ...inspectionDoc.data()
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
      lastInspection = {
        id: inspectionDoc.id,
        ...inspectionDoc.data()
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

/**
 * Affiche les marqueurs des sentiers sur la carte
 * @param {Array} trails - Sentiers avec leur statut
 */
function displayTrailMarkers(trails) {
  // Sélectionner le conteneur de la carte
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
    // Créer l'élément du marqueur
    const marker = document.createElement('div');
    marker.className = `map-marker map-marker-${trail.status}`;
    marker.textContent = trail.id.replace('trail_', '');
    marker.setAttribute('data-id', trail.id);
//    marker.setAttribute('title', trail.name);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    if (trail.coordinates) {
      marker.style.top = `${trail.coordinates.top}px`;
      marker.style.left = `${trail.coordinates.left}px`;
    } else {
      console.warn(`Coordonnées manquantes pour le sentier ${trail.id}`);
      return; // Sauter ce marqueur
    }
    
    // Ajouter un gestionnaire d'événement pour afficher les détails
	marker.addEventListener('click', async () => {
	  try {
		await openInspectionModal(trail);
	  } catch (error) {
		console.error('Error opening modal:', error);
		alert('Erreur lors de l\'ouverture des détails');
	  }
	});
    
	
    // Préparer le texte du tooltip avec la date de dernière inspection
    let tooltipText = trail.name;
    
    // Ajouter la date de dernière inspection si disponible
    if (trail.lastInspection && trail.lastInspection.date) {
      const date = trail.lastInspection.date.toDate();
//      const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      const formattedDate = formatDateWithMonthName(date);
      tooltipText += `\n${formattedDate}`;
    }
    
    // MODIFICATION: Vérifier s'il y a des problèmes signalés dans la dernière inspection
    if (trail.lastInspection && trail.lastInspection.issues && trail.lastInspection.issues.length > 0) {
      // Ajouter les problèmes au tooltip
      tooltipText += `\nProblèmes:\n- ${trail.lastInspection.issues.join('\n- ')}`;
      
      // Ajouter l'indicateur de problème
      const problemIndicator = document.createElement('div');
      problemIndicator.className = 'problem-indicator';
      
      // Adapter le style selon la gravité
      if (trail.status === 'critical') {
        problemIndicator.innerHTML = '⚠️'; // Emoji d'avertissement
        problemIndicator.style.color = '#ef4444'; // Rouge
      } else if (trail.status === 'warning') {
        problemIndicator.innerHTML = '⚠'; // Emoji d'avertissement simple
        problemIndicator.style.color = '#ef4444'; // Rouge
      } else {
        // Même pour les sentiers en bon état, montrer un indicateur si des problèmes sont signalés
        problemIndicator.innerHTML = 'ℹ️'; // Emoji d'information
        problemIndicator.style.color = '#ef4444'; // Rouge
      }

      marker.appendChild(problemIndicator);
      
//      // Ajouter un tooltip avec les problèmes si disponibles
//      if (trail.lastInspection && trail.lastInspection.issues && trail.lastInspection.issues.length > 0) {
//        const issues = trail.lastInspection.issues.join('\n- ');
//        marker.setAttribute('title', `${trail.name}\nProblèmes:\n- ${issues}`);
//      }
    }
    
    // Définir le tooltip complet
    marker.setAttribute('title', tooltipText);

	
    // Ajouter le marqueur à la carte
    mapContainer.appendChild(marker);
  });
}

/**
 * Affiche les marqueurs des abris sur la carte
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
    marker.className = `map-marker map-marker-${shelter.status}`;
    marker.innerHTML = `<span>A` + shelter.id.replace('shelter_', '') + '</span>';
    marker.setAttribute('data-id', shelter.id);
//    marker.setAttribute('title', shelter.name);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    if (shelter.coordinates) {
      marker.style.top = `${shelter.coordinates.top}px`;
      marker.style.left = `${shelter.coordinates.left}px`;
    } else {
      console.warn(`Coordonnées manquantes pour l'abri ${shelter.id}`);
      return; // Sauter ce marqueur
    }
    
    // Ajouter un gestionnaire d'événement pour afficher les détails
	marker.addEventListener('click', async () => {
	  try {
		await openInspectionModal(shelter);
	  } catch (error) {
		console.error('Error opening modal:', error);
		alert('Erreur lors de l\'ouverture des détails');
	  }
	});
    



    // Préparer le texte du tooltip avec la date de dernière inspection
    let tooltipText = shelter.name;
    
    // Ajouter la date de dernière inspection si disponible
    if (shelter.lastInspection && shelter.lastInspection.date) {
      const date = shelter.lastInspection.date.toDate();
//	  const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
	  const formattedDate = formatDateWithMonthName(date);
      tooltipText += `\n${formattedDate}`;
    }
	
    // MODIFICATION: Vérifier s'il y a des problèmes signalés dans la dernière inspection
    if (shelter.lastInspection && shelter.lastInspection.issues && shelter.lastInspection.issues.length > 0) {
      // Ajouter les problèmes au tooltip
      tooltipText += `\nProblèmes:\n- ${shelter.lastInspection.issues.join('\n- ')}`;
      
      // Ajouter l'indicateur de problème
      const problemIndicator = document.createElement('div');
      problemIndicator.className = 'problem-indicator';
	  
      
      // Adapter le style selon la gravité
      if (shelter.status === 'critical') {
        problemIndicator.innerHTML = '⚠️'; // Emoji d'avertissement
        problemIndicator.style.color = '#ef4444'; // Rouge
      } else if (shelter.status === 'warning') {
        problemIndicator.innerHTML = '⚠'; // Emoji d'avertissement simple
        problemIndicator.style.color = '#ef4444'; // Rouge
      } else {
        // Même pour les sentiers en bon état, montrer un indicateur si des problèmes sont signalés
        problemIndicator.innerHTML = 'ℹ️'; // Emoji d'information
        problemIndicator.style.color = '#ef4444'; // Rouge
      }
      
      
//      marker.style.position = 'relative'; // S'assurer que le positionnement relatif fonctionne
      marker.appendChild(problemIndicator);
      
//      // Ajouter un tooltip avec les problèmes si disponibles
//      if (shelter.lastInspection && shelter.lastInspection.issues && shelter.lastInspection.issues.length > 0) {
//        const issues = shelter.lastInspection.issues.join('\n- ');
//        marker.setAttribute('title', `${shelter.name}\nProblèmes:\n- ${issues}`);
//      }
    }

    // Définir le tooltip complet
    marker.setAttribute('title', tooltipText);


    // Ajouter le marqueur à la carte
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
 * Update dashboard statistics
 */
function updateDashboardStats(trails, shelters) {
  console.log("Updating dashboard stats...");
  
  // Calculate today's inspections
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let todayInspections = 0;
  let totalGood = 0;
  let totalWarning = 0;
  let totalCritical = 0;
  
  // Count trail inspections
  trails.forEach(trail => {
    if (trail.lastInspection && trail.lastInspection.date) {
      const inspectionDate = trail.lastInspection.date.toDate();
      inspectionDate.setHours(0, 0, 0, 0);
      
      if (inspectionDate.getTime() === today.getTime()) {
        todayInspections++;
      }
    }
    
    // Count by status
    if (trail.status === 'good') totalGood++;
    else if (trail.status === 'warning') totalWarning++;
    else if (trail.status === 'critical') totalCritical++;
  });
  
  // Count shelter inspections
  shelters.forEach(shelter => {
    if (shelter.lastInspection && shelter.lastInspection.date) {
      const inspectionDate = shelter.lastInspection.date.toDate();
      inspectionDate.setHours(0, 0, 0, 0);
      
      if (inspectionDate.getTime() === today.getTime()) {
        todayInspections++;
      }
    }
    
    // Count by status
    if (shelter.status === 'good') totalGood++;
    else if (shelter.status === 'warning') totalWarning++;
    else if (shelter.status === 'critical') totalCritical++;
  });
  
  // Update DOM elements if they exist
  const todayElement = document.getElementById('inspections-today');
  if (todayElement) {
    todayElement.textContent = todayInspections;
  }
  
  const goodElement = document.getElementById('inspections-good');
  if (goodElement) {
    goodElement.textContent = totalGood;
  }
  
  const warningElement = document.getElementById('inspections-warning');
  if (warningElement) {
    warningElement.textContent = totalWarning;
  }
  
  const criticalElement = document.getElementById('inspections-critical');
  if (criticalElement) {
    criticalElement.textContent = totalCritical;
  }
  
  console.log("Stats updated:", { todayInspections, totalGood, totalWarning, totalCritical });
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

// Initialisation lors du chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  // La fonction loadMapData sera appelée après l'authentification
  // dans auth.js via checkAuthStatus
  
  // Pour les mises à jour en temps réel (optionnel)
  // Décommentez la ligne suivante pour activer
  // setupRealtimeListeners();
});


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
  // Initialize toggle functionality
  initMapFilterToggle();
  
  // Get filter elements
  const statusFilter = document.getElementById('status-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const dateFilter = document.getElementById('date-filter');
  const issuesFilter = document.getElementById('issues-filter');
  const resetBtn = document.getElementById('reset-filters');
  const applyBtn = document.getElementById('apply-map-filters');
  
  // Check if elements exist
  if (!statusFilter || !typeFilter || !difficultyFilter || !dateFilter || !issuesFilter) {
    console.warn("Some filter controls were not found");
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
      filterAndDisplayMarkers();
      
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
 */
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

  function scrollToInspectionSection() {
	  // Find the "Inspection sélectionnée" section
	  const cardTitles = document.querySelectorAll('.card-title');
	  let inspectionSection = null;
	  
	  // Look for the card with title "Inspection sélectionnée"
	  for (const title of cardTitles) {
		if (title.textContent.includes('Inspection sélectionnée')) {
		  inspectionSection = title.closest('.content-section');
		  break;
		}
	  }
	  
	  // If found, scroll to it smoothly
	  if (inspectionSection) {
		setTimeout(() => {
		  inspectionSection.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		  });
		}, 200); // Small delay to ensure content is updated
	  }
  }

// Initialisation lors du chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les contrôles de filtrage
  initFilterControls();
  
  // La fonction loadMapData sera appelée après l'authentification
  // dans auth.js via checkAuthStatus
});


/**
 * Ouvre le modal avec les détails d'inspection
 */
async function openInspectionModal(item) {
  console.log(`Opening modal for ${item.name}`);
  
  if (!item.lastInspection) {
    alert(`Aucune inspection disponible pour ${item.name}`);
    return;
  }
  
  // Make sure the modal exists
  let modal = document.getElementById('inspection-modal');
  if (!modal) {
    console.log("Creating modal...");
    createModalHTML();
    modal = document.getElementById('inspection-modal');
  }
  
  try {
    const inspection = {
      id: item.lastInspection.id || `${item.id}_inspection`,
      locationName: item.name,
      type: item.type,
      date: item.lastInspection.date,
      inspector: item.lastInspection.inspector || 'Inspecteur inconnu',
      condition: item.status || 'non-specifie',
      issues: item.lastInspection.issues || [],
      notes: item.lastInspection.notes || '',
      photos: item.lastInspection.photos || [],
      trail_status: item.lastInspection.trail_status || null,
      length: item.lastInspection.length || item.length || null,
      difficulty: item.lastInspection.difficulty || item.difficulty || null,
      snow_condition: item.lastInspection.snow_condition || null,
      cleanliness: item.lastInspection.cleanliness || null,
      accessibility: item.lastInspection.accessibility || null,
      capacity: item.lastInspection.capacity || item.capacity || null
    };
    
    // Check if generateModalContent exists
    if (typeof generateModalContent === 'function') {
      const modalContent = await generateModalContent(inspection);
      const modalBody = document.getElementById('modal-content');
      if (modalBody) {
        modalBody.innerHTML = modalContent;
      }
      
      // Check if showModal exists
      if (typeof showModal === 'function') {
        showModal();
      } else {
        modal.style.display = 'flex';
      }
    } else {
      console.error('generateModalContent function not found');
      alert('Erreur: fonction de génération de contenu manquante');
    }
    
  } catch (error) {
    console.error('Error opening modal:', error);
    alert('Erreur lors du chargement des détails d\'inspection');
  }
}


/**
 * Create modal HTML if it doesn't exist
 */
function createModalHTML() {
  const modalHTML = `
    <div class="modal" id="inspection-modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Détails de l'inspection</h2>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        
        <div class="modal-body" id="modal-content">
          <!-- Content will be loaded dynamically -->
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Fermer</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}