/**
 * status-map.js
 * Map view functionality for the public status page
 * FINAL VERSION - ONLY TRAIL MARKERS, NO SHELTER MARKERS, NO TOOLTIPS
 */

// Display markers on the map - ONLY TRAILS
function displayMapMarkers(data) {
  // Filter to show ONLY trails - completely exclude shelters
  const trails = data.filter(item => item.type === 'trail');
  
  console.log(`Displaying ${trails.length} trail markers on map (shelters completely excluded)`);
  
  // Clear existing markers
  clearMapMarkers();
  
  // Display only trail markers
  displayTrailMarkers(trails);
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

// Create a trail marker element
function createTrailMarker(trail) {
  const marker = document.createElement('div');
  
  // Use ONLY trail status (open/closed/unknown) for coloring - NOT inspection status
  const trailStatus = trail.trailStatus || 'unknown';
  marker.className = `map-marker trail-marker trail-status-${trailStatus}`;
  
  // Position the marker based on coordinates (using pixel coordinates from database)
  if (trail.coordinates) {
    marker.style.left = `${trail.coordinates.left}px`;
    marker.style.top = `${trail.coordinates.top}px`;
  }
  
  // Extract trail number from ID - handle different ID formats
  let trailNumber = '';
  if (trail.id.includes('trail_')) {
    trailNumber = trail.id.replace('trail_', '');
  } else if (trail.id.includes('_')) {
    // Handle other formats like "some_trail_5"
    const parts = trail.id.split('_');
    trailNumber = parts[parts.length - 1]; // Get last part
  } else {
    // If no underscore, try to extract number from end
    const match = trail.id.match(/(\d+)$/);
    trailNumber = match ? match[1] : trail.id;
  }
  
  // Set marker content - trail number only, no status icons
  marker.textContent = trailNumber;
  
  // Debug log to verify trail number extraction and status
  console.log(`Trail ${trail.id} -> Number: "${trailNumber}", Status: ${trailStatus}, Coordinates:`, trail.coordinates);
  
  return marker;
}

// NO SHELTER MARKER FUNCTIONS
// NO TOOLTIP FUNCTIONS  
// NO HOVER FUNCTIONALITY
// This file only handles trail markers with numbers and trail status colors