/**
 * public-status.js
 * Public status page functionality - Loading from Firebase
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjX8Wd26_3zZfiPp-J5N0cepsHBDjDBQc",
  authDomain: "orford-83962.firebaseapp.com",
  projectId: "orford-83962",
  storageBucket: "orford-83962.firebasestorage.app",
  messagingSenderId: "223698154026",
  appId: "1:223698154026:web:67358b93022ebc2f391a73"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Global variables
let currentView = 'list';
let currentFilter = 'all';
let allTrailInspections = [];
let allShelterInspections = [];
let trailsData = new Map();
let sheltersData = new Map();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Public status page initializing...');
  
  // Initialize components
  initializeViewToggle();
  initializeFilters();
  loadDataFromFirebase();
  
  // Refresh data every 5 minutes
  setInterval(loadDataFromFirebase, 5 * 60 * 1000);
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
    displayMap();
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
 * Load data from Firebase
 */
async function loadDataFromFirebase() {
  const grid = document.getElementById('trails-grid');
  
  try {
    // Show loading state
    grid.innerHTML = `
      <div class="loading-message">
        <div class="loading-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    `;
    
    console.log("Loading data from Firebase...");
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
    
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
    
    // Clear and populate maps
    trailsData.clear();
    sheltersData.clear();
    
    trailsSnapshot.forEach(doc => {
      trailsData.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    sheltersSnapshot.forEach(doc => {
      sheltersData.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    console.log("Loaded trails:", trailsData.size, "shelters:", sheltersData.size);
    
    // Process inspections
    allTrailInspections = [];
    allShelterInspections = [];
    
    trailInspectionsSnapshot.forEach(doc => {
      allTrailInspections.push({ id: doc.id, ...doc.data() });
    });
    
    shelterInspectionsSnapshot.forEach(doc => {
      allShelterInspections.push({ id: doc.id, ...doc.data() });
    });
    
    // Display the data
    displayInspections();
    updateLastUpdateTime();
    
  } catch (error) {
    console.error("Error loading data from Firebase:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <p class="empty-message">Erreur lors du chargement des données</p>
      </div>
    `;
  }
}

/**
 * Display inspections in list view
 */
function displayInspections() {
  const grid = document.getElementById('trails-grid');
  grid.innerHTML = '';
  
  // Group inspections by trail/shelter and get latest
  const latestTrailInspections = new Map();
  const latestShelterInspections = new Map();
  
  // Get latest inspection for each trail
  allTrailInspections.forEach(inspection => {
    const trailId = inspection.trail_id;
    if (!latestTrailInspections.has(trailId) || 
        inspection.date.seconds > latestTrailInspections.get(trailId).date.seconds) {
      latestTrailInspections.set(trailId, inspection);
    }
  });
  
  // Get latest inspection for each shelter
  allShelterInspections.forEach(inspection => {
    const shelterId = inspection.shelter_id;
    if (!latestShelterInspections.has(shelterId) || 
        inspection.date.seconds > latestShelterInspections.get(shelterId).date.seconds) {
      latestShelterInspections.set(shelterId, inspection);
    }
  });
  
  // Display trail cards
  trailsData.forEach((trail, trailId) => {
    const inspection = latestTrailInspections.get(trailId);
    const card = createTrailCard(trail, inspection);
    grid.appendChild(card);
  });
  
  // Display shelter cards
  sheltersData.forEach((shelter, shelterId) => {
    const inspection = latestShelterInspections.get(shelterId);
    const card = createShelterCard(shelter, inspection);
    grid.appendChild(card);
  });
  
  // Apply filter
  applyFilter();
}

/**
 * Create trail card
 */
function createTrailCard(trail, inspection) {
  const card = document.createElement('article');
  
  // Determine status
  let status = 'unknown';
  let condition = inspection?.overall_condition || 'unknown';
  let isOpen = inspection?.trail_open === 'yes';
  let isGroomed = inspection?.groomed === 'yes';
  
  if (inspection) {
    if (!isOpen) {
      status = 'closed';
    } else if (condition === 'excellent' || condition === 'good') {
      status = 'open';
    } else if (condition === 'attention' || condition === 'urgent') {
      status = 'condition';
    } else {
      status = 'open';
    }
  }
  
  card.className = `trail-card status-${status}`;
  card.dataset.status = status;
  card.dataset.condition = condition;
  card.dataset.groomed = isGroomed ? 'true' : 'false';
  card.dataset.type = 'trail';
  
  // Format inspection date
  const inspectionDate = inspection?.date ? formatFirebaseDate(inspection.date) : 'Non inspecté';
  
  // Condition percentage
  const conditionPercent = getConditionPercent(condition);
  
  // Create card HTML
  card.innerHTML = `
    <div class="trail-header">
      <h3 class="trail-name">⛷️ ${trail.name}</h3>
      <span class="trail-difficulty difficulty-${(trail.difficulty || 'Facile').toLowerCase()}">${trail.difficulty || 'N/A'}</span>
    </div>
    
    <div class="trail-status status-${status}">
      <span class="status-icon"></span>
      <span class="status-text">${getStatusText(status, isGroomed)}</span>
    </div>
    
    <div class="trail-details">
      <div class="trail-detail">
        <span class="detail-label">Longueur:</span>
        <span class="detail-value">${trail.length || 'N/A'}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Inspection:</span>
        <span class="detail-value">${inspectionDate}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">État:</span>
        <span class="detail-value">${getConditionText(condition)}</span>
      </div>
      ${isGroomed ? `
      <div class="trail-detail">
        <span class="detail-label">Damage:</span>
        <span class="detail-value">✅ Damé</span>
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
          <div class="condition-fill condition-${condition}" style="width: ${conditionPercent}%"></div>
        </div>
      </div>
    </div>
    ` : ''}
  `;
  
  return card;
}

/**
 * Create shelter card
 */
function createShelterCard(shelter, inspection) {
  const card = document.createElement('article');
  
  let condition = inspection?.overall_condition || 'unknown';
  
  card.className = `trail-card status-shelter`;
  card.dataset.status = 'shelter';
  card.dataset.condition = condition;
  card.dataset.groomed = 'false';
  card.dataset.type = 'shelter';
  
  const inspectionDate = inspection?.date ? formatFirebaseDate(inspection.date) : 'Non inspecté';
  const conditionPercent = getConditionPercent(condition);
  
  card.innerHTML = `
    <div class="trail-header">
      <h3 class="trail-name">🏠 ${shelter.name}</h3>
      <span class="trail-difficulty difficulty-shelter">Abri</span>
    </div>
    
    <div class="trail-status status-shelter">
      <span class="status-icon"></span>
      <span class="status-text">Abri disponible</span>
    </div>
    
    <div class="trail-details">
      <div class="trail-detail">
        <span class="detail-label">Capacité:</span>
        <span class="detail-value">${shelter.capacity || 'N/A'} personnes</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">Inspection:</span>
        <span class="detail-value">${inspectionDate}</span>
      </div>
      <div class="trail-detail">
        <span class="detail-label">État:</span>
        <span class="detail-value">${getConditionText(condition)}</span>
      </div>
      ${inspection?.firewood_stock ? `
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
          <div class="condition-fill condition-${condition}" style="width: ${conditionPercent}%"></div>
        </div>
      </div>
    </div>
    ` : ''}
  `;
  
  return card;
}

/**
 * Display map view with markers
 */
function displayMap() {
  const mapView = document.getElementById('map-view');
  
  // Clear and create map container
  mapView.innerHTML = `
    <div class="map-container" style="position: relative; width: 100%; max-width: 1200px; margin: 0 auto;">
      <img src="../assets/images/map3.jpg" alt="Carte des sentiers" style="width: 100%; height: auto; display: block; border-radius: 8px;">
      <div id="map-markers" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
    </div>
  `;
  
  // Add markers after image loads
  const img = mapView.querySelector('img');
  img.onload = function() {
    addMapMarkers();
  };
}

/**
 * Add markers to the map
 */
function addMapMarkers() {
  const markersContainer = document.getElementById('map-markers');
  if (!markersContainer) return;
  
  // Clear existing markers
  markersContainer.innerHTML = '';
  
  // Define positions (percentages) - same as dashboard
  const positions = {
    trails: {
      'Sentier du Sommet': { x: 45, y: 25 },
      'Sentier du Lac': { x: 60, y: 50 },
      'Sentier de la Crête': { x: 35, y: 40 },
      'Sentier du Ruisseau': { x: 70, y: 65 },
      'Sentier de la Falaise': { x: 25, y: 55 },
      'Sentier de la Forêt': { x: 50, y: 70 },
      'Sentier du Panorama': { x: 40, y: 15 },
      'Sentier de la Cascade': { x: 75, y: 45 }
    },
    shelters: {
      'Refuge du Sommet': { x: 45, y: 20 },
      'Refuge du Lac': { x: 60, y: 55 },
      'Refuge de la Crête': { x: 35, y: 35 }
    }
  };
  
  // Get latest inspections
  const latestTrailInspections = new Map();
  const latestShelterInspections = new Map();
  
  allTrailInspections.forEach(inspection => {
    const trailId = inspection.trail_id;
    if (!latestTrailInspections.has(trailId) || 
        inspection.date.seconds > latestTrailInspections.get(trailId).date.seconds) {
      latestTrailInspections.set(trailId, inspection);
    }
  });
  
  allShelterInspections.forEach(inspection => {
    const shelterId = inspection.shelter_id;
    if (!latestShelterInspections.has(shelterId) || 
        inspection.date.seconds > latestShelterInspections.get(shelterId).date.seconds) {
      latestShelterInspections.set(shelterId, inspection);
    }
  });
  
  // Add trail markers
  trailsData.forEach((trail, trailId) => {
    const position = positions.trails[trail.name];
    if (!position) return;
    
    const inspection = latestTrailInspections.get(trailId);
    const marker = createMapMarker(trail, inspection, position, 'trail');
    if (marker && shouldShowOnMap(trail, inspection)) {
      markersContainer.appendChild(marker);
    }
  });
  
  // Add shelter markers (only if not filtered out)
  if (currentFilter === 'all' || currentFilter === 'condition') {
    sheltersData.forEach((shelter, shelterId) => {
      const position = positions.shelters[shelter.name];
      if (!position) return;
      
      const inspection = latestShelterInspections.get(shelterId);
      const marker = createMapMarker(shelter, inspection, position, 'shelter');
      if (marker) {
        markersContainer.appendChild(marker);
      }
    });
  }
}

/**
 * Check if item should be shown on map based on filter
 */
function shouldShowOnMap(item, inspection) {
  if (currentFilter === 'all') return true;
  
  const isOpen = inspection?.trail_open === 'yes';
  const condition = inspection?.overall_condition;
  const isGroomed = inspection?.groomed === 'yes';
  
  switch(currentFilter) {
    case 'open':
      return isOpen;
    case 'closed':
      return !isOpen;
    case 'condition':
      return condition === 'attention' || condition === 'urgent';
    case 'groomed':
      return isGroomed;
    default:
      return true;
  }
}

/**
 * Create map marker
 */
function createMapMarker(item, inspection, position, type) {
  const marker = document.createElement('div');
  marker.style.position = 'absolute';
  marker.style.left = position.x + '%';
  marker.style.top = position.y + '%';
  marker.style.transform = 'translate(-50%, -50%)';
  marker.style.cursor = 'pointer';
  marker.style.zIndex = '10';
  marker.style.transition = 'transform 0.2s';
  
  // Determine marker appearance
  let color = '#9e9e9e';
  let icon = '❓';
  
  if (type === 'shelter') {
    color = '#8b4513';
    icon = '🏠';
  } else {
    const isOpen = inspection?.trail_open === 'yes';
    const condition = inspection?.overall_condition;
    
    if (!isOpen) {
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
      width: 32px;
      height: 32px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">${icon}</div>
    <div style="
      position: absolute;
      bottom: -22px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      font-weight: 500;
    ">${item.name}</div>
  `;
  
  // Add hover effect
  marker.addEventListener('mouseenter', function() {
    this.style.transform = 'translate(-50%, -50%) scale(1.15)';
    this.style.zIndex = '20';
  });
  
  marker.addEventListener('mouseleave', function() {
    this.style.transform = 'translate(-50%, -50%) scale(1)';
    this.style.zIndex = '10';
  });
  
  return marker;
}

/**
 * Apply filter to displayed items
 */
function applyFilter() {
  const cards = document.querySelectorAll('.trail-card');
  let visibleCount = 0;
  
  cards.forEach(card => {
    const shouldShow = shouldShowCard(card);
    card.style.display = shouldShow ? '' : 'none';
    if (shouldShow) visibleCount++;
  });
  
  // Show/hide empty state
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('trails-grid');
  
  if (visibleCount === 0 && cards.length > 0) {
    emptyState.style.display = 'block';
    grid.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    grid.style.display = 'grid';
  }
  
  // Update map if in map view
  if (currentView === 'map') {
    addMapMarkers();
  }
}

/**
 * Check if card should be shown
 */
function shouldShowCard(card) {
  if (currentFilter === 'all') return true;
  
  const status = card.dataset.status;
  const condition = card.dataset.condition;
  const groomed = card.dataset.groomed === 'true';
  const type = card.dataset.type;
  
  switch(currentFilter) {
    case 'open':
      return status === 'open' && type === 'trail';
    case 'closed':
      return status === 'closed' && type === 'trail';
    case 'condition':
      return condition === 'attention' || condition === 'urgent';
    case 'groomed':
      return groomed && type === 'trail';
    default:
      return true;
  }
}

/**
 * Helper functions
 */
function formatFirebaseDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours !== 1 ? 's' : ''}`;
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

function getStatusText(status, isGroomed) {
  if (isGroomed) return '🎿 Damé';
  
  const map = {
    'open': '✅ Ouvert',
    'closed': '❌ Fermé',
    'condition': '⚠️ Conditions',
    'shelter': '🏠 Abri',
    'unknown': '❓ Non inspecté'
  };
  return map[status] || map.unknown;
}

function updateLastUpdateTime() {
  const element = document.getElementById('last-update-time');
  if (element) {
    const now = new Date();
    element.textContent = now.toLocaleTimeString('fr-CA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}