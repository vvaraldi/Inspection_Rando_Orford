/**
 * status-map.js
 * Map view functionality for the public status page (No Filters Version)
 */

// Display markers on the map
function displayMapMarkers(data) {
  console.log(`Displaying ${data.length} markers on map`);
  
  // Clear existing markers
  clearMapMarkers();
  
  // Separate trails and shelters
  const trails = data.filter(item => item.type === 'trail');
  const shelters = data.filter(item => item.type === 'shelter');
  
  // Display trails markers
  displayTrailMarkers(trails);
  
  // Display shelter markers
  displayShelterMarkers(shelters);
}

// Clear all existing markers from the map
function clearMapMarkers() {
  const mapWrapper = document.querySelector('.map-wrapper');
  if (mapWrapper) {
    // Remove all existing marker elements
    const existingMarkers = mapWrapper.querySelectorAll('.map-marker');
    existingMarkers.forEach(marker => marker.remove());
  }
}

// Display trail markers
function displayTrailMarkers(trails) {
  const mapWrapper = document.querySelector('.map-wrapper');
  
  if (!mapWrapper) {
    console.error("Map wrapper not found");
    return;
  }
  
  trails.forEach(trail => {
    const marker = createTrailMarker(trail);
    mapWrapper.appendChild(marker);
  });
  
  console.log(`Displayed ${trails.length} trail markers`);
}

// Display shelter markers
function displayShelterMarkers(shelters) {
  const mapWrapper = document.querySelector('.map-wrapper');
  
  if (!mapWrapper) {
    console.error("Map wrapper not found");
    return;
  }
  
  shelters.forEach(shelter => {
    const marker = createShelterMarker(shelter);
    mapWrapper.appendChild(marker);
  });
  
  console.log(`Displayed ${shelters.length} shelter markers`);
}

// Create a trail marker element
function createTrailMarker(trail) {
  const marker = document.createElement('div');
  marker.className = `map-marker trail-marker map-marker-${trail.status}`;
  
  // Position the marker based on coordinates (using pixel coordinates from database)
  if (trail.coordinates) {
    marker.style.left = `${trail.coordinates.left}px`;
    marker.style.top = `${trail.coordinates.top}px`;
  }
  
  // Set marker content based on status
  const statusIcon = getStatusIcon(trail.status);
  marker.innerHTML = statusIcon;
  
  // Add hover functionality
  marker.addEventListener('mouseenter', function(e) {
    showTooltip(e, trail);
  });
  
  marker.addEventListener('mouseleave', function() {
    hideTooltip();
  });
  
  return marker;
}

// Create a shelter marker element
function createShelterMarker(shelter) {
  const marker = document.createElement('div');
  marker.className = `map-marker shelter-marker map-marker-${shelter.status}`;
  
  // Position the marker based on coordinates (using pixel coordinates from database)
  if (shelter.coordinates) {
    marker.style.left = `${shelter.coordinates.left}px`;
    marker.style.top = `${shelter.coordinates.top}px`;
  }
  
  // Set marker content (house icon for shelters)
  marker.innerHTML = '🏠';
  
  // Add hover functionality
  marker.addEventListener('mouseenter', function(e) {
    showTooltip(e, shelter);
  });
  
  marker.addEventListener('mouseleave', function() {
    hideTooltip();
  });
  
  return marker;
}

// Get status icon for trails
function getStatusIcon(status) {
  switch (status) {
    case 'good':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'critical':
      return '❌';
    case 'not-inspected':
    default:
      return '❓';
  }
}

// Show tooltip on marker hover
function showTooltip(event, item) {
  const tooltip = document.getElementById('map-tooltip');
  
  if (!tooltip) {
    console.error("Tooltip element not found");
    return;
  }
  
  // Prepare tooltip content
  let tooltipContent = `
    <div class="tooltip-header">
      <strong>${item.name}</strong>
    </div>
    <div class="tooltip-body">
      <div class="tooltip-row">
        <span class="tooltip-label">Type:</span>
        <span class="tooltip-value">${item.type === 'trail' ? 'Sentier' : 'Abri'}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">État:</span>
        <span class="tooltip-value status-${item.status}">${getStatusText(item.status)}</span>
      </div>
  `;
  
  // Add trail-specific information
  if (item.type === 'trail') {
    const trailStatusText = {
      'open': '🟢 Ouvert',
      'closed': '🔴 Fermé',
      'unknown': '❓ Inconnu'
    }[item.trailStatus || 'unknown'];
    
    tooltipContent += `
      <div class="tooltip-row">
        <span class="tooltip-label">Statut:</span>
        <span class="tooltip-value">${trailStatusText}</span>
      </div>
    `;
    
    if (item.difficulty) {
      tooltipContent += `
        <div class="tooltip-row">
          <span class="tooltip-label">Difficulté:</span>
          <span class="tooltip-value">${getDifficultyText(item.difficulty)}</span>
        </div>
      `;
    }
  }
  
  // Add last inspection date
  let inspectionText = 'Jamais inspecté';
  if (item.lastInspection && item.lastInspection.date) {
    const date = item.lastInspection.date.toDate();
    inspectionText = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
  
  tooltipContent += `
      <div class="tooltip-row">
        <span class="tooltip-label">Dernière inspection:</span>
        <span class="tooltip-value">${inspectionText}</span>
      </div>
    </div>
  `;
  
  tooltip.innerHTML = tooltipContent;
  
  // Position tooltip
  const rect = event.target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX + 20}px`;
  tooltip.style.top = `${rect.top + window.scrollY - 10}px`;
  tooltip.style.display = 'block';
}

// Hide tooltip
function hideTooltip() {
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

// Get status text
function getStatusText(status) {
  switch (status) {
    case 'good':
      return 'Bon';
    case 'warning':
      return 'Attention';
    case 'critical':
      return 'Critique';
    case 'not-inspected':
    default:
      return 'Non inspecté';
  }
}

// Get difficulty text
function getDifficultyText(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'Facile';
    case 'moderate':
      return 'Modéré';
    case 'difficult':
      return 'Difficile';
    case 'expert':
      return 'Expert';
    default:
      return 'Non spécifié';
  }
}