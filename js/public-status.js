/**
 * public-status.js
 * Public status page functionality
 */

// Global variables
let trailsData = [];
let sheltersData = [];
let currentView = 'list';
let currentFilter = 'all';
let allInspections = [];

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
    updateMapDisplay();
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
    card.style.display = shouldShow ? '' : 'none';
    if (shouldShow) visibleCount++;
  });
  
  // Show/hide empty state
  const emptyState = document.getElementById('empty-state');
  const trailsGrid = document.getElementById('trails-grid');
  
  if (visibleCount === 0 && trailCards.length > 0) {
    emptyState.style.display = 'block';
    trailsGrid.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    trailsGrid.style.display = 'grid';
  }
  
  // Update map if in map view
  if (currentView === 'map') {
    updateMapDisplay();
  }
}

/**
 * Check if trail should be shown based on current filter
 */
function shouldShowTrail(card) {
  if (currentFilter === 'all') return true;
  
  const status = card.dataset.status;
  const condition = card.dataset.condition;
  
  switch(currentFilter) {
    case 'open':
      return status === 'open';
    case 'closed':
      return status === 'closed';
    case 'condition':
      return condition === 'attention' || condition === 'urgent';
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
  console.log('Loading data from localStorage...');
  
  // Get trails data
  const storedTrails = localStorage.getItem('trails');
  if (storedTrails) {
    try {
      trailsData = JSON.parse(storedTrails);
      console.log(`Loaded ${trailsData.length} trails`);
    } catch (e) {
      console.error('Error parsing trails data:', e);
      trailsData = getDefaultTrails();
    }
  } else {
    trailsData = getDefaultTrails();
  }
  
  // Get shelters data
  const storedShelters = localStorage.getItem('shelters');
  if (storedShelters) {
    try {
      sheltersData = JSON.parse(storedShelters);
      console.log(`Loaded ${sheltersData.length} shelters`);
    } catch (e) {
      console.error('Error parsing shelters data:', e);
      sheltersData = getDefaultShelters();
    }
  } else {
    sheltersData = getDefaultShelters();
  }
  
  // Get all inspections
  loadInspections();
  
  // Display data
  displayTrails();
  displayShelters();
}

/**
 * Load inspections from localStorage
 */
function loadInspections() {
  allInspections = [];
  
  // Get trail inspections
  const trailInspections = localStorage.getItem('trailInspections');
  if (trailInspections) {
    try {
      const parsed = JSON.parse(trailInspections);
      allInspections.push(...parsed.map(i => ({...i, type: 'trail'})));
    } catch (e) {
      console.error('Error parsing trail inspections:', e);
    }
  }
  
  // Get shelter inspections
  const shelterInspections = localStorage.getItem('shelterInspections');
  if (shelterInspections) {
    try {
      const parsed = JSON.parse(shelterInspections);
      allInspections.push(...parsed.map(i => ({...i, type: 'shelter'})));
    } catch (e) {
      console.error('Error parsing shelter inspections:', e);
    }
  }
  
  console.log(`Loaded ${allInspections.length} total inspections`);
}

/**
 * Get latest inspection for a trail
 */
function getLatestInspection(trailName) {
  const inspections = allInspections.filter(i => 
    i.type === 'trail' && i.trail_name === trailName
  );
  
  if (inspections.length === 0) return null;
  
  // Sort by date and return the latest
  inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
  return inspections[0];
}

/**
 * Get latest shelter inspection
 */
function getLatestShelterInspection(shelterName) {
  const inspections = allInspections.filter(i => 
    i.type === 'shelter' && i.shelter_name === shelterName
  );
  
  if (inspections.length === 0) return null;
  
  inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
  return inspections[0];
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
 * Display shelters (added to the same grid)
 */
function displayShelters() {
  const grid = document.getElementById('trails-grid');
  
  // Add shelter cards after trails
  sheltersData.forEach(shelter => {
    const card = createShelterCard(shelter);
    grid.appendChild(card);
  });
}

/**
 * Create a trail card element
 */
function createTrailCard(trail) {
  const card = document.createElement('article');
  
  // Get latest inspection
  const inspection = getLatestInspection(trail.name);
  
  // Determine status
  let status = 'unknown';
  let condition = 'unknown';
  let groomed = false;
  
  if (inspection) {
    status = inspection.trail_open === 'yes' ? 'open' : 'closed';
    condition = inspection.overall_condition || 'unknown';
    groomed = inspection.groomed === 'yes';
  }
  
  card.className = `trail-card status-${status}`;
  card.dataset.status = status;
  card.dataset.condition = condition;
  card.dataset.groomed = groomed ? 'true' : 'false';
  card.dataset.type = 'trail';
  
  // Determine difficulty class
  const difficultyClass = getDifficultyClass(trail.difficulty);
  
  // Format last inspection date
  const lastInspection = inspection ? 
    formatDate(inspection.date) : 'Non inspecté';
  
  // Determine condition display
  const conditionText = getConditionText(condition);
  const conditionPercent = getConditionPercent(condition);
  const conditionClass = getConditionClass(condition);
  
  // Status display
  const statusText = status === 'open' ? 'Ouvert' : status === 'closed' ? 'Fermé' : 'Non inspecté';
  const statusIcon = groomed ? '🎿' : status === 'open' ? '✅' : status === 'closed' ? '❌' : '❓';
  
  card.innerHTML = `
    <div class="trail-header">
      <h3 class="trail-name">🥾 ${trail.name}</h3>
      <span class="trail-difficulty ${difficultyClass}">${trail.difficulty || 'N/A'}</span>
    </div>
    
    <div class="trail-status status-${status}">
      <span class="status-icon"></span>
      <span class="status-text">${statusIcon} ${statusText}</span>
    </div>
    
    <div class="trail-details">
      <div class="trail-detail">
        <span class="detail-label">Longueur:</span>
        <span class="detail-value">${trail.length || 'N/A'}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Inspection:</span>
        <span class="detail-value">${lastInspection}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Conditions:</span>
        <span class="detail-value">${conditionText}</span>
      </div>
      ${groomed ? `
      <div class="trail-detail">
        <span class="detail-label">Damage:</span>
        <span class="detail-value">✅ Damé récemment</span>
      </div>
      ` : ''}
    </div>
    
    ${condition !== 'unknown' ? `
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
    ` : ''}
  `;
  
  return card;
}

/**
 * Create a shelter card element
 */
function createShelterCard(shelter) {
  const card = document.createElement('article');
  
  // Get latest inspection
  const inspection = getLatestShelterInspection(shelter.name);
  
  // Determine status
  let status = 'unknown';
  let condition = 'unknown';
  
  if (inspection) {
    status = 'open'; // Shelters are usually open
    condition = inspection.overall_condition || 'unknown';
  }
  
  card.className = `trail-card status-${status}`;
  card.dataset.status = status;
  card.dataset.condition = condition;
  card.dataset.groomed = 'false';
  card.dataset.type = 'shelter';
  
  // Format last inspection date
  const lastInspection = inspection ? 
    formatDate(inspection.date) : 'Non inspecté';
  
  // Condition display
  const conditionText = getConditionText(condition);
  const conditionPercent = getConditionPercent(condition);
  const conditionClass = getConditionClass(condition);
  
  card.innerHTML = `
    <div class="trail-header">
      <h3 class="trail-name">🏠 ${shelter.name}</h3>
      <span class="trail-difficulty difficulty-shelter">Abri</span>
    </div>
    
    <div class="trail-status status-${status}">
      <span class="status-icon"></span>
      <span class="status-text">🏠 Abri disponible</span>
    </div>
    
    <div class="trail-details">
      <div class="trail-detail">
        <span class="detail-label">Capacité:</span>
        <span class="detail-value">${shelter.capacity || 'N/A'} personnes</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Inspection:</span>
        <span class="detail-value">${lastInspection}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">État:</span>
        <span class="detail-value">${conditionText}</span>
      </div>
      ${inspection && inspection.firewood_stock ? `
      <div class="trail-detail">
        <span class="detail-label">Bois:</span>
        <span class="detail-value">${inspection.firewood_stock}</span>
      </div>
      ` : ''}
    </div>
    
    ${condition !== 'unknown' ? `
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
    ` : ''}
  `;
  
  return card;
}

/**
 * Update map display with trail status markers
 */
function updateMapDisplay() {
  const mapContainer = document.getElementById('map-view');
  
  // Clear existing content
  mapContainer.innerHTML = '';
  
  // Create map container with image
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  mapDiv.style.position = 'relative';
  mapDiv.innerHTML = `
    <img src="../assets/images/trail-map.jpg" alt="Carte des sentiers" style="width: 100%; height: auto; display: block;">
    <div id="map-markers" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
  `;
  
  mapContainer.appendChild(mapDiv);
  
  // Add status markers overlay
  setTimeout(() => {
    addStatusMarkers();
  }, 100);
}

/**
 * Add status markers on the map image
 */
function addStatusMarkers() {
  const markersContainer = document.getElementById('map-markers');
  if (!markersContainer) return;
  
  // Define marker positions for each trail (percentages relative to image)
  const trailPositions = {
    'Sentier du Sommet': { x: 45, y: 25 },
    'Sentier du Lac': { x: 60, y: 50 },
    'Sentier de la Crête': { x: 35, y: 40 },
    'Sentier du Ruisseau': { x: 70, y: 65 },
    'Sentier de la Falaise': { x: 25, y: 55 },
    'Sentier de la Forêt': { x: 50, y: 70 },
    'Sentier du Panorama': { x: 40, y: 15 },
    'Sentier de la Cascade': { x: 75, y: 45 }
  };
  
  // Add shelter positions
  const shelterPositions = {
    'Refuge du Sommet': { x: 45, y: 20 },
    'Refuge du Lac': { x: 60, y: 55 },
    'Refuge de la Crête': { x: 35, y: 35 }
  };
  
  // Add trail markers
  trailsData.forEach(trail => {
    const position = trailPositions[trail.name];
    if (!position) return;
    
    const inspection = getLatestInspection(trail.name);
    let status = 'unknown';
    let condition = 'unknown';
    
    if (inspection) {
      status = inspection.trail_open === 'yes' ? 'open' : 'closed';
      condition = inspection.overall_condition || 'unknown';
    }
    
    // Skip if filtered out
    if (currentFilter !== 'all') {
      const shouldShow = 
        (currentFilter === 'open' && status === 'open') ||
        (currentFilter === 'closed' && status === 'closed') ||
        (currentFilter === 'condition' && (condition === 'attention' || condition === 'urgent')) ||
        (currentFilter === 'groomed' && inspection?.groomed === 'yes');
      
      if (!shouldShow) return;
    }
    
    const marker = createMapMarker(trail.name, status, condition, position, 'trail');
    markersContainer.appendChild(marker);
  });
  
  // Add shelter markers
  sheltersData.forEach(shelter => {
    const position = shelterPositions[shelter.name];
    if (!position) return;
    
    const inspection = getLatestShelterInspection(shelter.name);
    const condition = inspection?.overall_condition || 'unknown';
    
    // Skip if filtered
    if (currentFilter === 'open' || currentFilter === 'closed' || currentFilter === 'groomed') {
      return;
    }
    
    const marker = createMapMarker(shelter.name, 'shelter', condition, position, 'shelter');
    markersContainer.appendChild(marker);
  });
}

/**
 * Create a map marker element
 */
function createMapMarker(name, status, condition, position, type) {
  const marker = document.createElement('div');
  marker.style.position = 'absolute';
  marker.style.left = position.x + '%';
  marker.style.top = position.y + '%';
  marker.style.transform = 'translate(-50%, -50%)';
  marker.style.cursor = 'pointer';
  marker.style.zIndex = '10';
  
  // Determine marker color
  let color = '#9e9e9e'; // gray for unknown
  let icon = '❓';
  
  if (type === 'shelter') {
    color = '#8b4513'; // brown for shelters
    icon = '🏠';
  } else {
    if (status === 'closed') {
      color = '#f44336';
      icon = '❌';
    } else if (condition === 'excellent') {
      color = '#43a047';
      icon = '✅';
    } else if (condition === 'good') {
      color = '#2196f3';
      icon = '✅';
    } else if (condition === 'attention') {
      color = '#ff9800';
      icon = '⚠️';
    } else if (condition === 'urgent') {
      color = '#f44336';
      icon = '⚠️';
    }
  }
  
  marker.innerHTML = `
    <div style="
      width: 30px;
      height: 30px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    ">${icon}</div>
    <div style="
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      white-space: nowrap;
      pointer-events: none;
    ">${name}</div>
  `;
  
  // Add hover effect
  marker.addEventListener('mouseenter', function() {
    this.style.transform = 'translate(-50%, -50%) scale(1.2)';
  });
  
  marker.addEventListener('mouseleave', function() {
    this.style.transform = 'translate(-50%, -50%) scale(1)';
  });
  
  return marker;
}

/**
 * Helper functions
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

function getConditionText(condition) {
  const map = {
    'excellent': 'Excellent',
    'good': 'Bon',
    'attention': 'Attention requise',
    'urgent': 'Urgent',
    'unknown': 'Non évalué'
  };
  return map[condition] || 'Non évalué';
}

function getConditionPercent(condition) {
  const map = {
    'excellent': 100,
    'good': 75,
    'attention': 50,
    'urgent': 25,
    'unknown': 0
  };
  return map[condition] || 0;
}

function getConditionClass(condition) {
  const map = {
    'excellent': 'excellent',
    'good': 'good',
    'attention': 'fair',
    'urgent': 'poor',
    'unknown': 'unknown'
  };
  return map[condition] || 'unknown';
}

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

/**
 * Default data if localStorage is empty
 */
function getDefaultTrails() {
  return [
    { id: 1, name: "Sentier du Sommet", difficulty: "Difficile", length: "8.5 km" },
    { id: 2, name: "Sentier du Lac", difficulty: "Facile", length: "3.2 km" },
    { id: 3, name: "Sentier de la Crête", difficulty: "Intermédiaire", length: "5.7 km" },
    { id: 4, name: "Sentier du Ruisseau", difficulty: "Facile", length: "2.8 km" },
    { id: 5, name: "Sentier de la Falaise", difficulty: "Expert", length: "6.3 km" },
    { id: 6, name: "Sentier de la Forêt", difficulty: "Facile", length: "4.1 km" },
    { id: 7, name: "Sentier du Panorama", difficulty: "Intermédiaire", length: "7.2 km" },
    { id: 8, name: "Sentier de la Cascade", difficulty: "Intermédiaire", length: "4.5 km" }
  ];
}

function getDefaultShelters() {
  return [
    { id: 1, name: "Refuge du Sommet", capacity: "12" },
    { id: 2, name: "Refuge du Lac", capacity: "8" },
    { id: 3, name: "Refuge de la Crête", capacity: "6" }
  ];
}