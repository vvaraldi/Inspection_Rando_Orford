/**
 * status-map.js
 * Handles map view functionality for the public status page
 */

// Display markers on the map
function displayMapMarkers(data) {
  const mapWrapper = document.querySelector('.map-wrapper');
  
  // Remove existing markers
  mapWrapper.querySelectorAll('.trail-marker').forEach(marker => marker.remove());
  
  // Create new markers
  data.forEach(item => {
    if (!item.coordinates) return;
    
    const marker = document.createElement('div');
    marker.className = `trail-marker marker-${item.status}`;
    
    // Marker text
    if (item.type === 'shelter') {
      marker.innerHTML = '🏠';
    } else {
      // Trail number
      const trailNumber = item.name.match(/\d+/);
      marker.innerHTML = trailNumber ? trailNumber[0] : item.name.charAt(0);
    }
    
    // Position the marker
    marker.style.left = `${item.coordinates.x}px`;
    marker.style.top = `${item.coordinates.y}px`;
    
    // Add tooltip interaction
    marker.addEventListener('mouseenter', (e) => showTooltip(e, item));
    marker.addEventListener('mouseleave', hideTooltip);
    
    mapWrapper.appendChild(marker);
  });
}

// Show tooltip
function showTooltip(event, item) {
  const tooltip = document.getElementById('map-tooltip');
  const marker = event.target;
  
  // Tooltip content
  let content = `<strong>${item.name}</strong><br>`;
  
  // Status
  const statusText = {
    'good': 'Bon état',
    'warning': 'Attention',
    'critical': 'Critique',
    'not-inspected': 'Non inspecté'
  }[item.status];
  content += `État: ${statusText}<br>`;
  
  // Inspection date
  if (item.lastInspection && item.lastInspection.date) {
    const date = item.lastInspection.date.toDate();
    content += `Inspecté: ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  } else {
    content += 'Jamais inspecté';
  }
  
  tooltip.innerHTML = content;
  tooltip.style.display = 'block';
  
  // Tooltip position
  const rect = marker.getBoundingClientRect();
  const mapRect = marker.parentElement.getBoundingClientRect();
  
  tooltip.style.left = (rect.left - mapRect.left + rect.width / 2) + 'px';
  tooltip.style.top = (rect.top - mapRect.top - 40) + 'px';
}

// Hide tooltip
function hideTooltip() {
  document.getElementById('map-tooltip').style.display = 'none';
}