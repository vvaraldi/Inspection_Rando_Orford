/**
 * status-main.js
 * Main functionality for the public status page
 * SIMPLIFIED VERSION - MAP ONLY, TRAILS ONLY
 */

// Global variables
let allData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadPublicData();
  
  // Auto-refresh every 5 minutes
  setInterval(loadPublicData, 5 * 60 * 1000);
});

// Load public data from Firebase (trails only)
async function loadPublicData() {
  try {
    console.log("Starting to load public data...");
    allData = [];
    
    // Load trails only (no shelters needed for public status)
    console.log("Loading trails...");
    const trailsSnapshot = await db.collection('trails').get();
    console.log(`Found ${trailsSnapshot.size} trails`);
    
    for (const doc of trailsSnapshot.docs) {
      const trail = doc.data();
      trail.id = doc.id;
      trail.type = 'trail';
      
      // Fetch last inspection
      const inspectionSnapshot = await db.collection('inspections')
        .where('trail_id', '==', doc.id)
        .orderBy('date', 'desc')
        .limit(1)
        .get();
      
      if (!inspectionSnapshot.empty) {
        trail.lastInspection = inspectionSnapshot.docs[0].data();
        trail.status = trail.lastInspection.condition || 'not-inspected';
        trail.trailStatus = trail.lastInspection.trail_status || 'unknown';
      } else {
        trail.lastInspection = null;
        trail.status = 'not-inspected';
        trail.trailStatus = 'unknown';
      }
      
      allData.push(trail);
    }
    
    console.log(`Total trails loaded: ${allData.length}`);
    
    // Update last update time
    updateLastUpdateTime();
    
    // Display on map
    displayMapItems(allData);
    
  } catch (error) {
    console.error("Error loading public data:", error);
  }
}

// Update the last update time display
function updateLastUpdateTime() {
  const timeElement = document.getElementById('last-update-time');
  if (timeElement) {
    const now = new Date();
    timeElement.textContent = now.toLocaleString('fr-CA', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }
}