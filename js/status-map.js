/**
 * status-map.js
 * Map view functionality for the public status page
 * SIMPLIFIED VERSION - ONLY TRAIL MARKERS WITH OPEN/CLOSED STATUS
 */

// Main entry point - called by status-main.js
function displayMapItems(data) {
  // Filter to show ONLY trails
  const trails = data.filter(item => item.type === 'trail');
  
  console.log(`Displaying ${trails.length} trail markers on map`);
  
  // Clear existing markers
  clearMapMarkers();
  
  // Display trail markers
  displayTrailMarkers(trails);
}

// Clear all existing markers from the map
function clearMapMarkers() {
  const mapWrapper = document.querySelector('.map-wrapper');
  if (mapWrapper) {
    const existingMarkers = mapWrapper.querySelectorAll('.map-marker');
    existingMarkers.forEach(marker => marker.remove());
  }
}

// Display trail markers on the map
function displayTrailMarkers(trails) {
  const mapWrapper = document.querySelector('.map-wrapper');
  
  if (!mapWrapper) {
    console.error("Map wrapper not found");
    return;
  }
  
  trails.forEach(trail => {
    const marker = createTrailMarker(trail);
    if (marker) {
      mapWrapper.appendChild(marker);
    }
  });
  
  console.log(`Displayed ${trails.length} trail markers`);
}

// Create a trail marker element
function createTrailMarker(trail) {
  // Skip if no coordinates
  if (!trail.coordinates) {
    console.warn(`Missing coordinates for trail ${trail.id}`);
    return null;
  }
  
  const marker = document.createElement('div');
  
  // Use trail status (open/closed/unknown) for coloring
  const trailStatus = trail.trailStatus || 'unknown';
  marker.className = `map-marker trail-status-${trailStatus}`;
  
  // Position the marker
  marker.style.left = `${trail.coordinates.left}px`;
  marker.style.top = `${trail.coordinates.top}px`;
  
  // Extract trail number from ID
  let trailNumber = '';
  if (trail.id.includes('trail_')) {
    trailNumber = trail.id.replace('trail_', '');
  } else if (trail.id.includes('_')) {
    const parts = trail.id.split('_');
    trailNumber = parts[parts.length - 1];
  } else {
    const match = trail.id.match(/(\d+)$/);
    trailNumber = match ? match[1] : trail.id;
  }
  
  // Set marker content
  marker.textContent = trailNumber;
  
  // Set tooltip with trail name and status
  const statusText = {
    'open': 'Ouvert',
    'closed': 'Fermé',
    'unknown': 'Statut inconnu'
  }[trailStatus];
  
  marker.setAttribute('title', `${trail.name}\nStatut: ${statusText}`);
  
  return marker;
}