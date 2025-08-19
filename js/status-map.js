/**
 * status-map.js
 * Handles map view functionality for the public status page
 */

// Display markers on the map
function displayMapMarkers(data) {
  const mapWrapper = document.querySelector('.map-wrapper');
  
  if (!mapWrapper) {
    console.error('Map wrapper not found');
    return;
  }
  
  // Remove existing markers
  mapWrapper.querySelectorAll('.trail-marker').forEach(marker => marker.remove());
  
  // Create new markers
  data.forEach(item => {
    if (!item.coordinates) {
      return;
    }
    
    const marker = document.createElement('div');
    marker.className = `trail-marker marker-${item.status}`;
    
    // Marker content
    if (item.type === 'shelter') {
      // Display 'A' + shelter number for shelters
      const shelterNumber = item.id.replace('shelter_', '');
      marker.innerHTML = `A${shelterNumber}`;
    } else {
      // Display trail number for trails
      const trailNumber = item.id.replace('trail_', '');
      marker.textContent = trailNumber;
    }
    
    // Position the marker using the exact coordinate format from Firebase
    // The coordinates should have 'left' and 'top' properties
    if (item.coordinates.left !== undefined && item.coordinates.top !== undefined) {
      marker.style.left = `${item.coordinates.left}px`;
      marker.style.top = `${item.coordinates.top}px`;
    } else {
      console.warn(`Invalid coordinates for ${item.name}:`, item.coordinates);
      return;
    }
    
    // Add tooltip interaction
    marker.addEventListener('mouseenter', (e) => showTooltip(e, item));
    marker.addEventListener('mouseleave', hideTooltip);
    
    // Add click event for future functionality
    marker.addEventListener('click', () => {
      console.log(`Clicked on ${item.name}`);
    });
    
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
  
  // Add issues if any
  if (item.lastInspection && item.lastInspection.issues && item.lastInspection.issues.length > 0) {
    content += '<br>Problèmes: ' + item.lastInspection.issues.length;
  }
  
  tooltip.innerHTML = content;
  tooltip.style.display = 'block';
  
  // Position tooltip above the marker
  const rect = marker.getBoundingClientRect();
  const mapRect = marker.parentElement.getBoundingClientRect();
  
  tooltip.style.left = (rect.left - mapRect.left + rect.width / 2) + 'px';
  tooltip.style.top = (rect.top - mapRect.top - 40) + 'px';
}

// Hide tooltip
function hideTooltip() {
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}