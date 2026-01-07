/**
 * Photo Map Modal - Display photo location on local map
 * 
 * Uses affine transformation to convert GPS coordinates to pixel positions
 * on the map image, accounting for map rotation/tilt.
 * 
 * Map calibration points (3 corners):
 * - Top-Right:    45.325861°N, -72.249972°W → pixel (800, 0)
 * - Bottom-Left:  45.299444°N, -72.205667°W → pixel (0, 700)
 * - Top-Left:     45.296611°N, -72.243361°W → pixel (0, 0)
 * 
 * @version 1.0.0
 */

const PhotoMapModal = (function() {
  'use strict';

  // Map image dimensions
  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 700;

  // Calibration points (GPS coordinates for 3 corners)
  const calibrationPoints = {
    topRight: {
      lat: 45.325861,
      lon: -72.249972,
      x: MAP_WIDTH,
      y: 0
    },
    bottomLeft: {
      lat: 45.299444,
      lon: -72.205667,
      x: 0,
      y: MAP_HEIGHT
    },
    topLeft: {
      lat: 45.296611,
      lon: -72.243361,
      x: 0,
      y: 0
    }
  };

  // Transformation matrix coefficients (calculated once)
  let transformMatrix = null;

  /**
   * Calculate the affine transformation matrix from GPS to pixel coordinates
   * Using 3 points to solve for 6 unknowns (a, b, c, d, e, f)
   * where: x = a*lat + b*lon + c
   *        y = d*lat + e*lon + f
   */
  function calculateTransformMatrix() {
    const p1 = calibrationPoints.topLeft;
    const p2 = calibrationPoints.topRight;
    const p3 = calibrationPoints.bottomLeft;

    // Build the system of equations for X coordinates
    // [lat1, lon1, 1] [a]   [x1]
    // [lat2, lon2, 1] [b] = [x2]
    // [lat3, lon3, 1] [c]   [x3]

    const matrix = [
      [p1.lat, p1.lon, 1, p1.x],
      [p2.lat, p2.lon, 1, p2.x],
      [p3.lat, p3.lon, 1, p3.x]
    ];

    const matrixY = [
      [p1.lat, p1.lon, 1, p1.y],
      [p2.lat, p2.lon, 1, p2.y],
      [p3.lat, p3.lon, 1, p3.y]
    ];

    // Solve using Cramer's rule
    const coeffsX = solveSystem(matrix);
    const coeffsY = solveSystem(matrixY);

    transformMatrix = {
      a: coeffsX[0], b: coeffsX[1], c: coeffsX[2],
      d: coeffsY[0], e: coeffsY[1], f: coeffsY[2]
    };

    console.log('PhotoMapModal: Transform matrix calculated:', transformMatrix);
    return transformMatrix;
  }

  /**
   * Solve a 3x3 system of linear equations using Cramer's rule
   * @param {Array} m - Augmented matrix [[a1,b1,c1,d1], [a2,b2,c2,d2], [a3,b3,c3,d3]]
   * @returns {Array} - Solution [x, y, z]
   */
  function solveSystem(m) {
    // Calculate determinant of coefficient matrix
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
              - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
              + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    if (Math.abs(det) < 1e-10) {
      console.error('PhotoMapModal: Singular matrix, cannot solve');
      return [0, 0, 0];
    }

    // Cramer's rule for each variable
    const detX = m[0][3] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
               - m[0][1] * (m[1][3] * m[2][2] - m[1][2] * m[2][3])
               + m[0][2] * (m[1][3] * m[2][1] - m[1][1] * m[2][3]);

    const detY = m[0][0] * (m[1][3] * m[2][2] - m[1][2] * m[2][3])
               - m[0][3] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
               + m[0][2] * (m[1][0] * m[2][3] - m[1][3] * m[2][0]);

    const detZ = m[0][0] * (m[1][1] * m[2][3] - m[1][3] * m[2][1])
               - m[0][1] * (m[1][0] * m[2][3] - m[1][3] * m[2][0])
               + m[0][3] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    return [detX / det, detY / det, detZ / det];
  }

  /**
   * Convert GPS coordinates to pixel position on map
   * @param {number} latitude - GPS latitude in decimal degrees
   * @param {number} longitude - GPS longitude in decimal degrees
   * @returns {Object|null} - {x, y} pixel coordinates or null if out of bounds
   */
  function gpsToPixel(latitude, longitude) {
    // Calculate transform matrix if not done yet
    if (!transformMatrix) {
      calculateTransformMatrix();
    }

    // Apply affine transformation
    const x = transformMatrix.a * latitude + transformMatrix.b * longitude + transformMatrix.c;
    const y = transformMatrix.d * latitude + transformMatrix.e * longitude + transformMatrix.f;

    // Round to integers
    const pixelX = Math.round(x);
    const pixelY = Math.round(y);

    // Check if within map bounds (with some margin)
    const margin = 50; // Allow slightly outside for edge photos
    const isInBounds = pixelX >= -margin && pixelX <= MAP_WIDTH + margin &&
                       pixelY >= -margin && pixelY <= MAP_HEIGHT + margin;

    if (!isInBounds) {
      console.warn('PhotoMapModal: Coordinates outside map bounds:', { latitude, longitude, pixelX, pixelY });
    }

    return {
      x: Math.max(0, Math.min(MAP_WIDTH, pixelX)),
      y: Math.max(0, Math.min(MAP_HEIGHT, pixelY)),
      isInBounds: isInBounds
    };
  }

  /**
   * Check if GPS coordinates are within map coverage area
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  function isWithinMapArea(latitude, longitude) {
    const pixel = gpsToPixel(latitude, longitude);
    return pixel && pixel.isInBounds;
  }

  /**
   * Create the photo map modal HTML
   */
  function createModalHTML() {
    // Check if modal already exists
    if (document.getElementById('photo-map-modal')) {
      return;
    }

    const modalHTML = `
      <div class="modal" id="photo-map-modal">
        <div class="modal-content photo-map-modal-content">
          <div class="modal-header">
            <h2 class="modal-title">📍 Localisation de la photo</h2>
            <button class="modal-close" id="close-photo-map-modal">✕</button>
          </div>
          
          <div class="modal-body photo-map-modal-body">
            <div class="photo-map-container">
              <div class="photo-map-wrapper">
                <img src="assets/map3.png" alt="Carte du Mont Orford" class="photo-map-image" id="photo-map-image">
                <div class="photo-location-marker" id="photo-location-marker">
                  <div class="marker-pin"></div>
                  <div class="marker-pulse"></div>
                </div>
              </div>
            </div>
            <div class="photo-map-info" id="photo-map-info">
              <!-- Coordinates info will be inserted here -->
            </div>
          </div>
          
          <div class="modal-footer">
            <a href="#" target="_blank" class="btn btn-primary" id="photo-map-google-link">
              🗺️ Ouvrir dans Google Maps
            </a>
            <button class="btn btn-secondary" id="close-photo-map-modal-btn">Fermer</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    bindModalEvents();
  }

  /**
   * Bind modal close events
   */
  function bindModalEvents() {
    const modal = document.getElementById('photo-map-modal');
    const closeBtn = document.getElementById('close-photo-map-modal');
    const closeBtnFooter = document.getElementById('close-photo-map-modal-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closePhotoMapModal();
      });
    }

    if (closeBtnFooter) {
      closeBtnFooter.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closePhotoMapModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closePhotoMapModal();
        }
      });
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('photo-map-modal');
        if (modal && modal.classList.contains('show')) {
          closePhotoMapModal();
        }
      }
    });
  }

  /**
   * Open the photo map modal and show location
   * @param {number} latitude - GPS latitude
   * @param {number} longitude - GPS longitude
   */
  function openPhotoMapModal(latitude, longitude) {
    // Create modal if it doesn't exist
    createModalHTML();

    const modal = document.getElementById('photo-map-modal');
    const marker = document.getElementById('photo-location-marker');
    const infoDiv = document.getElementById('photo-map-info');
    const googleLink = document.getElementById('photo-map-google-link');

    if (!modal || !marker) {
      console.error('PhotoMapModal: Modal elements not found');
      return;
    }

    // Convert GPS to pixel coordinates
    const pixel = gpsToPixel(latitude, longitude);
    
    if (!pixel) {
      console.error('PhotoMapModal: Could not convert coordinates');
      return;
    }

    // Position the marker
    marker.style.left = `${pixel.x}px`;
    marker.style.top = `${pixel.y}px`;
    marker.style.display = 'block';

    // Update info section
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'O';
    
    infoDiv.innerHTML = `
      <div class="coords-display">
        <span class="coords-label">Coordonnées GPS:</span>
        <span class="coords-value">${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lonDir}</span>
      </div>
      ${!pixel.isInBounds ? '<div class="coords-warning">⚠️ Cette position est en dehors de la zone de la carte</div>' : ''}
    `;

    // Update Google Maps link
    googleLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;

    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Scroll map to center on marker if needed
    const mapWrapper = document.querySelector('.photo-map-wrapper');
    if (mapWrapper) {
      const wrapperRect = mapWrapper.getBoundingClientRect();
      const scrollLeft = pixel.x - wrapperRect.width / 2;
      const scrollTop = pixel.y - wrapperRect.height / 2;
      mapWrapper.scrollLeft = Math.max(0, scrollLeft);
      mapWrapper.scrollTop = Math.max(0, scrollTop);
    }

    console.log('PhotoMapModal: Opened at', { latitude, longitude, pixel });
  }

  /**
   * Close the photo map modal
   */
  function closePhotoMapModal() {
    const modal = document.getElementById('photo-map-modal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // Initialize transform matrix on load
  calculateTransformMatrix();

  // Public API
  return {
    gpsToPixel: gpsToPixel,
    isWithinMapArea: isWithinMapArea,
    openPhotoMapModal: openPhotoMapModal,
    closePhotoMapModal: closePhotoMapModal,
    
    // Expose for testing/debugging
    _internal: {
      calculateTransformMatrix: calculateTransformMatrix,
      transformMatrix: () => transformMatrix,
      calibrationPoints: calibrationPoints
    }
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.PhotoMapModal = PhotoMapModal;
  // Convenience function for onclick handlers
  window.openPhotoLocationModal = function(lat, lon) {
    PhotoMapModal.openPhotoMapModal(lat, lon);
  };
}