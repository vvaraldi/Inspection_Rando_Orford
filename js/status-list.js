/**
 * status-list.js
 * Handles list view functionality for the public status page
 */

// Display items in list view
function displayListItems(data) {
  // Separate trails and shelters
  const trails = data.filter(item => item.type === 'trail');
  const shelters = data.filter(item => item.type === 'shelter');
  
  // Display trails
  const trailsTbody = document.getElementById('trails-tbody');
  if (trails.length === 0) {
    trailsTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Aucun sentier trouvé</td></tr>';
  } else {
    trailsTbody.innerHTML = '';
    trails.forEach(trail => {
      trailsTbody.appendChild(createListRow(trail));
    });
  }
  
  // Display shelters
  const sheltersTbody = document.getElementById('shelters-tbody');
  if (shelters.length === 0) {
    sheltersTbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Aucun abri trouvé</td></tr>';
  } else {
    sheltersTbody.innerHTML = '';
    shelters.forEach(shelter => {
      sheltersTbody.appendChild(createListRow(shelter));
    });
  }
}

// Create a row for the list
function createListRow(item) {
  const row = document.createElement('tr');
  
  // Name with difficulty badge if applicable
  let nameHtml = item.name;
  if (item.type === 'trail' && item.difficulty) {
    const difficultyText = {
      'easy': 'Facile',
      'medium': 'Intermédiaire',
      'hard': 'Difficile'
    }[item.difficulty];
    nameHtml += ` <span class="difficulty-badge difficulty-${item.difficulty}">${difficultyText}</span>`;
  }
  
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