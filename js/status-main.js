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
    console.log("Loading public data from Firebase...");
    
    // Reset data array
    allData = [];
    
    // Load trails
    const trailsSnapshot = await db.collection('trails').get();
    
    // Load shelters
    const sheltersSnapshot = await db.collection('shelters').get();
    
    // Process trails
    trailsSnapshot.forEach(doc => {
      const trailData = doc.data();
      
      // Get the most recent inspection
      let lastInspection = null;
      if (trailData.inspections && Array.isArray(trailData.inspections) && trailData.inspections.length > 0) {
        // Sort inspections by date and get the most recent
        const sortedInspections = trailData.inspections
          .filter(inspection => inspection && inspection.date)
          .sort((a, b) => {
            const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
            return dateB - dateA;
          });
        
        if (sortedInspections.length > 0) {
          lastInspection = sortedInspections[0];
        }
      }
      
      allData.push({
        id: doc.id,
        name: trailData.name || 'Sentier sans nom',
        type: 'trail',
        difficulty: trailData.difficulty || 'unknown',
        trailStatus: trailData.status || 'unknown',
        coordinates: trailData.coordinates || { top: 0, left: 0 }, // Use top/left pixel coordinates
        status: lastInspection ? lastInspection.condition : 'not-inspected',
        lastInspection: lastInspection,
        lastInspectionDate: lastInspection ? lastInspection.date : null
      });
    });
    
    // Process shelters
    sheltersSnapshot.forEach(doc => {
      const shelterData = doc.data();
      
      // Get the most recent inspection
      let lastInspection = null;
      if (shelterData.inspections && Array.isArray(shelterData.inspections) && shelterData.inspections.length > 0) {
        // Sort inspections by date and get the most recent
        const sortedInspections = shelterData.inspections
          .filter(inspection => inspection && inspection.date)
          .sort((a, b) => {
            const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
            return dateB - dateA;
          });
        
        if (sortedInspections.length > 0) {
          lastInspection = sortedInspections[0];
        }
      }
      
      allData.push({
        id: doc.id,
        name: shelterData.name || 'Abri sans nom',
        type: 'shelter',
        coordinates: shelterData.coordinates || { top: 0, left: 0 }, // Use top/left pixel coordinates
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