// dashboard.js
// Ce fichier gère toutes les fonctionnalités spécifiques au tableau de bord

// Fonction appelée après l'authentification
function loadDashboardData() {
  console.log("Chargement du tableau de bord");
  
  // Charger les inspections récentes (pour le tableau s'il existe)
  loadRecentInspections();
  
  // Charger le résumé des inspections des 7 derniers jours
  loadRecentInspectionsForSummary();
}

// Fonction pour charger les inspections récentes (tableau existant)
/**
 * Charge les inspections les plus récentes pour le tableau de bord
 */
async function loadRecentInspections() {
  try {
    const recentInspectionsTable = document.getElementById('recent-inspections-table');
    
    if (!recentInspectionsTable) {
      console.log("Tableau des inspections récentes non trouvé - probablement pas sur cette page");
      return;
    }
    
    // Afficher un message de chargement
    recentInspectionsTable.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center;">Chargement des inspections récentes...</td>
      </tr>
    `;
    
    // Calculer la date d'il y a 7 jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    // Charger les inspections de sentiers des 7 derniers jours
    const trailInspectionsSnapshot = await db.collection('trail_inspections')
      .where('date', '>=', sevenDaysAgoTimestamp)
      .orderBy('date', 'desc')
      .get();
    
    // Charger les données des sentiers
    const trailsMap = new Map();
    const trailsSnapshot = await db.collection('trails').get();
    trailsSnapshot.forEach(doc => {
      trailsMap.set(doc.id, doc.data());
    });
    
    // ... rest of the existing loadRecentInspections function
    
  } catch (error) {
    console.error("Erreur lors du chargement des inspections récentes:", error);
  }
}

// Nouvelle fonction pour charger le résumé des inspections des 7 derniers jours
/**
 * Charge les inspections des 7 derniers jours pour la section résumé
 */
async function loadRecentInspectionsForSummary() {
  try {
    const sentiersContainer = document.getElementById('sentiers-list');
    const abrisContainer = document.getElementById('abris-list');
    
    if (!sentiersContainer || !abrisContainer) {
      console.log("Containers pour le résumé des inspections non trouvés - probablement pas sur la page index");
      return;
    }
    
    // Show loading state
    sentiersContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">Chargement des sentiers...</div>';
    abrisContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;">Chargement des abris...</div>';
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
    
    // Load trail inspections from last 7 days
    const trailInspectionsSnapshot = await db.collection('trail_inspections')
      .where('date', '>=', sevenDaysAgoTimestamp)
      .orderBy('date', 'desc')
      .get();
    
    // Load shelter inspections from last 7 days
    const shelterInspectionsSnapshot = await db.collection('shelter_inspections')
      .where('date', '>=', sevenDaysAgoTimestamp)
      .orderBy('date', 'desc')
      .get();
    
    // Load trails and shelters data
    const trailsSnapshot = await db.collection('trails').get();
    const sheltersSnapshot = await db.collection('shelters').get();
    
    // Create maps for quick access
    const trailsMap = new Map();
    trailsSnapshot.forEach(doc => {
      trailsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    const sheltersMap = new Map();
    sheltersSnapshot.forEach(doc => {
      sheltersMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    // Process trail inspections
    const trailCards = [];
    const processedTrails = new Set();
    
    trailInspectionsSnapshot.forEach(doc => {
      const inspection = doc.data();
      const trailId = inspection.trail_id;
      
      // Only show the most recent inspection per trail
      if (!processedTrails.has(trailId)) {
        processedTrails.add(trailId);
        const trail = trailsMap.get(trailId);
        
        if (trail) {
          const inspectionDate = inspection.date.toDate();
          const statusClass = getStatusClass(inspection.condition);
          const statusText = getStatusText(inspection.condition);
          const difficultyText = getDifficultyText(trail.difficulty);
          
          trailCards.push(`
            <div class="item-card sentier" data-type="sentier">
              <div class="item-header">
                <div class="item-name">${trail.name}</div>
                <span class="status-badge ${statusClass}">${statusText}</span>
              </div>
              <div class="item-details">
                <div>Difficulté: ${difficultyText}</div>
                <div>Inspecteur: ${inspection.inspector_name || 'Non spécifié'}</div>
                <div>Date: ${inspectionDate.toLocaleDateString('fr-FR')}</div>
              </div>
              <div class="item-status">
                ${inspection.issues && inspection.issues.length > 0 ? 
                  `<div style="color: #dc2626;">⚠ ${inspection.issues.length} problème(s) signalé(s)</div>` : 
                  '<div style="color: #059669;">✓ Aucun problème signalé</div>'
                }
              </div>
            </div>
          `);
        }
      }
    });
    
    // Process shelter inspections
    const shelterCards = [];
    const processedShelters = new Set();
    
    shelterInspectionsSnapshot.forEach(doc => {
      const inspection = doc.data();
      const shelterId = inspection.shelter_id;
      
      // Only show the most recent inspection per shelter
      if (!processedShelters.has(shelterId)) {
        processedShelters.add(shelterId);
        const shelter = sheltersMap.get(shelterId);
        
        if (shelter) {
          const inspectionDate = inspection.date.toDate();
          const statusClass = getStatusClass(inspection.condition);
          const statusText = getStatusText(inspection.condition);
          
          shelterCards.push(`
            <div class="item-card abri" data-type="abri">
              <div class="item-header">
                <div class="item-name">${shelter.name}</div>
                <span class="status-badge ${statusClass}">${statusText}</span>
              </div>
              <div class="item-details">
                <div>Capacité: ${shelter.capacity || 'Non spécifiée'} personnes</div>
                <div>Inspecteur: ${inspection.inspector_name || 'Non spécifié'}</div>
                <div>Date: ${inspectionDate.toLocaleDateString('fr-FR')}</div>
              </div>
              <div class="item-status">
                ${inspection.issues && inspection.issues.length > 0 ? 
                  `<div style="color: #dc2626;">⚠ ${inspection.issues.length} problème(s) signalé(s)</div>` : 
                  '<div style="color: #059669;">✓ Aucun problème signalé</div>'
                }
              </div>
            </div>
          `);
        }
      }
    });
    
    // Update the display
    sentiersContainer.innerHTML = trailCards.length > 0 ? 
      trailCards.join('') : 
      '<div style="text-align: center; padding: 2rem; color: #6b7280;">Aucune inspection de sentier dans les 7 derniers jours</div>';
    
    abrisContainer.innerHTML = shelterCards.length > 0 ? 
      shelterCards.join('') : 
      '<div style="text-align: center; padding: 2rem; color: #6b7280;">Aucune inspection d\'abri dans les 7 derniers jours</div>';
    
    // Initialize filter functionality
    initSummaryFilters();
    
  } catch (error) {
    console.error("Error loading recent inspections for summary:", error);
    
    const sentiersContainer = document.getElementById('sentiers-list');
    const abrisContainer = document.getElementById('abris-list');
    
    if (sentiersContainer) {
      sentiersContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #dc2626;">Erreur lors du chargement des sentiers</div>';
    }
    
    if (abrisContainer) {
      abrisContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: #dc2626;">Erreur lors du chargement des abris</div>';
    }
  }
}

// Helper functions
function getStatusClass(condition) {
  switch (condition) {
    case 'good': return 'status-good';
    case 'warning': return 'status-warning';
    case 'critical': return 'status-critical';
    default: return 'status-not-inspected';
  }
}

function getStatusText(condition) {
  switch (condition) {
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
    default: return difficulty || 'Non spécifiée';
  }
}

// Initialize filter functionality for the summary section
function initSummaryFilters() {
  const filterButtons = document.querySelectorAll('.summary-filters .filter-btn');
  
  if (filterButtons.length === 0) {
    console.log("Filtres du résumé non trouvés - probablement pas sur la page index");
    return;
  }
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      const filterType = this.getAttribute('data-type');
      
      // Show/hide sections based on filter
      const sentiersSection = document.getElementById('sentiers-summary');
      const abrisSection = document.getElementById('abris-summary');
      
      if (!sentiersSection || !abrisSection) {
        console.log("Sections du résumé non trouvées");
        return;
      }
      
      if (filterType === 'all') {
        sentiersSection.style.display = 'block';
        abrisSection.style.display = 'block';
      } else if (filterType === 'sentier') {
        sentiersSection.style.display = 'block';
        abrisSection.style.display = 'none';
      } else if (filterType === 'abri') {
        sentiersSection.style.display = 'none';
        abrisSection.style.display = 'block';
      }
    });
  });
}