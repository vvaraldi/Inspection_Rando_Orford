/**
 * status-main.js
 * Main functionality for the public status page (No Filters Version)
 */

// Global variables
let allData = [];
let currentView = 'map';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadPublicData();
  setupViewToggle();
  
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
      
      console.log(`Processed inspections for ${Object.keys(trailInspectionsByLocation).length} unique trails`);
    } catch (error) {
      console.error("Error loading trail inspections:", error);
    }
    
    // Load shelter inspections
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
        
        if (!shelterInspectionsByLocation[locationId]) {
          shelterInspectionsByLocation[locationId] = inspection;
        }
      });
      
      console.log(`Processed inspections for ${Object.keys(shelterInspectionsByLocation).length} unique shelters`);
    } catch (error) {
      console.error("Error loading shelter inspections:", error);
    }
    
    // Process trails with their status
    console.log("Processing trail data...");
    trails.forEach((trail, trailId) => {
      const lastInspection = trailInspectionsByLocation[trailId];
      
      allData.push({
        id: trailId,
        name: trail.name,
        type: 'trail',
        difficulty: trail.difficulty,
        length: trail.length,
        coordinates: trail.coordinates,
        
        // Status from inspection condition (good/warning/critical)
        status: lastInspection ? lastInspection.condition : 'not-inspected',
        
        // Trail Status from trail document (open/closed) - persistent field
        trailStatus: trail.status || 'unknown',
        
        lastInspection: lastInspection,
        lastInspectionDate: lastInspection ? lastInspection.date : null
      });
    });
    
    // Process shelters (unchanged)
    console.log("Processing shelter data...");
    shelters.forEach((shelter, shelterId) => {
      const lastInspection = shelterInspectionsByLocation[shelterId];
      
      allData.push({
        id: shelterId,
        name: shelter.name,
        type: 'shelter',
        capacity: shelter.capacity,
        altitude: shelter.altitude,
        coordinates: shelter.coordinates,
        status: lastInspection ? lastInspection.condition : 'not-inspected',
        lastInspection: lastInspection,
        lastInspectionDate: lastInspection ? lastInspection.date : null
      });
    });
    
    console.log(`Total data processed: ${allData.length} items`);
    console.log("Data loading completed successfully");
    
    // Update display with all data (no filtering)
    displayData();
    
  } catch (error) {
    console.error("Error in loadPublicData:", error);
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

// Display all data without filtering
function displayData() {
  // Display in map view
  displayMapMarkers(allData);
  
  // Display in list view
  displayListItems(allData);
  
  // Update last update time
  updateLastUpdateTime();
}

// Update the last update time display
function updateLastUpdateTime() {
  const lastUpdateElement = document.getElementById('last-update-time');
  if (lastUpdateElement) {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    lastUpdateElement.textContent = timeString;
  }
}