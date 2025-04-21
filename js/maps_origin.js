// Fonction pour charger la carte et les données
async function loadMapData() {
  try {
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
    
    // Afficher les marqueurs sur la carte
    displayTrailMarkers(trailsWithStatus);
    displayShelterMarkers(sheltersWithStatus);
    
    console.log("Carte mise à jour avec succès");
  } catch (error) {
    console.error("Erreur lors du chargement des données de la carte:", error);
  }
}

// Récupérer le statut le plus récent pour chaque sentier
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

// Récupérer le statut le plus récent pour chaque abri
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

// Afficher les marqueurs des sentiers sur la carte
function displayTrailMarkers(trails) {
  // Sélectionner le conteneur de la carte
  const mapContainer = document.querySelector('.map-bg');
  
  // Supprimer les marqueurs existants
  document.querySelectorAll('.trail-marker').forEach(marker => {
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
    marker.style.top = `${trail.coordinates.top}px`;
    marker.style.left = `${trail.coordinates.left}px`;
    
    // Ajouter un gestionnaire d'événement pour afficher les détails
    marker.addEventListener('click', () => {
      showTrailDetails(trail);
    });
    
    // Ajouter le marqueur à la carte
    mapContainer.appendChild(marker);
  });
}

// Afficher les marqueurs des abris sur la carte
function displayShelterMarkers(shelters) {
  // Sélectionner le conteneur de la carte
  const mapContainer = document.querySelector('.map-bg');
  
  // Supprimer les marqueurs existants
  document.querySelectorAll('.shelter-marker').forEach(marker => {
    marker.remove();
  });
  
  // Créer et ajouter les nouveaux marqueurs
  shelters.forEach(shelter => {
    // Créer l'élément du marqueur
    const marker = document.createElement('div');
    marker.className = `trail-marker shelter-marker marker-${shelter.status}`;
    marker.innerHTML = '<span>A</span>';
    marker.style.backgroundColor = '#8b5cf6'; // Couleur violette pour les abris
    marker.setAttribute('data-id', shelter.id);
    marker.setAttribute('title', shelter.name);
    
    // Positionner le marqueur selon les coordonnées enregistrées
    marker.style.top = `${shelter.coordinates.top}px`;
    marker.style.left = `${shelter.coordinates.left}px`;
    
    // Ajouter un gestionnaire d'événement pour afficher les détails
    marker.addEventListener('click', () => {
      showShelterDetails(shelter);
    });
    
    // Ajouter le marqueur à la carte
    mapContainer.appendChild(marker);
  });
}

// Afficher les détails d'un sentier
function showTrailDetails(trail) {
  // Afficher le panneau d'informations
  const infoPanel = document.getElementById('piste-info');
  const defaultPanel = document.getElementById('default-info');
  
  // Masquer le panneau par défaut et afficher le panneau de détails
  if (defaultPanel) defaultPanel.classList.remove('show');
  if (infoPanel) infoPanel.classList.add('show');
  
  // Mettre à jour le titre et le statut
  const header = infoPanel.querySelector('.info-header');
  header.innerHTML = `
    <h3>${trail.name}</h3>
    <span class="status-badge status-${trail.status}">${getStatusText(trail.status)}</span>
  `;
  
  // Mettre à jour les sections d'information
  if (trail.lastInspection) {
    // Formater la date
    const date = trail.lastInspection.date.toDate(); // Convertir le timestamp Firestore
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    // Mettre à jour la section d'inspection
    const inspectionSection = infoPanel.querySelector('.info-section:nth-child(1)');
    inspectionSection.innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>${formattedDate} par ${trail.lastInspection.inspector_name || 'Inspecteur'}</p>
    `;
    
    // Mettre à jour la section des problèmes
    const issuesSection = infoPanel.querySelector('.info-section:nth-child(2)');
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
  } else {
    // Aucune inspection
    const inspectionSection = infoPanel.querySelector('.info-section:nth-child(1)');
    inspectionSection.innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>Aucune inspection récente</p>
    `;
    
    const issuesSection = infoPanel.querySelector('.info-section:nth-child(2)');
    issuesSection.innerHTML = `
      <div class="info-title">Problèmes signalés</div>
      <p>Aucune information disponible</p>
    `;
  }
  
  // Mettre à jour les caractéristiques
  const characteristicsSection = infoPanel.querySelector('.info-section:nth-child(4)');
  characteristicsSection.innerHTML = `
    <div class="info-title">Caractéristiques</div>
    <p>Longueur: ${trail.length} km • Difficulté: ${getDifficultyText(trail.difficulty)}</p>
  `;
}

// Afficher les détails d'un abri
function showShelterDetails(shelter) {
  // Afficher le panneau d'informations
  const infoPanel = document.getElementById('piste-info');
  const defaultPanel = document.getElementById('default-info');
  
  // Masquer le panneau par défaut et afficher le panneau de détails
  if (defaultPanel) defaultPanel.classList.remove('show');
  if (infoPanel) infoPanel.classList.add('show');
  
  // Mettre à jour le titre et le statut
  const header = infoPanel.querySelector('.info-header');
  header.innerHTML = `
    <h3>Abri ${shelter.name}</h3>
    <span class="status-badge status-${shelter.status}">${getStatusText(shelter.status)}</span>
  `;
  
  // Mettre à jour les sections d'information
  if (shelter.lastInspection) {
    // Formater la date
    const date = shelter.lastInspection.date.toDate(); // Convertir le timestamp Firestore
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    // Mettre à jour la section d'inspection
    const inspectionSection = infoPanel.querySelector('.info-section:nth-child(1)');
    inspectionSection.innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>${formattedDate} par ${shelter.lastInspection.inspector_name || 'Inspecteur'}</p>
    `;
    
    // Mettre à jour la section des problèmes
    const issuesSection = infoPanel.querySelector('.info-section:nth-child(2)');
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
  } else {
    // Aucune inspection
    const inspectionSection = infoPanel.querySelector('.info-section:nth-child(1)');
    inspectionSection.innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>Aucune inspection récente</p>
    `;
    
    const issuesSection = infoPanel.querySelector('.info-section:nth-child(2)');
    issuesSection.innerHTML = `
      <div class="info-title">Problèmes signalés</div>
      <p>Aucune information disponible</p>
    `;
  }
  
  // Mettre à jour les caractéristiques
  const characteristicsSection = infoPanel.querySelector('.info-section:nth-child(4)');
  characteristicsSection.innerHTML = `
    <div class="info-title">Caractéristiques</div>
    <p>Altitude: ${shelter.altitude} m</p>
  `;
}

// Fonctions utilitaires
function getStatusText(status) {
  switch (status) {
    case 'good': return 'Bon';
    case 'warning': return 'Attention';
    case 'critical': return 'Critique';
    default: return 'Non inspecté';
  }
}

function getDifficultyText(difficulty) {
  switch (difficulty) {
    case 'easy': return 'Facile';
    case 'medium': return 'Intermédiaire';
    case 'hard': return 'Difficile';
    default: return difficulty;
  }
}