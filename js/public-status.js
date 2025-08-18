/**
 * public-status.js
 * Public status page functionality - Simplified version
 */

// Global variables
let currentView = 'list';
let currentFilter = 'all';
let trailsData = [];
let sheltersData = [];

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Public status page initializing...');
  
  // Initialize components
  initializeViewToggle();
  initializeFilters();
  
  // Load sample data for now (since Firebase has permission issues)
  loadSampleData();
  
  // Update time
  updateLastUpdateTime();
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
 * Load sample data (fallback when Firebase isn't accessible)
 */
function loadSampleData() {
  console.log('Loading sample data...');
  
  // Sample trails data with inspections
  trailsData = [
    {
      id: 'trail1',
      name: 'Sentier du Sommet',
      difficulty: 'Difficile',
      length: '8.5 km',
      inspection: {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        trail_open: 'yes',
        overall_condition: 'excellent',
        groomed: 'yes',
        inspector: 'Jean Tremblay'
      }
    },
    {
      id: 'trail2',
      name: 'Sentier du Lac',
      difficulty: 'Facile',
      length: '3.2 km',
      inspection: {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        trail_open: 'yes',
        overall_condition: 'good',
        groomed: 'no',
        inspector: 'Marie Lavoie'
      }
    },
    {
      id: 'trail3',
      name: 'Sentier de la Crête',
      difficulty: 'Intermédiaire',
      length: '5.7 km',
      inspection: {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        trail_open: 'yes',
        overall_condition: 'attention',
        groomed: 'no',
        inspector: 'Paul Martin'
      }
    },
    {
      id: 'trail4',
      name: 'Sentier du Ruisseau',
      difficulty: 'Facile',
      length: '2.8 km',
      inspection: {
        date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        trail_open: 'no',
        overall_condition: 'urgent',
        groomed: 'no',
        inspector: 'Sophie Dubois'
      }
    },
    {
      id: 'trail5',
      name: 'Sentier de la Falaise',
      difficulty: 'Expert',
      length: '6.3 km',
      inspection: {
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        trail_open: 'yes',
        overall_condition: 'good',
        groomed: 'yes',
        inspector: 'Marc Bergeron'
      }
    },
    {
      id: 'trail6',
      name: 'Sentier de la Forêt',
      difficulty: 'Facile',
      length: '4.1 km',
      inspection: null // Not inspected
    },
    {
      id: 'trail7',
      name: 'Sentier du Panorama',
      difficulty: 'Intermédiaire',
      length: '7.2 km',
      inspection: {
        date: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        trail_open: 'yes',
        overall_condition: 'excellent',
        groomed: 'yes',
        inspector: 'Louise Roy'
      }
    },
    {
      id: 'trail8',
      name: 'Sentier de la Cascade',
      difficulty: 'Intermédiaire',
      length: '4.5 km',
      inspection: {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        trail_open: 'yes',
        overall_condition: 'attention',
        groomed: 'no',
        inspector: 'Robert Gagnon'
      }
    }
  ];
  
  // Sample shelters data
  sheltersData = [
    {
      id: 'shelter1',
      name: 'Refuge du Sommet',
      capacity: '12',
      inspection: {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        overall_condition: 'excellent',
        firewood_stock: 'Plein',
        inspector: 'Jean Tremblay'
      }
    },
    {
      id: 'shelter2',
      name: 'Refuge du Lac',
      capacity: '8',
      inspection: {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        overall_condition: 'good',
        firewood_stock: 'Moyen',
        inspector: 'Marie Lavoie'
      }
    },
    {
      id: 'shelter3',
      name: 'Refuge de la Crête',
      capacity: '6',
      inspection: {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        overall_condition: 'attention',
        firewood_stock: 'Bas',
        inspector: 'Paul Martin'
      }
    }
  ];
  
  // Display the data
  displayData();
}

/**
 * Display data in list view
 */
function displayData() {
  const grid = document.getElementById('trails-grid');
  grid.innerHTML = '';
  
  // Display trail cards
  trailsData.forEach(trail => {
    const card = createTrailCard(trail);
    grid.appendChild(card);
  });
  
  // Display shelter cards
  sheltersData.forEach(shelter => {
    const card = createShelterCard(shelter);
    grid.appendChild(card);
  });
  
  // Apply filter
  applyFilter();
}

/**
 * Create trail card
 */
function createTrailCard(trail) {
  const card = document.createElement('article');
  const inspection = trail.inspection;
  
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
    }
  }
  
  card.className = `trail-card status-${status}`;
  card.dataset.status = status;
  card.dataset.condition = condition;
  card.dataset.groomed = isGroomed ? 'true' : 'false';
  card.dataset.type = 'trail';
  
  // Format inspection date
  const inspectionDate = inspection?.date ? formatDate(inspection.date) : 'Non inspecté';
  
  // Condition percentage
  const conditionPercent = getConditionPercent(condition);
  
  // Difficulty class
  const difficultyClass = trail.difficulty ? trail.difficulty.toLowerCase().replace('é', 'e') : '';
  
  // Create card HTML
  card.innerHTML = `
    <div class="trail-header">
      <h3 class="trail-name">⛷️ ${trail.name}</h3>
      <span class="trail-difficulty difficulty-${difficultyClass}">${trail.difficulty || 'N/A'}</span>
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
      ${inspection?.inspector ? `
      <div class="trail-detail">
        <span class="detail-label">Inspecteur:</span>
        <span class="detail-value">${inspection.inspector}</span>
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
function createShelterCard(shelter) {
  const card = document.createElement('article');
  const inspection = shelter.inspection;
  
  let condition = inspection?.overall_condition || 'unknown';
  
  card.className = `trail-card status-shelter`;
  card.dataset.status = 'shelter';
  card.dataset.condition = condition;
  card.dataset.groomed = 'false';
  card.dataset.type = 'shelter';
  
  const inspectionDate = inspection?.date ? formatDate(inspection.date) : 'Non inspecté';
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
      ${inspection?.inspector ? `
      <div class="trail-detail">
        <span class="detail-label">Inspecteur:</span>
        <span class="detail-value">${inspection.inspector}</span>
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
      <img id="trail-map-image" src="../assets/map3.jpg" alt="Carte des sentiers" 
           style="width: 100%; height: auto; display: block; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
           onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%22600%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22800%22 height=%22600%22/%3E%3Ctext x=%22400%22 y=%22300%22 text-anchor=%22middle%22 font-size=%2224%22 fill=%22%23999%22%3EMap Image Not Found%3C/text%3E%3C/svg%3E';">
      <div id="map-markers" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></div>
    </div>
  `;
  
  // Wait a bit then add markers
  setTimeout(() => {
    addMapMarkers();
  }, 100);
}

/**
 * Add markers to the map
 */
function addMapMarkers() {
  const markersContainer = document.getElementById('map-markers');
  if (!markersContainer) return;
  
  // Clear existing markers
  markersContainer.innerHTML = '';
  
  // Define positions (percentages) for demo
  const positions = {
    'Sentier du Sommet': { x: 45, y: 25 },
    'Sentier du Lac': { x: 60, y: 50 },
    'Sentier de la Crête': { x: 35, y: 40 },
    'Sentier du Ruisseau': { x: 70, y: 65 },
    'Sentier de la Falaise': { x: 25, y: 55 },
    'Sentier de la Forêt': { x: 50, y: 70 },
    'Sentier du Panorama': { x: 40, y: 15 },
    'Sentier de la Cascade': { x: 75, y: 45 },
    'Refuge du Sommet': { x: 45, y: 20 },
    'Refuge du Lac': { x: 60, y: 55 },
    'Refuge de la Crête': { x: 35, y: 35 }
  };
  
  // Add trail markers
  trailsData.forEach(trail => {
    const position = positions[trail.name];
    if (!position) return;
    
    if (shouldShowOnMap(trail, trail.inspection)) {
      const marker = createMapMarker(trail, trail.inspection, position, 'trail');
      markersContainer.appendChild(marker);
    }
  });
  
  // Add shelter markers
  if (currentFilter === 'all' || currentFilter === 'condition') {
    sheltersData.forEach(shelter => {
      const position = positions[shelter.name];
      if (!position) return;
      
      const marker = createMapMarker(shelter, shelter.inspection, position, 'shelter');
      markersContainer.appendChild(marker);
    });
  }
}

/**
 * Check if item should be shown on map
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
  
  // Add click to show details
  marker.addEventListener('click', function() {
    alert(`${item.name}\n${inspection ? 'État: ' + getConditionText(inspection.overall_condition) : 'Non inspecté'}`);
  });
  
  return marker;
}

/**
 * Apply filter
 */
function applyFilter() {
  const cards = document.querySelectorAll('.trail-card');
  let visibleCount = 0;
  
  cards.forEach(card => {
    const shouldShow = shouldShowCard(card);
    card.style.display = shouldShow ? '' : 'none';
    if (shouldShow) visibleCount++;
  });
  
  // Update empty state
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('trails-grid');
  
  if (visibleCount === 0 && cards.length > 0) {
    if (!emptyState) {
      const emptyDiv = document.createElement('div');
      emptyDiv.id = 'empty-state';
      emptyDiv.className = 'empty-state';
      emptyDiv.style.display = 'block';
      emptyDiv.innerHTML = `
        <div class="empty-icon">🔍</div>
        <p class="empty-message">Aucun sentier ne correspond aux filtres sélectionnés</p>
      `;
      grid.parentNode.insertBefore(emptyDiv, grid.nextSibling);
    } else {
      emptyState.style.display = 'block';
    }
    grid.style.display = 'none';
  } else {
    if (emptyState) {
      emptyState.style.display = 'none';
    }
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
function formatDate(date) {
  if (!date) return 'N/A';
  
  const now = new Date();
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return 'À l\'instant';
  } else if (diffHours < 24) {
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

// Log that script loaded
console.log('Public status script loaded successfully');