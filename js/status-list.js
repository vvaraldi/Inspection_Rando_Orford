/**
 * status-list.js
 * List view functionality for the public status page (No Filters Version)
 */

// Display items in list view
function displayListItems(data) {
  console.log(`Displaying ${data.length} items in list view`);
  
  // Separate trails and shelters
  const trails = data.filter(item => item.type === 'trail');
  const shelters = data.filter(item => item.type === 'shelter');
  
  // Display trails
  displayTrailsList(trails);
  
  // Display shelters
  displaySheltersList(shelters);
}

// Display trails in the table
function displayTrailsList(trails) {
  const trailsTbody = document.getElementById('trails-tbody');
  
  if (!trailsTbody) {
    console.error("Trails tbody element not found");
    return;
  }
  
  if (trails.length === 0) {
    trailsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Aucun sentier trouvé</td></tr>';
    return;
  }
  
  // Clear existing content
  trailsTbody.innerHTML = '';
  
  // Add each trail
  trails.forEach(trail => {
    const row = createTrailListRow(trail);
    trailsTbody.appendChild(row);
  });
  
  console.log(`Displayed ${trails.length} trails`);
}

// Display shelters in the table
function displaySheltersList(shelters) {
  const sheltersTbody = document.getElementById('shelters-tbody');
  
  if (!sheltersTbody) {
    console.error("Shelters tbody element not found");
    return;
  }
  
  if (shelters.length === 0) {
    sheltersTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Aucun abri trouvé</td></tr>';
    return;
  }
  
  // Clear existing content
  sheltersTbody.innerHTML = '';
  
  // Add each shelter
  shelters.forEach(shelter => {
    const row = createShelterListRow(shelter);
    sheltersTbody.appendChild(row);
  });
  
  console.log(`Displayed ${shelters.length} shelters`);
}

// Create a row for trail display
function createTrailListRow(item) {
  const row = document.createElement('tr');
  
  let nameHtml = item.name;
  
  // Status (condition)
  const conditionText = {
    'good': 'Bon',
    'warning': 'Attention',
    'critical': 'Critique',
    'not-inspected': 'Non inspecté'
  }[item.status];
  
  // Trail status (open/closed)
  const trailStatusText = {
    'open': '🟢 Ouvert',
    'closed': '🔴 Fermé',
    'unknown': '❓ Inconnu'
  }[item.trailStatus || 'unknown'];
  
  // Last inspection date
  let inspectionDate = 'Jamais';
  if (item.lastInspection && item.lastInspection.date) {
    const date = item.lastInspection.date.toDate();
    inspectionDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
  
  row.innerHTML = `
    <td>${nameHtml}</td>
    <td><span class="status-badge status-${item.status}">${conditionText}</span></td>
    <td><span class="status-badge status-${item.trailStatus || 'unknown'}">${trailStatusText}</span></td>
    <td>${inspectionDate}</td>
  `;
  
  return row;
}

// Create a row for shelter display
function createShelterListRow(item) {
  const row = document.createElement('tr');
  
  let nameHtml = item.name;
  
  // Status
  const statusText = {
    'good': 'Bon',
    'warning': 'Attention',
    'critical': 'Critique',
    'not-inspected': 'Non inspecté'
  }[item.status];
  
  // Last inspection date
  let inspectionDate = 'Jamais';
  if (item.lastInspection && item.lastInspection.date) {
    const date = item.lastInspection.date.toDate();
    inspectionDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }
  
  row.innerHTML = `
    <td>${nameHtml}</td>
    <td><span class="status-badge status-${item.status}">${statusText}</span></td>
    <td>${inspectionDate}</td>
  `;
  
  return row;
}