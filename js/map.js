// Référence à Firestore - supposée être déjà initialisée dans auth.js
//const db = firebase.firestore();

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
  document.querySelectorAll('.trail-marker').forEach(marker => {
    marker.remove();
  });
  
  // Supprimer tous les marqueurs d'abris
  document.querySelectorAll('.shelter-marker').forEach(marker => {
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
  document.querySelectorAll('.trail-marker:not(.shelter-marker)').forEach(marker => {
    marker.remove();
  });
  
  // Créer et ajouter les nouveaux marqueurs
  trails.forEach(trail => {
    // Créer l'élément du marqueur
    const marker = document.createElement('div');
    marker.className = `trail-marker marker-${trail.status}`;
    marker.textContent = trail.id.replace('trail_', '');
    marker.setAttribute('data-id', trail.id);
    marker.setAttribute('title', trail.name);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    if (trail.coordinates) {
      marker.style.top = `${trail.coordinates.top}px`;
      marker.style.left = `${trail.coordinates.left}px`;
    } else {
      console.warn(`Coordonnées manquantes pour le sentier ${trail.id}`);
      return; // Sauter ce marqueur
    }
    
    // Ajouter un gestionnaire d'événement pour afficher les détails
    marker.addEventListener('click', () => {
      showTrailDetails(trail);
    });
    
	
    // AJOUT: Indicateur de problème si l'état est critique ou à surveiller
    if (trail.status === 'critical' || trail.status === 'warning') {
      const problemIndicator = document.createElement('div');
      problemIndicator.className = 'problem-indicator';
      
      // Adapter le style selon la gravité
      if (trail.status === 'critical') {
        problemIndicator.innerHTML = '⚠️'; // Emoji d'avertissement
        problemIndicator.style.color = '#ef4444'; // Rouge
      } else {
        problemIndicator.innerHTML = '⚠'; // Emoji d'avertissement simple
        problemIndicator.style.color = '#f59e0b'; // Orange
      }
      
      problemIndicator.style.position = 'absolute';
      problemIndicator.style.top = '-10px';
      problemIndicator.style.right = '-10px';
      problemIndicator.style.fontSize = '12px';
      
      problemIndicator.style.position = 'relative'; // S'assurer que le positionnement relatif fonctionne
      marker.appendChild(problemIndicator);
      
      // Ajouter un tooltip avec les problèmes si disponibles
      if (trail.lastInspection && trail.lastInspection.issues && trail.lastInspection.issues.length > 0) {
        const issues = trail.lastInspection.issues.join('\n- ');
        marker.setAttribute('title', `${trail.name}\nProblèmes:\n- ${issues}`);
      }
    }
    

	
	
	
	
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
  document.querySelectorAll('.shelter-marker').forEach(marker => {
    marker.remove();
  });
  
  // Créer et ajouter les nouveaux marqueurs
  shelters.forEach(shelter => {
    // Créer l'élément du marqueur
    const marker = document.createElement('div');
    marker.className = `trail-marker marker-${shelter.status}`;
    marker.innerHTML = `<span>A` + shelter.id.replace('shelter_', '') + '</span>';
    marker.setAttribute('data-id', shelter.id);
    marker.setAttribute('title', shelter.name);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    if (shelter.coordinates) {
      marker.style.top = `${shelter.coordinates.top}px`;
      marker.style.left = `${shelter.coordinates.left}px`;
    } else {
      console.warn(`Coordonnées manquantes pour l'abri ${shelter.id}`);
      return; // Sauter ce marqueur
    }
    
    // Ajouter un gestionnaire d'événement pour afficher les détails
    marker.addEventListener('click', () => {
      showShelterDetails(shelter);
    });
    

    // AJOUT: Indicateur de problème si l'état est critique ou à surveiller
    if (shelter.status === 'critical' || shelter.status === 'warning') {
      const problemIndicator = document.createElement('div');
      problemIndicator.className = 'problem-indicator';
      
      // Adapter le style selon la gravité
      if (shelter.status === 'critical') {
        problemIndicator.innerHTML = '⚠️'; // Emoji d'avertissement
        problemIndicator.style.color = '#ef4444'; // Rouge
      } else {
        problemIndicator.innerHTML = '⚠'; // Emoji d'avertissement simple
        problemIndicator.style.color = '#f59e0b'; // Orange
      }
      
      problemIndicator.style.position = 'absolute';
      problemIndicator.style.top = '-10px';
      problemIndicator.style.right = '-10px';
      problemIndicator.style.fontSize = '12px';
      
      problemIndicator.style.position = 'relative'; // S'assurer que le positionnement relatif fonctionne
      marker.appendChild(problemIndicator);
      
      // Ajouter un tooltip avec les problèmes si disponibles
      if (shelter.lastInspection && shelter.lastInspection.issues && shelter.lastInspection.issues.length > 0) {
        const issues = shelter.lastInspection.issues.join('\n- ');
        marker.setAttribute('title', `${shelter.name}\nProblèmes:\n- ${issues}`);
      }
    }



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

/**
 * Affiche les détails d'un sentier
 * @param {Object} trail - Sentier avec ses données
 */
async function showTrailDetails(trail) {
  // Récupérer les éléments du panneau d'informations
  const infoPanel = document.getElementById('piste-info');
  const defaultPanel = document.getElementById('default-info');
  
  if (!infoPanel || !defaultPanel) {
    console.error("Éléments du panneau d'informations non trouvés");
    return;
  }
  
  // Masquer le panneau par défaut et afficher le panneau de détails
  defaultPanel.classList.remove('show');
  infoPanel.classList.add('show');
  
  // Mettre à jour le titre et le statut
  const header = infoPanel.querySelector('.info-header');
  header.innerHTML = `
    <h3>${trail.name}</h3>
    <span class="status-badge status-${trail.status}">${getStatusText(trail.status)}</span>
  `;
  
  // Afficher les sections d'information
  if (trail.lastInspection) {
    try {
      // Récupérer le nom de l'inspecteur
      let inspectorName = "Inspecteur inconnu";
      
      if (trail.lastInspection.inspector_name) {
        // Utiliser le nom déjà stocké si disponible
        inspectorName = trail.lastInspection.inspector_name;
      } else if (trail.lastInspection.inspector_id) {
        // Sinon, récupérer le nom à partir de l'ID
        inspectorName = await getInspectorName(trail.lastInspection.inspector_id);
      }
      
      // Formater la date
      let formattedDate = "Date inconnue";
      if (trail.lastInspection.date) {
        const date = trail.lastInspection.date.toDate ? 
                     trail.lastInspection.date.toDate() : 
                     new Date(trail.lastInspection.date);
        
        formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
      
      // Mettre à jour la section d'inspection
      const inspectionSection = infoPanel.querySelector('.info-section:nth-child(2)');
      inspectionSection.innerHTML = `
        <div class="info-title">Dernière inspection</div>
        <p>${formattedDate} par ${inspectorName}</p>
      `;
      
      // Mettre à jour la section des problèmes
      const issuesSection = infoPanel.querySelector('.info-section:nth-child(3)');
      let issuesHTML = '';
      
      if (trail.lastInspection.issues && trail.lastInspection.issues.length > 0) {
        trail.lastInspection.issues.forEach(issue => {
          issuesHTML += `
            <div class="issue-item">
              <p><strong>${issue}</strong></p>
            </div>
          `;
        });
      } else {
        issuesHTML = '<p>Aucun problème signalé</p>';
      }
      
      issuesSection.innerHTML = `
        <div class="info-title">Problèmes signalés</div>
        ${issuesHTML}
      `;
      
      // Mettre à jour la section d'historique (peut être personnalisée)
      const historySection = infoPanel.querySelector('.info-section:nth-child(4)');
      historySection.innerHTML = `
        <div class="info-title">Historique</div>
        <p>Dernière inspection: ${formattedDate}</p>
      `;
    } catch (error) {
      console.error("Erreur lors de l'affichage des détails du sentier:", error);
    }
  } else {
    // Aucune inspection trouvée
    const inspectionSection = infoPanel.querySelector('.info-section:nth-child(2)');
    inspectionSection.innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>Aucune inspection récente</p>
    `;
    
    const issuesSection = infoPanel.querySelector('.info-section:nth-child(3)');
    issuesSection.innerHTML = `
      <div class="info-title">Problèmes signalés</div>
      <p>Aucune information disponible</p>
    `;
    
    const historySection = infoPanel.querySelector('.info-section:nth-child(4)');
    historySection.innerHTML = `
      <div class="info-title">Historique</div>
      <p>Aucune inspection enregistrée</p>
    `;
  }
  
  // Mettre à jour les caractéristiques du sentier
  const characteristicsSection = infoPanel.querySelector('.info-section:nth-child(5)');
  
  let difficultyText = "Inconnue";
  if (trail.difficulty) {
    difficultyText = getDifficultyText(trail.difficulty);
  }
  
  characteristicsSection.innerHTML = `
    <div class="info-title">Caractéristiques</div>
    <p>Longueur: ${trail.length || '?'} km • Difficulté: ${difficultyText}</p>
  `;
}

/**
 * Affiche les détails d'un abri
 * @param {Object} shelter - Abri avec ses données
 */
async function showShelterDetails(shelter) {
  // Récupérer les éléments du panneau d'informations
  const infoPanel = document.getElementById('piste-info');
  const defaultPanel = document.getElementById('default-info');
  
  if (!infoPanel || !defaultPanel) {
    console.error("Éléments du panneau d'informations non trouvés");
    return;
  }
  
  // Masquer le panneau par défaut et afficher le panneau de détails
  defaultPanel.classList.remove('show');
  infoPanel.classList.add('show');
  
  // Mettre à jour le titre et le statut
  const header = infoPanel.querySelector('.info-header');
  header.innerHTML = `
    <h3>Abri ${shelter.name}</h3>
    <span class="status-badge status-${shelter.status}">${getStatusText(shelter.status)}</span>
  `;
  
  // Afficher les sections d'information
  if (shelter.lastInspection) {
    try {
      // Récupérer le nom de l'inspecteur
      let inspectorName = "Inspecteur inconnu";
      
      if (shelter.lastInspection.inspector_name) {
        // Utiliser le nom déjà stocké si disponible
        inspectorName = shelter.lastInspection.inspector_name;
      } else if (shelter.lastInspection.inspector_id) {
        // Sinon, récupérer le nom à partir de l'ID
        inspectorName = await getInspectorName(shelter.lastInspection.inspector_id);
      }
      
      // Formater la date
      let formattedDate = "Date inconnue";
      if (shelter.lastInspection.date) {
        const date = shelter.lastInspection.date.toDate ? 
                     shelter.lastInspection.date.toDate() : 
                     new Date(shelter.lastInspection.date);
        
        formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
      
      // Mettre à jour la section d'inspection
      const inspectionSection = infoPanel.querySelector('.info-section:nth-child(2)');
      inspectionSection.innerHTML = `
        <div class="info-title">Dernière inspection</div>
        <p>${formattedDate} par ${inspectorName}</p>
      `;
	  
      // Mettre à jour la section des problèmes
      const issuesSection = infoPanel.querySelector('.info-section:nth-child(3)');
      let issuesHTML = '';
     
      if (shelter.lastInspection.issues && shelter.lastInspection.issues.length > 0) {
        shelter.lastInspection.issues.forEach(issue => {
          issuesHTML += `
            <div class="issue-item">
              <p><strong>${issue}</strong></p>
            </div>
          `;
        });
      } else {
        issuesHTML = '<p>Aucun problème signalé</p>';
      }
      
      issuesSection.innerHTML = `
        <div class="info-title">Problèmes signalés</div>
        ${issuesHTML}
      `;
      
      // Mettre à jour la section d'historique (peut être personnalisée)
      const historySection = infoPanel.querySelector('.info-section:nth-child(4)');
      historySection.innerHTML = `
        <div class="info-title">Historique</div>
        <p>Dernière inspection: ${formattedDate}</p>
      `;
      
      // Informations supplémentaires spécifiques aux abris
      let cleanlinessText = "Inconnue";
      let accessibilityText = "Inconnue";
      
      if (shelter.lastInspection.cleanliness) {
        cleanlinessText = getStatusText(shelter.lastInspection.cleanliness);
      }
      
      if (shelter.lastInspection.accessibility) {
        accessibilityText = getStatusText(shelter.lastInspection.accessibility);
      }
      
      // Ajouter ces informations à la section d'historique
      historySection.innerHTML += `
        <p>Propreté: ${cleanlinessText}</p>
        <p>Accessibilité: ${accessibilityText}</p>
      `;
    } catch (error) {
      console.error("Erreur lors de l'affichage des détails de l'abri:", error);
    }
  } else {
    // Aucune inspection trouvée
    const inspectionSection = infoPanel.querySelector('.info-section:nth-child(2)');
    inspectionSection.innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>Aucune inspection récente</p>
    `;
    
    const issuesSection = infoPanel.querySelector('.info-section:nth-child(3)');
    issuesSection.innerHTML = `
      <div class="info-title">Problèmes signalés</div>
      <p>Aucune information disponible</p>
    `;
    
    const historySection = infoPanel.querySelector('.info-section:nth-child(4)');
    historySection.innerHTML = `
      <div class="info-title">Historique</div>
      <p>Aucune inspection enregistrée</p>
    `;
  }
  
  // Mettre à jour les caractéristiques de l'abri
  const characteristicsSection = infoPanel.querySelector('.info-section:nth-child(5)');
  characteristicsSection.innerHTML = `
    <div class="info-title">Caractéristiques</div>
    <p>Altitude: ${shelter.altitude || '?'} m</p>
  `;
}

/**
 * Met à jour les statistiques du tableau de bord
 * @param {Array} trails - Sentiers avec leur statut
 * @param {Array} shelters - Abris avec leur statut
 */
function updateDashboardStats(trails, shelters) {
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
      
      if (inspectionDate >= today) {
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
      
      if (inspectionDate >= today) {
        stats.inspectedToday++;
      }
    }
  });
  
  // Mettre à jour les éléments du tableau de bord
  if (document.getElementById('inspections-today')) {
    document.getElementById('inspections-today').textContent = `${stats.inspectedToday}/${stats.total}`;
  }
  
  // Déterminer l'état général du domaine
  let overallStatus = 'Bon';
  if (stats.critical > 0) {
    overallStatus = 'Critique';
  } else if (stats.warning > 0) {
    overallStatus = 'À surveiller';
  }
  
  if (document.getElementById('overall-status')) {
    document.getElementById('overall-status').textContent = overallStatus;
  }
  
  // Nombre de problèmes signalés (warning + critical)
  const issuesCount = stats.warning + stats.critical;
  if (document.getElementById('reported-issues')) {
    document.getElementById('reported-issues').textContent = issuesCount;
  }
  
  // Mise à jour de l'heure
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  if (document.getElementById('last-update')) {
    document.getElementById('last-update').textContent = `${hours}:${minutes}`;
  }
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
  date: 'all'
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
    
	return true;
  });
  
  // Afficher les marqueurs filtrés
  displayTrailMarkers(filteredTrails);
  displayShelterMarkers(filteredShelters);
  
  // Mettre à jour le compteur d'éléments affichés si un tel élément existe
  const filterCounter = document.getElementById('filter-counter');
  if (filterCounter) {
    filterCounter.textContent = `${filteredTrails.length + filteredShelters.length} éléments affichés`;
  }
}

/**
 * Initialiser les contrôles de filtrage
 */
function initFilterControls() {
  // Récupérer les éléments de filtrage
  const statusFilter = document.getElementById('status-filter');
  const typeFilter = document.getElementById('type-filter');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const dateFilter = document.getElementById('date-filter');  // Nouveau filtre
//  const applyBtn = document.getElementById('apply-filters');
  const resetBtn = document.getElementById('reset-filters');
  
  // Si les éléments n'existent pas, sortir
  if (!statusFilter || !typeFilter || !difficultyFilter || !dateFilter) {
    console.warn("Certains contrôles de filtrage n'ont pas été trouvés");
    return;
  }
  
  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    // Afficher l'indicateur de chargement
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'flex';
    }
    
    // Mettre à jour les filtres actuels
    currentFilters.status = statusFilter.value;
    currentFilters.type = typeFilter.value;
    currentFilters.difficulty = difficultyFilter.value;
    currentFilters.date = dateFilter.value;
    
    // Petit délai pour permettre à l'indicateur de s'afficher
    setTimeout(() => {
      // Appliquer les filtres et mettre à jour la carte
      displayFilteredMarkers();
      
      // Masquer l'indicateur de chargement
      if (document.getElementById('map-loading')) {
        document.getElementById('map-loading').style.display = 'none';
      }
    }, 100);
  };
  
  // Ajouter les écouteurs d'événements pour chaque filtre
  statusFilter.addEventListener('change', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  difficultyFilter.addEventListener('change', applyFilters);
  dateFilter.addEventListener('change', applyFilters);

  // Gestionnaire pour le bouton Réinitialiser
  resetBtn.addEventListener('click', function() {
    // Réinitialiser les valeurs des filtres
    statusFilter.value = 'all';
    typeFilter.value = 'all';
    difficultyFilter.value = 'all';
    dateFilter.value = 'all';  // Nouveau filtre
    
    // Réinitialiser les filtres actuels
    currentFilters.status = 'all';
    currentFilters.type = 'all';
    currentFilters.difficulty = 'all';
    currentFilters.date = 'all';  // Nouveau filtre
    
    // Afficher l'indicateur de chargement
    if (document.getElementById('map-loading')) {
      document.getElementById('map-loading').style.display = 'flex';
    }
    
    // Petit délai pour permettre à l'indicateur de s'afficher
    setTimeout(() => {
      // Appliquer les filtres et mettre à jour la carte
      displayFilteredMarkers();
      
      // Masquer l'indicateur de chargement
      if (document.getElementById('map-loading')) {
        document.getElementById('map-loading').style.display = 'none';
      }
    }, 100);

    // Déclencher manuellement l'événement change pour appliquer les filtres
    statusFilter.dispatchEvent(new Event('change'));
	
  });
}

// Initialisation lors du chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les contrôles de filtrage
  initFilterControls();
  
  // La fonction loadMapData sera appelée après l'authentification
  // dans auth.js via checkAuthStatus
});