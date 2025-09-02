// dashboard.js
// Ce fichier gère toutes les fonctionnalités spécifiques au tableau de bord

// Global variable to store inspection data for modal access
let allInspectionsData = [];

// Fonction appelée après l'authentification
function loadDashboardData() {
  console.log("Chargement du tableau de bord");
  
  // Charger les inspections récentes (pour le tableau s'il existe)
  loadRecentInspections();
  
  // Charger le résumé des inspections des 7 derniers jours
  loadRecentInspectionsForSummary();
  
  // Initialize filter functionality
  initDashboardFilters();
}

// Initialize dashboard-specific filter functionality
function initDashboardFilters() {
  console.log("Initializing dashboard filters");
  
  // Initialize filter toggle functionality (matching inspection-history.html)
  const toggleBtn = document.getElementById('toggle-filters');
  const filtersContent = document.getElementById('filters-content');
  const toggleText = document.getElementById('filter-toggle-text');
  
  if (toggleBtn && filtersContent && toggleText) {
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
  
  // Initialize reset filters button
  const resetBtn = document.getElementById('reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      console.log("Resetting filters");
      
      // Reset all filter values
      const dateFilter = document.getElementById('date-filter');
      const statusFilter = document.getElementById('status-filter');
      const issuesFilter = document.getElementById('issues-filter');
      
      if (dateFilter) dateFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (issuesFilter) issuesFilter.value = 'all';
      
      // Update the global currentFilters object that map.js uses
      if (typeof currentFilters !== 'undefined') {
        currentFilters.date = 'all';
        currentFilters.status = 'all';
        currentFilters.issues = 'all';
      }
      
      // Trigger map filter update
      if (typeof displayFilteredMarkers === 'function') {
        displayFilteredMarkers();
      }
    });
  }
  
  // Add event listeners to filter dropdowns for real-time filtering that work with map.js
  const dateFilter = document.getElementById('date-filter');
  const statusFilter = document.getElementById('status-filter');
  const issuesFilter = document.getElementById('issues-filter');
  
  if (dateFilter) {
    dateFilter.addEventListener('change', function() {
      console.log('Date filter changed to:', this.value);
      // Update the global currentFilters object that map.js uses
      if (typeof currentFilters !== 'undefined') {
        currentFilters.date = this.value;
      }
      // Trigger map filter update
      if (typeof displayFilteredMarkers === 'function') {
        displayFilteredMarkers();
      }
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      console.log('Status filter changed to:', this.value);
      // Update the global currentFilters object that map.js uses
      if (typeof currentFilters !== 'undefined') {
        currentFilters.status = this.value;
      }
      // Trigger map filter update
      if (typeof displayFilteredMarkers === 'function') {
        displayFilteredMarkers();
      }
    });
  }
  
  if (issuesFilter) {
    issuesFilter.addEventListener('change', function() {
      console.log('Issues filter changed to:', this.value);
      // Update the global currentFilters object that map.js uses
      if (typeof currentFilters !== 'undefined') {
        currentFilters.issues = this.value;
      }
      // Trigger map filter update
      if (typeof displayFilteredMarkers === 'function') {
        displayFilteredMarkers();
      }
    });
  }
}

/**
 * Charge les inspections les plus récentes pour le tableau de bord
 */
  // UPDATED: loadRecentInspections to include trail status display in cards
  async function loadRecentInspections() {
	  try {
		console.log('Loading recent inspections...');
		document.getElementById('recent-inspections').innerHTML = '<div class="loading">Chargement des inspections...</div>';
		
		// Calculate date 7 days ago
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
		
		console.log("Fetching inspections from:", sevenDaysAgo);
		
		// Load trail inspections from last 7 days
		const trailInspectionsSnapshot = await db.collection('trail_inspections')
		  .where('date', '>=', sevenDaysAgoTimestamp)
		  .orderBy('date', 'desc')
		  .get();
		
		console.log("Trail inspections found:", trailInspectionsSnapshot.size);
		
		// Load shelter inspections from last 7 days
		const shelterInspectionsSnapshot = await db.collection('shelter_inspections')
		  .where('date', '>=', sevenDaysAgoTimestamp)
		  .orderBy('date', 'desc')
		  .get();
		
		console.log("Shelter inspections found:", shelterInspectionsSnapshot.size);
		
		// Load trails and shelters data
		const trailsSnapshot = await db.collection('trails').get();
		const sheltersSnapshot = await db.collection('shelters').get();
		
		// Create maps for quick lookup
		const trailsMap = new Map();
		const sheltersMap = new Map();
		
		trailsSnapshot.forEach(doc => {
		  trailsMap.set(doc.id, doc.data());
		});
		
		sheltersSnapshot.forEach(doc => {
		  sheltersMap.set(doc.id, doc.data());
		});
		
		console.log("Loaded trails:", trailsMap.size, "shelters:", sheltersMap.size);
		
		// Process trail inspections
		const trailCards = [];
		const processedTrails = new Set();
		
		// Clear and populate allInspectionsData for modal access
		allInspectionsData = [];
		
		trailInspectionsSnapshot.docs.forEach(doc => {
		  const inspection = doc.data();
		  const trailId = inspection.trail_id;
		  
		  if (!processedTrails.has(trailId)) {
			processedTrails.add(trailId);
			
			const trail = trailsMap.get(trailId);
			if (trail) {
			  // Store inspection data for modal access
			  const inspectionData = {
				id: doc.id,
				type: 'trail',
				...inspection,
				date: inspection.date ? inspection.date.toDate() : new Date(),
				locationId: trailId,
				locationName: trail.name,
				length: trail.length,
				difficulty: trail.difficulty
			  };
			  allInspectionsData.push(inspectionData);
			  
			  const formattedDate = new Date(inspection.date.toDate()).toLocaleDateString('fr-FR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			  });
			  
			  // NEW: Trail Status Badge in card
			  const trailStatusBadge = inspection.trail_status 
				? createTrailStatusBadge(inspection.trail_status)
				: '';
			  
			  trailCards.push(`
				<div class="inspection-card clickable-card" data-inspection-id="${doc.id}" data-type="trail" style="cursor: pointer;">
				  <div class="card-body">
					<h4 class="card-title">${trail.name}</h4>
					<div class="status-info">
					  <span class="status-badge ${getStatusClass(inspection.condition)}">${getStatusText(inspection.condition)}</span>
					  ${trailStatusBadge ? trailStatusBadge : ''}
					  <span class="date-badge">${formattedDate}</span>
					</div>
					<div class="additional-info">
					  <div style="font-size: 0.85em; color: #6b7280; margin-top: 0.5rem;">
						📏 ${trail.length ? trail.length + ' km' : 'Longueur non spécifiée'} • 
						${getDifficultyText(trail.difficulty)}
						${inspection.snow_condition ? ` • ❄️ ${getSnowConditionText(inspection.snow_condition)}` : ''}
					  </div>
					</div>
					${
					  inspection.issues && inspection.issues.length > 0 ? 
					  `<div style="color: #dc2626; margin-top: 0.5rem;">⚠ ${inspection.issues.length} problème(s) signalé(s)</div>` : 
					  '<div style="color: #059669; margin-top: 0.5rem;">✓ Aucun problème signalé</div>'
					}
				  </div>
				</div>
			  `);
			}
		  }
		});
		
		// Process shelter inspections (similar logic)
		const shelterCards = [];
		const processedShelters = new Set();
		
		shelterInspectionsSnapshot.docs.forEach(doc => {
		  const inspection = doc.data();
		  const shelterId = inspection.shelter_id;
		  
		  if (!processedShelters.has(shelterId)) {
			processedShelters.add(shelterId);
			
			const shelter = sheltersMap.get(shelterId);
			if (shelter) {
			  // Store inspection data for modal access
			  const inspectionData = {
				id: doc.id,
				type: 'shelter',
				...inspection,
				date: inspection.date ? inspection.date.toDate() : new Date(),
				locationId: shelterId,
				locationName: shelter.name,
				capacity: shelter.capacity,
				altitude: shelter.altitude
			  };
			  allInspectionsData.push(inspectionData);
			  
			  const formattedDate = new Date(inspection.date.toDate()).toLocaleDateString('fr-FR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric'
			  });
			  
			  shelterCards.push(`
				<div class="inspection-card clickable-card" data-inspection-id="${doc.id}" data-type="shelter" style="cursor: pointer;">
				  <div class="card-body">
					<h4 class="card-title">${shelter.name}</h4>
					<div class="status-info">
					  <span class="status-badge ${getStatusClass(inspection.condition)}">${getStatusText(inspection.condition)}</span>
					  <span class="date-badge">${formattedDate}</span>
					</div>
					<div class="additional-info">
					  <div style="font-size: 0.85em; color: #6b7280; margin-top: 0.5rem;">
						👥 ${shelter.capacity ? shelter.capacity + ' places' : 'Capacité non spécifiée'} • 
						🏔️ ${shelter.altitude ? shelter.altitude + 'm' : 'Altitude non spécifiée'}
					  </div>
					</div>
					${
					  inspection.issues && inspection.issues.length > 0 ? 
					  `<div style="color: #dc2626; margin-top: 0.5rem;">⚠ ${inspection.issues.length} problème(s) signalé(s)</div>` : 
					  '<div style="color: #059669; margin-top: 0.5rem;">✓ Aucun problème signalé</div>'
					}
				  </div>
				</div>
			  `);
			}
		  }
		});
		
		// Display results
		const container = document.getElementById('recent-inspections');
		if (trailCards.length === 0 && shelterCards.length === 0) {
		  container.innerHTML = '<div class="no-data">Aucune inspection récente trouvée.</div>';
		} else {
		  let html = '';
		  if (trailCards.length > 0) {
			html += `
			  <div class="inspections-section">
				<h3 class="section-title">Sentiers (${trailCards.length})</h3>
				<div class="inspections-grid">
				  ${trailCards.join('')}
				</div>
			  </div>
			`;
		  }
		  if (shelterCards.length > 0) {
			html += `
			  <div class="inspections-section">
				<h3 class="section-title">Abris (${shelterCards.length})</h3>
				<div class="inspections-grid">
				  ${shelterCards.join('')}
				</div>
			  </div>
			`;
		  }
		  container.innerHTML = html;
		}
		
		// Bind click events to cards for modal opening
		document.querySelectorAll('.clickable-card').forEach(card => {
		  card.addEventListener('click', handleCardClick);
		});
		
		console.log(`Displayed ${trailCards.length} trail and ${shelterCards.length} shelter inspections`);
		
	  } catch (error) {
		console.error('Error loading recent inspections:', error);
		document.getElementById('recent-inspections').innerHTML = '<div class="error">Erreur lors du chargement des inspections</div>';
	  }
  }

// Nouvelle fonction pour charger le résumé des inspections des 7 derniers jours
/**
 * Charge les inspections des 7 derniers jours pour la section résumé
 */
async function loadRecentInspectionsForSummary() {
  try {
    console.log("Loading recent inspections for summary...");
    
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
    
    console.log("Fetching inspections from:", sevenDaysAgo);
    
    // Load trail inspections from last 7 days
    const trailInspectionsSnapshot = await db.collection('trail_inspections')
      .where('date', '>=', sevenDaysAgoTimestamp)
      .orderBy('date', 'desc')
      .get();
    
    console.log("Trail inspections found:", trailInspectionsSnapshot.size);
    
    // Load shelter inspections from last 7 days
    const shelterInspectionsSnapshot = await db.collection('shelter_inspections')
      .where('date', '>=', sevenDaysAgoTimestamp)
      .orderBy('date', 'desc')
      .get();
    
    console.log("Shelter inspections found:", shelterInspectionsSnapshot.size);
    
    // Load trails and shelters data
    const trailsSnapshot = await db.collection('trails').get();
    const sheltersSnapshot = await db.collection('shelters').get();
    
    // Create maps for quick lookup
    const trailsMap = new Map();
    const sheltersMap = new Map();
    
    trailsSnapshot.forEach(doc => {
      trailsMap.set(doc.id, doc.data());
    });
    
    sheltersSnapshot.forEach(doc => {
      sheltersMap.set(doc.id, doc.data());
    });
    
    console.log("Loaded trails:", trailsMap.size, "shelters:", sheltersMap.size);
    
    // Process trail inspections
    const trailCards = [];
    const processedTrails = new Set();
    
    // Clear and populate allInspectionsData for modal access
    allInspectionsData = [];
    
    trailInspectionsSnapshot.docs.forEach(doc => {
      const inspection = doc.data();
      const trailId = inspection.trail_id;
      
      if (!processedTrails.has(trailId)) {
        processedTrails.add(trailId);
        
        const trail = trailsMap.get(trailId);
        if (trail) {
          // Store inspection data for modal access
          const inspectionData = {
            id: doc.id,
            type: 'trail',
            ...inspection,
            date: inspection.date ? inspection.date.toDate() : new Date(),
            locationId: trailId,
            locationName: trail.name,
            length: trail.length,
            difficulty: trail.difficulty
          };
          allInspectionsData.push(inspectionData);
          
          const formattedDate = new Date(inspection.date.toDate()).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          
          trailCards.push(`
            <div class="inspection-card clickable-card" data-inspection-id="${doc.id}" data-type="trail" style="cursor: pointer;">
              <div class="card-body">
                <h4 class="card-title">${trail.name}</h4>
                <div class="status-info">
                  <span class="status-badge ${getStatusClass(inspection.condition)}">${getStatusText(inspection.condition)}</span>
                  <span class="date-badge">${formattedDate}</span>
                </div>
                <div class="additional-info">
                  <div style="font-size: 0.85em; color: #6b7280; margin-top: 0.5rem;">
                    📏 ${trail.length ? trail.length + ' km' : 'Longueur non spécifiée'} • 
                    ${getDifficultyText(trail.difficulty)}
                  </div>
                </div>
                ${
                  inspection.issues && inspection.issues.length > 0 ? 
                  `<div style="color: #dc2626; margin-top: 0.5rem;">⚠ ${inspection.issues.length} problème(s) signalé(s)</div>` : 
                  '<div style="color: #059669; margin-top: 0.5rem;">✓ Aucun problème signalé</div>'
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
    
    shelterInspectionsSnapshot.docs.forEach(doc => {
      const inspection = doc.data();
      const shelterId = inspection.shelter_id;
      
      if (!processedShelters.has(shelterId)) {
        processedShelters.add(shelterId);
        
        const shelter = sheltersMap.get(shelterId);
        if (shelter) {
          // Store inspection data for modal access
          const inspectionData = {
            id: doc.id,
            type: 'shelter',
            ...inspection,
            date: inspection.date ? inspection.date.toDate() : new Date(),
            locationId: shelterId,
            locationName: shelter.name,
            altitude: shelter.altitude
          };
          allInspectionsData.push(inspectionData);
          
          const formattedDate = new Date(inspection.date.toDate()).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          
          shelterCards.push(`
            <div class="inspection-card clickable-card" data-inspection-id="${doc.id}" data-type="shelter" style="cursor: pointer;">
              <div class="card-body">
                <h4 class="card-title">${shelter.name}</h4>
                <div class="status-info">
                  <span class="status-badge ${getStatusClass(inspection.condition)}">${getStatusText(inspection.condition)}</span>
                  <span class="date-badge">${formattedDate}</span>
                </div>
                <div class="additional-info">
                  <div style="font-size: 0.85em; color: #6b7280; margin-top: 0.5rem;">
                    🏔️ ${shelter.altitude ? shelter.altitude + ' m' : 'Altitude non spécifiée'}
                  </div>
                </div>
                ${
                  inspection.issues && inspection.issues.length > 0 ? 
                  `<div style="color: #dc2626; margin-top: 0.5rem;">⚠ ${inspection.issues.length} problème(s) signalé(s)</div>` : 
                  '<div style="color: #059669; margin-top: 0.5rem;">✓ Aucun problème signalé</div>'
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
    
    console.log("Summary loaded - Trails:", trailCards.length, "Shelters:", shelterCards.length);
    
    // Initialize filter functionality and click handlers
    initSummaryFilters();
    initInspectionCardClickHandlers();
    
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

/**
 * Initialize click handlers for inspection cards to open modal
 */
function initInspectionCardClickHandlers() {
  console.log("Initializing inspection card click handlers");
  
  const clickableCards = document.querySelectorAll('.clickable-card');
  console.log("Found clickable cards:", clickableCards.length);
  
  clickableCards.forEach((card, index) => {
    console.log(`Setting up click handler for card ${index + 1}`);
    
    // Remove any existing event listeners
    card.removeEventListener('click', handleCardClick);
    // Add new event listener
    card.addEventListener('click', handleCardClick);
  });
}

function handleCardClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const card = event.currentTarget;
  const inspectionId = card.getAttribute('data-inspection-id');
  const type = card.getAttribute('data-type');
  
  console.log("Card clicked! Inspection ID:", inspectionId, "Type:", type);
  
  if (inspectionId) {
    viewInspectionDetails(inspectionId);
  } else {
    console.error("No inspection ID found on card");
  }
}

/**
 * View inspection details in modal (same as history page)
 */
async function viewInspectionDetails(inspectionId) {
  try {
    console.log("Opening modal for inspection:", inspectionId);
    
    // Find the inspection in our stored data
    const inspection = allInspectionsData.find(i => i.id === inspectionId);
    if (!inspection) {
      console.error('Inspection not found:', inspectionId);
      console.log('Available inspections:', allInspectionsData.map(i => i.id));
      return;
    }

    console.log("Found inspection data:", inspection);

    const modalContent = await generateModalContent(inspection);
    
    // Get or create modal elements
    let modal = document.getElementById('inspection-modal');
    if (!modal) {
      console.log("Modal not found, creating it");
      createModalHTML();
      modal = document.getElementById('inspection-modal');
    } else {
      // Modal exists, ensure close events are bound
      console.log("Modal exists, rebinding close events");
      bindModalCloseEvents();
    }
    
    const modalContentElement = document.getElementById('modal-content');
    if (modalContentElement) {
      modalContentElement.innerHTML = modalContent;
      console.log("Modal content updated");
    } else {
      console.error("Modal content element not found");
      return;
    }
    
    showModal();
    console.log("Modal should now be visible");
    
  } catch (error) {
    console.error('Erreur lors de l\'affichage des détails:', error);
  }
}

/**
 * Create modal HTML if it doesn't exist
 */
function createModalHTML() {
  const modalHTML = `
    <!-- Inspection Details Modal -->
    <div class="modal" id="inspection-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Détails de l'inspection</h2>
          <button class="modal-close" id="close-modal">✕</button>
        </div>
        
        <div class="modal-body" id="modal-content">
          <!-- Content will be loaded dynamically -->
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" id="close-modal-btn">Fermer</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Bind modal close events immediately after creating the modal
  bindModalCloseEvents();
}

/**
 * Bind modal close events
 */
function bindModalCloseEvents() {
  console.log("Binding modal close events");
  
  const closeModalBtn = document.getElementById('close-modal');
  const closeModalBtnFooter = document.getElementById('close-modal-btn');
  const modal = document.getElementById('inspection-modal');
  
  if (closeModalBtn) {
    closeModalBtn.removeEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);
    console.log("Bound close event to X button");
  } else {
    console.error("Close modal button (X) not found");
  }
  
  if (closeModalBtnFooter) {
    closeModalBtnFooter.removeEventListener('click', closeModal);
    closeModalBtnFooter.addEventListener('click', closeModal);
    console.log("Bound close event to Fermer button");
  } else {
    console.error("Close modal footer button not found");
  }
  
  if (modal) {
    modal.removeEventListener('click', handleModalBackdropClick);
    modal.addEventListener('click', handleModalBackdropClick);
    console.log("Bound close event to modal backdrop");
  } else {
    console.error("Modal element not found");
  }
}

/**
 * Handle modal backdrop click
 */
function handleModalBackdropClick(e) {
  const modal = document.getElementById('inspection-modal');
  if (e.target === modal) {
    console.log("Modal backdrop clicked, closing modal");
    closeModal();
  }
}

/**
 * Generate modal content (same as history page)
 */
  // Updated generateModalContent for dashboard - ADD TRAIL STATUS
  async function generateModalContent(inspection) {
	  const formattedDate = formatDate(inspection.date);
	  const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
	  const statusBadge = createStatusBadge(inspection.condition);

	  let specificInfo = '';
	  if (inspection.type === 'trail') {
		// NEW: Trail Status in dashboard modal
		const trailStatusBadge = inspection.trail_status 
		  ? createTrailStatusBadge(inspection.trail_status)
		  : '<span class="status-badge status-unknown">Non spécifié</span>';
		  
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
			  </li>` : ''}
			</ul>
		  </div>
		`;
	  } else if (inspection.type === 'shelter') {
		specificInfo = `
		  <div class="detail-section">
			<h3>Informations de l'abri</h3>
			<ul class="detail-list">
			  ${inspection.cleanliness ? `
			  <li class="detail-item">
				<span class="detail-label">Propreté</span>
				<span class="detail-value">${getCleanlinessText(inspection.cleanliness)}</span>
			  </li>` : ''}
			  ${inspection.accessibility ? `
			  <li class="detail-item">
				<span class="detail-label">Accessibilité</span>
				<span class="detail-value">${getAccessibilityText(inspection.accessibility)}</span>
			  </li>` : ''}
			</ul>
		  </div>
		`;
	  }

	  // Issues section
	  let issuesSection = '';
	  if (inspection.issues && inspection.issues.length > 0) {
		issuesSection = `
		  <div class="detail-section">
			<h3>Problèmes identifiés</h3>
			<ul class="issues-list">
			  ${inspection.issues.map(issue => `<li class="issue-item">⚠️ ${issue}</li>`).join('')}
			</ul>
		  </div>
		`;
	  }

	  // Photos section
	  let photosSection = '';
	  if (inspection.photos && inspection.photos.length > 0) {
		photosSection = `
		  <div class="detail-section">
			<h3>Photos (${inspection.photos.length})</h3>
			<div class="photos-grid">
			  ${inspection.photos.map((photo, index) => `
				<div class="photo-thumbnail" onclick="openPhotoModal('${photo}')">
				  <img src="${photo}" alt="Photo ${index + 1}" loading="lazy" />
				</div>
			  `).join('')}
			</div>
		  </div>
		`;
	  }

	  // Notes section
	  let notesSection = '';
	  if (inspection.notes && inspection.notes.trim()) {
		notesSection = `
		  <div class="detail-section">
			<h3>Notes et commentaires</h3>
			<div class="notes-content">
			  ${inspection.notes.replace(/\n/g, '<br>')}
			</div>
		  </div>
		`;
	  }

	  return `
		<div class="inspection-details">
		  <div class="detail-header">
			<div class="detail-header-main">
			  <h2>${typeText}: ${inspection.locationName}</h2>
			  <div class="detail-header-meta">
				<span class="detail-date">${formattedDate}</span>
				<span class="detail-inspector">Par ${inspection.inspector}</span>
			  </div>
			</div>
			<div class="detail-header-status">
			  ${statusBadge}
			</div>
		  </div>

		  ${specificInfo}
		  ${issuesSection}
		  ${notesSection}
		  ${photosSection}
		</div>
	  `;
  }

// NEW FUNCTION: Create trail status badge for dashboard
  function createTrailStatusBadge(trailStatus) {
	  const statusConfig = {
		'open': { class: 'status-open', text: '🟢 Ouvert', title: 'Sentier ouvert au public' },
		'closed': { class: 'status-closed', text: '🔴 Fermé', title: 'Sentier fermé au public' }
	  };
	  
	  const config = statusConfig[trailStatus] || { class: 'status-unknown', text: '❓ Inconnu', title: 'Statut inconnu' };
	  
	  return `<span class="status-badge ${config.class}" title="${config.title}">${config.text}</span>`;
  }

// NEW FUNCTION: Get snow condition text
  function getSnowConditionText(condition) {
	  const conditionMap = {
		'good': 'Bonnes conditions',
		'warning': 'Conditions moyennes', 
		'critical': 'Mauvaises conditions',
		'none': 'Non évalué'
	  };
	  return conditionMap[condition] || condition;
  }

/**
 * Show modal
 */
function showModal() {
  const modal = document.getElementById('inspection-modal');
  if (modal) {
    console.log("Showing modal");
    modal.style.display = 'flex';
    modal.classList.add('show');
    // Fix scroll issue by preventing body scroll without setting overflow hidden
    document.body.style.position = 'fixed';
    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.width = '100%';
  } else {
    console.error("Modal element not found");
  }
}

/**
 * Close modal
 */
function closeModal() {
  console.log("closeModal function called");
  
  const modal = document.getElementById('inspection-modal');
  if (modal) {
    console.log("Closing modal");
    modal.classList.remove('show');
    modal.style.display = 'none';
    
    // Restore scroll position
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    console.log("Modal closed successfully");
  } else {
    console.error("Modal element not found when trying to close");
  }
}

/**
 * Create status badge HTML
 */
function createStatusBadge(condition) {
  const statusClass = getStatusClass(condition);
  const statusText = getStatusText(condition);
  return `<span class="badge ${statusClass}">${statusText}</span>`;
}

/**
 * Format date for display
 */
function formatDate(date) {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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

function getSnowConditionText(condition) {
  switch (condition) {
    case 'excellent': return 'Excellente';
    case 'good': return 'Bonne';
    case 'fair': return 'Correcte';
    case 'poor': return 'Mauvaise';
    default: return condition || 'Non spécifiée';
  }
}

function getCleanlinessText(cleanliness) {
  switch (cleanliness) {
    case 'very_clean': return 'Très propre';
    case 'clean': return 'Propre';
    case 'dirty': return 'Sale';
    case 'very_dirty': return 'Très sale';
    default: return cleanliness || 'Non spécifiée';
  }
}

function getAccessibilityText(accessibility) {
  switch (accessibility) {
    case 'excellent': return 'Excellente';
    case 'good': return 'Bonne';
    case 'difficult': return 'Difficile';
    case 'blocked': return 'Bloquée';
    default: return accessibility || 'Non spécifiée';
  }
}

/**
 * Open photo in modal (placeholder function)
 */
function openPhotoModal(photoUrl) {
  // You can implement a photo viewer modal here if needed
  window.open(photoUrl, '_blank');
}

// Initialize filter functionality for the summary section
function initSummaryFilters() {
  console.log("Initializing summary filters");
  
  const filterButtons = document.querySelectorAll('.summary-filters .filter-btn');
  
  if (filterButtons.length === 0) {
    console.log("Filtres du résumé non trouvés - probablement pas sur la page index");
    return;
  }
  
  console.log("Found", filterButtons.length, "summary filter buttons");
  
  filterButtons.forEach(button => {
    // Remove any existing event listeners
    button.removeEventListener('click', handleSummaryFilterClick);
    // Add new event listener
    button.addEventListener('click', handleSummaryFilterClick);
  });
}

function handleSummaryFilterClick(event) {
  const button = event.target;
  const filterButtons = document.querySelectorAll('.summary-filters .filter-btn');
  
  console.log("Summary filter clicked:", button.getAttribute('data-type'));
  
  // Remove active class from all buttons
  filterButtons.forEach(btn => btn.classList.remove('active'));
  
  // Add active class to clicked button
  button.classList.add('active');
  
  const filterType = button.getAttribute('data-type');
  
  // Show/hide sections based on filter
  const sentiersSection = document.getElementById('sentiers-summary');
  const abrisSection = document.getElementById('abris-summary');
  
  if (!sentiersSection || !abrisSection) {
    console.log("Sections du résumé non trouvées");
    return;
  }
  
  console.log("Applying filter:", filterType);
  
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
}