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


function updateMapMarkers(trails) {
  // Supposons que vous avez défini la structure de base de votre carte ailleurs
  
  // Effacer les marqueurs existants
  clearExistingMarkers();
  
  // Parcourir tous les sentiers
  trails.forEach(trail => {
    // Définir la classe CSS du marqueur en fonction de l'état
    let markerClass = 'marker-not-inspected';
    
    if (trail.latestInspection) {
      switch(trail.latestInspection.condition) {
        case 'good':
          markerClass = 'marker-good';
          break;
        case 'warning':
          markerClass = 'marker-warning';
          break;
        case 'critical':
          markerClass = 'marker-critical';
          break;
      }
    }
    
    // Créer le marqueur HTML
    const marker = document.createElement('div');
    marker.className = `trail-marker ${markerClass}`;
    marker.textContent = trail.id.replace('trail_', ''); // Numéro du sentier
    marker.setAttribute('title', trail.name);
    marker.setAttribute('data-trail-id', trail.id);
    
    // Positions approximatives sur la carte (à ajuster)
    const positions = {
      'trail_1': { top: 410, left: 448 }, // La tortue
      'trail_2': { top: 340, left: 210 }, // Tracé du lynx
      'trail_3': { top: 535, left: 425 }, // Adams
      // etc.
    };
    
    // Positionner le marqueur
    marker.style.top = `${positions[trail.id].top}px`;
    marker.style.left = `${positions[trail.id].left}px`;
    
    // Ajouter un gestionnaire d'événements au clic
    marker.addEventListener('click', () => {
      showTrailDetails(trail);
    });
    
    // Ajouter à la carte
    document.querySelector('.map-bg').appendChild(marker);
  });
}

// Fonction pour afficher les détails d'un sentier
function showTrailDetails(trail) {
  // Sélectionner les éléments du DOM
  const detailsPanel = document.getElementById('piste-info');
  const defaultInfo = document.getElementById('default-info');
  
  // Masquer la section par défaut et afficher les détails
  defaultInfo.classList.remove('show');
  detailsPanel.classList.add('show');
  
  // Mettre à jour le titre
  detailsPanel.querySelector('h3').textContent = trail.name;
  
  // Mettre à jour le statut
  let statusHTML = '<span class="status-badge status-not-inspected">Non inspecté</span>';
  
  if (trail.latestInspection) {
    const condition = trail.latestInspection.condition;
    const statusClass = `status-${condition}`;
    const statusText = condition === 'good' ? 'Bon' : condition === 'warning' ? 'Attention' : 'Critique';
    statusHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
  }
  
  detailsPanel.querySelector('.info-header').innerHTML = 
    `<h3>${trail.name}</h3>${statusHTML}`;
  
  // Afficher les informations de la dernière inspection
  if (trail.latestInspection) {
    const inspection = trail.latestInspection;
    
    // Convertir le timestamp Firestore en date lisible
    const date = inspection.date.toDate();
    const formattedDate = `${date.getDate()} ${getMonthName(date.getMonth())} ${date.getFullYear()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    // Récupérer le nom de l'inspecteur (si nécessaire)
    getInspectorName(inspection.inspector_id).then(inspectorName => {
      // Mise à jour de la section "Dernière inspection"
      const inspectionSection = detailsPanel.querySelector('.info-section:nth-child(1)');
      inspectionSection.innerHTML = `
        <div class="info-title">Dernière inspection</div>
        <p>${formattedDate} par ${inspectorName}</p>
      `;
      
      // Mise à jour de la section "Problèmes signalés"
      const issuesSection = detailsPanel.querySelector('.info-section:nth-child(2)');
      let issuesHTML = '';
      
      if (inspection.issues && inspection.issues.length > 0) {
        inspection.issues.forEach(issue => {
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
      
      // Mise à jour des commentaires si disponibles
      if (inspection.comments) {
        // ...
      }
    });
  } else {
    // Afficher un message si aucune inspection n'a été effectuée
    detailsPanel.querySelector('.info-section:nth-child(1)').innerHTML = `
      <div class="info-title">Dernière inspection</div>
      <p>Aucune inspection récente</p>
    `;
    
    detailsPanel.querySelector('.info-section:nth-child(2)').innerHTML = `
      <div class="info-title">Problèmes signalés</div>
      <p>Aucune donnée disponible</p>
    `;
  }
  
  // Afficher les caractéristiques du sentier
  detailsPanel.querySelector('.info-section:nth-child(4)').innerHTML = `
    <div class="info-title">Caractéristiques</div>
    <p>Longueur: ${trail.length} km • Difficulté: ${getDifficultyLabel(trail.difficulty)}</p>
  `;
}

// Fonction pour obtenir le nom de l'inspecteur
async function getInspectorName(inspectorId) {
  try {
    const inspectorDoc = await db.collection('inspectors').doc(inspectorId).get();
    
    if (inspectorDoc.exists) {
      return inspectorDoc.data().name;
    } else {
      return "Inspecteur inconnu";
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du nom de l'inspecteur:", error);
    return "Inspecteur inconnu";
  }
}

// Fonction auxiliaire pour le nom du mois
function getMonthName(month) {
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", 
                  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return months[month];
}

// Fonction auxiliaire pour convertir le niveau de difficulté
function getDifficultyLabel(difficulty) {
  switch(difficulty) {
    case 'easy': return 'Facile';
    case 'medium': return 'Intermédiaire';
    case 'hard': return 'Difficile';
    default: return difficulty;
  }
}

// Charger les données au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  // Vérifier que l'utilisateur est authentifié
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // L'utilisateur est connecté, charger les données
      updateMapWithTrailData();
    }
  });
});