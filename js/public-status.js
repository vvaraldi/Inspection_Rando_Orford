/**
 * public-status.js
 * Public status page functionality
 */

// Global variables
let map = null;
let trailsData = [];
let sheltersData = [];
let currentView = 'list';
let currentFilter = 'all';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Public status page initializing...');
  
  // Initialize components
  initializeViewToggle();
  initializeFilters();
  loadData();
  updateLastUpdateTime();
  
  // Refresh data every 5 minutes
  setInterval(loadData, 5 * 60 * 1000);
  setInterval(updateLastUpdateTime, 60 * 1000);
});

/**
 * Initialize view toggle (list/map)
 */
function initializeViewToggle() {
  const toggleButtons = document.querySelectorAll('.toggle-btn');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      const view = this.dataset.view;
      
      // Update button states
      toggleButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Switch views
      switchView(view);
    });
  });
}

/**
 * Switch between list and map views
 */
function switchView(view) {
  currentView = view;
  
  const listView = document.getElementById('list-view');
  const mapView = document.getElementById('map-view');
  
  if (view === 'map') {
    listView.style.display = 'none';
    mapView.style.display = 'block';
    
    // Initialize map if not already done
    if (!map) {
      initializeMap();
    } else {
      // Refresh map size
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  } else {
    listView.style.display = 'block';
    mapView.style.display = 'none';
  }
}

/**
 * Initialize filters
 */
function initializeFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Update button states
      filterButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // Apply filter
      currentFilter = this.dataset.filter;
      applyFilter();
    });
  });
}

/**
 * Apply current filter to trails
 */
function applyFilter() {
  const trailCards = document.querySelectorAll('.trail-card');
  let visibleCount = 0;
  
  trailCards.forEach(card => {
    const shouldShow = shouldShowTrail(card);
    card.style.display = shouldShow ? 'block' : 'none';
    if (shouldShow) visibleCount++;
  });
  
  // Show/hide empty state
  const emptyState = document.getElementById('empty-state');
  const trailsGrid = document.getElementById('trails-grid');
  
  if (visibleCount === 0) {
    emptyState.style.display = 'block';
    trailsGrid.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    trailsGrid.style.display = 'grid';
  }
  
  // Update map markers if map is visible
  if (map && currentView === 'map') {
    updateMapMarkers();
  }
}

/**
 * Check if trail should be shown based on current filter
 */
function shouldShowTrail(card) {
  if (currentFilter === 'all') return true;
  
  const status = card.dataset.status;
  
  switch(currentFilter) {
    case 'open':
      return status === 'open';
    case 'closed':
      return status === 'closed';
    case 'condition':
      return status === 'condition';
    case 'groomed':
      return card.dataset.groomed === 'true';
    default:
      return true;
  }
}

/**
 * Load data from localStorage
 */
function loadData() {
  console.log('Loading trail data...');
  
  // Get trails data
  const storedTrails = localStorage.getItem('trails');
  if (storedTrails) {
    try {
      trailsData = JSON.parse(storedTrails);
      console.log(`Loaded ${trailsData.length} trails`);
    } catch (e) {
      console.error('Error parsing trails data:', e);
      trailsData = [];
    }
  }
  
  // Get shelters data
  const storedShelters = localStorage.getItem('shelters');
  if (storedShelters) {
    try {
      sheltersData = JSON.parse(storedShelters);
      console.log(`Loaded ${sheltersData.length} shelters`);
    } catch (e) {
      console.error('Error parsing shelters data:', e);
      sheltersData = [];
    }
  }
  
  // Get recent inspections
  const recentInspections = getRecentInspections();
  
  // Merge inspection data with trails
  mergeInspectionData(recentInspections);
  
  // Display trails
  displayTrails();
}

/**
 * Get recent inspections from localStorage
 */
function getRecentInspections() {
  const inspections = [];
  
  // Get trail inspections
  const trailInspections = localStorage.getItem('trailInspections');
  if (trailInspections) {
    try {
      const parsed = JSON.parse(trailInspections);
      inspections.push(...parsed);
    } catch (e) {
      console.error('Error parsing trail inspections:', e);
    }
  }
  
  // Get shelter inspections
  const shelterInspections = localStorage.getItem('shelterInspections');
  if (shelterInspections) {
    try {
      const parsed = JSON.parse(shelterInspections);
      inspections.push(...parsed);
    } catch (e) {
      console.error('Error parsing shelter inspections:', e);
    }
  }
  
  return inspections;
}

/**
 * Merge inspection data with trails
 */
function mergeInspectionData(inspections) {
  // Create a map of latest inspections by trail ID
  const latestInspections = {};
  
  inspections.forEach(inspection => {
    const trailId = inspection.trail_id || inspection.trail_name;
    if (!trailId) return;
    
    if (!latestInspections[trailId] || 
        new Date(inspection.date) > new Date(latestInspections[trailId].date)) {
      latestInspections[trailId] = inspection;
    }
  });
  
  // Update trails with inspection data
  trailsData = trailsData.map(trail => {
    const inspection = latestInspections[trail.id] || latestInspections[trail.name];
    if (inspection) {
      trail.lastInspection = inspection.date;
      trail.condition = inspection.overall_condition || trail.condition;
      trail.isGroomed = inspection.groomed === 'yes';
      trail.status = determineTrailStatus(inspection);
    }
    return trail;
  });
}

/**
 * Determine trail status based on inspection
 */
function determineTrailStatus(inspection) {
  if (inspection.trail_open === 'no') return 'closed';
  if (inspection.overall_condition === 'excellent') return 'open';
  if (inspection.overall_condition === 'good') return 'open';
  if (inspection.groomed === 'yes') return 'groomed';
  return 'condition';
}

/**
 * Display trails in the grid
 */
function displayTrails() {
  const grid = document.getElementById('trails-grid');
  grid.innerHTML = '';
  
  if (trailsData.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📍</div>
        <p class="empty-message">Aucune donnée de sentier disponible</p>
      </div>
    `;
    return;
  }
  
  // Sort trails by name
  trailsData.sort((a, b) => a.name.localeCompare(b.name));
  
  // Create trail cards
  trailsData.forEach(trail => {
    const card = createTrailCard(trail);
    grid.appendChild(card);
  });
  
  // Apply current filter
  applyFilter();
}

/**
 * Create a trail card element
 */
function createTrailCard(trail) {
  const card = document.createElement('article');
  card.className = `trail-card status-${trail.status || 'unknown'}`;
  card.dataset.status = trail.status || 'unknown';
  card.dataset.groomed = trail.isGroomed ? 'true' : 'false';
  
  // Determine difficulty class
  const difficultyClass = getDifficultyClass(trail.difficulty);
  
  // Determine status text and class
  const statusInfo = getStatusInfo(trail.status);
  
  // Format last inspection date
  const lastInspection = trail.lastInspection ? 
    formatDate(trail.lastInspection) : 'Non inspecté';
  
  // Determine condition percentage
  const conditionPercent = getConditionPercent(trail.condition);
  const conditionClass = getConditionClass(trail.condition);
  
  card.innerHTML = `
    <div class="trail-header">
      <h3 class="trail-name">${trail.name}</h3>
      <span class="trail-difficulty ${difficultyClass}">${trail.difficulty || 'N/A'}</span>
    </div>
    
    <div class="trail-status status-${trail.status}">
      <span class="status-icon"></span>
      <span class="status-text">${statusInfo.text}</span>
    </div>
    
    <div class="trail-details">
      <div class="trail-detail">
        <span class="detail-label">Longueur:</span>
        <span class="detail-value">${trail.length || 'N/A'}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Dernière inspection:</span>
        <span class="detail-value">${lastInspection}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Conditions:</span>
        <span class="detail-value">${trail.condition || 'Non évalué'}</span>
      </div>
    </div>
    
    <div class="condition-bars">
      <div class="condition-item">
        <div class="condition-label">
          <span>État général</span>
          <span>${conditionPercent}%</span>
        </div>
        <div class="condition-bar">
          <div class="condition-fill condition-${conditionClass}" style="width: ${conditionPercent}%"></div>
        </div>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Get difficulty class
 */
function getDifficultyClass(difficulty) {
  const map = {
    'Facile': 'difficulty-easy',
    'Intermédiaire': 'difficulty-intermediate',
    'Difficile': 'difficulty-difficult',
    'Expert': 'difficulty-expert'
  };
  return map[difficulty] || 'difficulty-easy';
}

/**
 * Get status info
 */
function getStatusInfo(status) {
  const statusMap = {
    'open': { text: 'Ouvert', icon: '✅' },
    'closed': { text: 'Fermé', icon: '❌' },
    'condition': { text: 'Conditions variables', icon: '⚠️' },
    'groomed': { text: 'Damé', icon: '🎿' },
    'unknown': { text: 'Non inspecté', icon: '❓' }
  };
  return statusMap[status] || statusMap.unknown;
}

/**
 * Get condition percentage
 */
function getConditionPercent(condition) {
  const percentMap = {
    'excellent': 100,
    'good': 75,
    'fair': 50,
    'poor': 25
  };
  return percentMap[condition] || 0;
}

/**
 * Get condition class
 */
function getConditionClass(condition) {
  return condition || 'unknown';
}

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-CA');
    }
  }
}

/**
 * Initialize map
 */
function initializeMap() {
  console.log('Initializing map...');
  
  // Create map centered on Mont Orford
  map = L.map('map').setView([45.3167, -72.2167], 13);
  
  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Add trail markers
  addTrailMarkers();
}

/**
 * Add trail markers to map
 */
function addTrailMarkers() {
  if (!map) return;
  
  // Clear existing markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
  
  // Add markers for each trail
  trailsData.forEach(trail => {
    if (trail.coordinates && trail.coordinates.length >= 2) {
      const [lat, lng] = trail.coordinates;
      
      // Determine marker color based on status
      const markerColor = getMarkerColor(trail.status);
      
      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [20, 20]
      });
      
      // Create marker
      const marker = L.marker([lat, lng], { icon: icon })
        .bindPopup(createMapPopup(trail))
        .addTo(map);
    }
  });
}

/**
 * Get marker color based on status
 */
function getMarkerColor(status) {
  const colors = {
    'open': '#43a047',
    'closed': '#f44336',
    'condition': '#ff9800',
    'groomed': '#2196f3',
    'unknown': '#9e9e9e'
  };
  return colors[status] || colors.unknown;
}

/**
 * Create map popup content
 */
function createMapPopup(trail) {
  const statusInfo = getStatusInfo(trail.status);
  return `
    <div class="map-popup">
      <h4>${trail.name}</h4>
      <p><strong>Statut:</strong> ${statusInfo.text}</p>
      <p><strong>Difficulté:</strong> ${trail.difficulty || 'N/A'}</p>
      <p><strong>Longueur:</strong> ${trail.length || 'N/A'}</p>
      <p><strong>Condition:</strong> ${trail.condition || 'Non évalué'}</p>
    </div>
  `;
}

/**
 * Update map markers based on filter
 */
function updateMapMarkers() {
  // Re-add markers with filter applied
  addTrailMarkers();
}

/**
 * Update last update time
 */
function updateLastUpdateTime() {
  const element = document.getElementById('last-update-time');
  if (element) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-CA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    element.textContent = timeString;
  }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    displayTrails,
    createTrailCard,
    applyFilter
  };
}