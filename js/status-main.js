/**
 * status-main.js
 * Main functionality for the public status page
 */

// Global variables
let allData = [];
let currentFilter = 'all';
let currentView = 'map';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadPublicData();
  setupViewToggle();
  setupFilters();
  
  // Auto-refresh every 5 minutes
  setInterval(loadPublicData, 5 * 60 * 1000);
});

// Setup view toggle (map/list)
function setupViewToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active state
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Change view
      currentView = this.dataset.view;
      
      if (currentView === 'map') {
        document.getElementById('map-view').classList.add('active');
        document.getElementById('list-view').classList.remove('active');
      } else {
        document.getElementById('map-view').classList.remove('active');
        document.getElementById('list-view').classList.add('active');
      }
    });
  });
}

// Setup filter buttons
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Apply filter
      currentFilter = this.dataset.filter;
      displayData();
    });
  });
}

// Load public data from Firebase
async function loadPublicData() {
  try {
    console.log("Starting to load public data...");
    allData = [];
    
    // Load trails
    console.log("Loading trails...");
    const trailsSnapshot = await db.collection('trails').get();
    console.log(`Found ${trailsSnapshot.size} trails`);
    
    const trails = new Map();
    trailsSnapshot.forEach(doc => {
      const data = doc.data();
      trails.set(doc.id, { id: doc.id, ...data });
    });
    
    // Load shelters
    console.log("Loading shelters...");
    const sheltersSnapshot = await db.collection('shelters').get();
    console.log(`Found ${sheltersSnapshot.size} shelters`);
    
    const shelters = new Map();
    sheltersSnapshot.forEach(doc => {
      const data = doc.data();
      shelters.set(doc.id, { id: doc.id, ...data });
    });
    
    // Load ALL trail inspections (no time limit)
    console.log("Loading all trail inspections...");
    let trailInspectionsByLocation = {};
    try {
      const trailInspectionsSnapshot = await db.collection('trail_inspections')
        .orderBy('date', 'desc')
        .get();
      
      console.log(`Found ${trailInspectionsSnapshot.size} trail inspections total`);
      
      // Group by trail_id and keep only the most recent
      trailInspectionsSnapshot.forEach(doc => {
        const inspection = { id: doc.id, ...doc.data() };
        const locationId = inspection.trail_id;
        
        // Keep only the most recent inspection for each trail
        if (!trailInspectionsByLocation[locationId]) {
          trailInspectionsByLocation[locationId] = inspection;
        }
      });
    } catch (error) {
      console.log("Could not load trail_inspections:", error.message);
    }
    
    // Load ALL shelter inspections (no time limit)
    console.log("Loading all shelter inspections...");
    let shelterInspectionsByLocation = {};
    try {
      const shelterInspectionsSnapshot = await db.collection('shelter_inspections')
        .orderBy('date', 'desc')
        .get();
      
      console.log(`Found ${shelterInspectionsSnapshot.size} shelter inspections total`);
      
      // Group by shelter_id and keep only the most recent
      shelterInspectionsSnapshot.forEach(doc => {
        const inspection = { id: doc.id, ...doc.data() };
        const locationId = inspection.shelter_id;
        
        // Keep only the most recent inspection for each shelter
        if (!shelterInspectionsByLocation[locationId]) {
          shelterInspectionsByLocation[locationId] = inspection;
        }
      });
    } catch (error) {
      console.log("Could not load shelter_inspections:", error.message);
    }
    
    // Combine trails with their inspections
    trails.forEach((trail, id) => {
      const lastInspection = trailInspectionsByLocation[id];
      const dataItem = {
        type: 'trail',
        id: id,
        name: trail.name || 'Sentier sans nom',
        difficulty: trail.difficulty,
        coordinates: trail.coordinates, // Use the coordinates field directly
        status: lastInspection ? lastInspection.condition : 'not-inspected',
        lastInspection: lastInspection ? {
          date: lastInspection.date,
          inspector: lastInspection.inspector_name,
          issues: lastInspection.issues
        } : null
      };
      allData.push(dataItem);
    });
    
    // Combine shelters with their inspections
    shelters.forEach((shelter, id) => {
      const lastInspection = shelterInspectionsByLocation[id];
      const dataItem = {
        type: 'shelter',
        id: id,
        name: shelter.name || 'Abri sans nom',
        coordinates: shelter.coordinates, // Use the coordinates field directly
        status: lastInspection ? lastInspection.condition : 'not-inspected',
        lastInspection: lastInspection ? {
          date: lastInspection.date,
          inspector: lastInspection.inspector_name,
          issues: lastInspection.issues
        } : null
      };
      allData.push(dataItem);
    });
    
    console.log(`Total data items: ${allData.length}`);
    
    // Update last update time
    const now = new Date();
    document.getElementById('last-update-time').textContent = 
      `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} à ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Display the data
    displayData();
    
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
    handleLoadError();
  }
}

// Handle loading errors
function handleLoadError() {
  const errorMessage = '<tr><td colspan="4" style="text-align: center; color: #e02424;">Erreur lors du chargement des données.</td></tr>';
  
  const trailsTbody = document.getElementById('trails-tbody');
  const sheltersTbody = document.getElementById('shelters-tbody');
  
  if (trailsTbody) trailsTbody.innerHTML = errorMessage;
  if (sheltersTbody) sheltersTbody.innerHTML = errorMessage;
}

// Display filtered data
function displayData() {
  // Filter data
  let filteredData = allData;
  
  switch (currentFilter) {
    case 'trails':
      filteredData = allData.filter(item => item.type === 'trail');
      break;
    case 'shelters':
      filteredData = allData.filter(item => item.type === 'shelter');
      break;
    case 'good':
      filteredData = allData.filter(item => item.status === 'good');
      break;
    case 'warning':
      filteredData = allData.filter(item => item.status === 'warning');
      break;
    case 'critical':
      filteredData = allData.filter(item => item.status === 'critical');
      break;
    case 'not-inspected':
      filteredData = allData.filter(item => item.status === 'not-inspected');
      break;
  }
  
  // Display in map view
  displayMapMarkers(filteredData);
  
  // Display in list view
  displayListItems(filteredData);
}