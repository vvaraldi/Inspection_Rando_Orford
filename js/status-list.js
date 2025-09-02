/**
 * status-list.js
 * Handles list view functionality for the public status page
 */

// Display items in list view
function displayListItems(data) {
  // Separate trails and shelters
  const trails = data.filter(item => item.type === 'trail');
  const shelters = data.filter(item => item.type === 'shelter');
  
  // Display trails with trail status
  const trailsTbody = document.getElementById('trails-tbody');
  if (trails.length === 0) {
    trailsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Aucun sentier trouvé</td></tr>';
  } else {
    trailsTbody.innerHTML = '';
    trails.forEach(trail => {
      trailsTbody.appendChild(createTrailListRow(trail));
    });
  }
  
  // Display shelters (unchanged)
  const sheltersTbody = document.getElementById('shelters-tbody');
  if (shelters.length === 0) {
    sheltersTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Aucun abri trouvé</td></tr>';
  } else {
    sheltersTbody.innerHTML = '';
    shelters.forEach(shelter => {
      sheltersTbody.appendChild(createShelterListRow(shelter));
    });
  }
}

// NEW: Create trail row with trail status column
function createTrailListRow(item) {
  const row = document.createElement('tr');
  
  // Name with difficulty badge
  let nameHtml = item.name;
  if (item.difficulty) {
    const difficultyText = {
      'easy': 'Facile',
      'medium': 'Intermédiaire',
      'hard': 'Difficile'
    }[item.difficulty];
    nameHtml += ` <span class="difficulty-badge difficulty-${item.difficulty}">${difficultyText}</span>`;
  }
  
  // Condition Status
  const conditionText = {
    'good': 'Bon',
    'warning': 'Attention',
    'critical': 'Critique',
    'not-inspected': 'Non inspecté'
  }[item.status];
  
  // NEW: Trail Status (open/closed)
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

// Separate function for shelter rows (unchanged structure)
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

// Updated applyFilters function to handle trail status filtering
function applyFilters() {
  if (!allData || allData.length === 0) {
    console.log("No data available for filtering");
    return;
  }

  let filteredData = [...allData];

  // Type filter
  const typeFilter = currentFilters.type;
  if (typeFilter && typeFilter !== 'all') {
    filteredData = filteredData.filter(item => item.type === typeFilter);
  }

  // Status filter (condition: good/warning/critical)
  const statusFilter = currentFilters.status;
  if (statusFilter && statusFilter !== 'all') {
    filteredData = filteredData.filter(item => item.status === statusFilter);
  }
  
  // NEW: Trail Status filter (open/closed) - only for trails
  const trailStatusFilter = currentFilters.trailStatus;
  if (trailStatusFilter && trailStatusFilter !== 'all') {
    filteredData = filteredData.filter(item => {
      if (item.type === 'trail') {
        return item.trailStatus === trailStatusFilter;
      }
      return true; // Don't filter shelters based on trail status
    });
  }

  // Difficulty filter - only for trails
  const difficultyFilter = currentFilters.difficulty;
  if (difficultyFilter && difficultyFilter !== 'all') {
    filteredData = filteredData.filter(item => {
      if (item.type === 'trail') {
        return item.difficulty === difficultyFilter;
      }
      return true; // Don't filter shelters based on difficulty
    });
  }

  // Date filter
  const dateFilter = currentFilters.date;
  if (dateFilter && dateFilter !== 'all') {
    const now = new Date();
    let cutoffDate;
    
    switch (dateFilter) {
      case 'today':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'never':
        filteredData = filteredData.filter(item => !item.lastInspection);
        break;
    }
    
    if (cutoffDate && dateFilter !== 'never') {
      filteredData = filteredData.filter(item => {
        if (!item.lastInspectionDate) return false;
        const inspectionDate = item.lastInspectionDate.toDate();
        return inspectionDate >= cutoffDate;
      });
    }
  }

  console.log(`Filters applied: ${filteredData.length} items remaining from ${allData.length} total`);
  
  // Update display with filtered data
  updateFilteredDisplay(filteredData);
}