/**
 * EXIF Utilities for Photo Metadata Extraction
 * 
 * This utility extracts GPS coordinates and timestamp from photo EXIF data.
 * It's designed to work with cell phone photos that contain location metadata.
 * Falls back to browser geolocation for live camera photos without EXIF GPS.
 * 
 * Usage:
 *   const metadata = await ExifUtils.extractPhotoMetadata(file);
 * 
 * Dependencies:
 *   - exif-js library (loaded via CDN in HTML)
 * 
 * @version 1.2.0 - Added browser geolocation fallback for live camera photos
 */

const ExifUtils = (function() {
  'use strict';

  /**
   * Extract metadata from a photo file
   * If no GPS in EXIF data, falls back to browser geolocation (for live camera photos)
   * @param {File} file - The image file to extract metadata from
   * @returns {Promise<Object>} - Photo metadata object
   */
  async function extractPhotoMetadata(file) {
    const result = {
      filename: file.name,
      coordinates: null,
      timestamp: null,
      hasGpsData: false,
      gpsSource: null  // 'exif' or 'browser'
    };

    // Only process image files
    if (!file.type.startsWith('image/')) {
      console.warn('ExifUtils: File is not an image:', file.name);
      return result;
    }

    // Step 1: Try to extract GPS from EXIF data
    try {
      const exifData = await readExifData(file);
      
      if (exifData) {
        // Extract GPS coordinates from EXIF
        result.coordinates = extractGpsCoordinates(exifData);
        if (result.coordinates) {
          result.hasGpsData = true;
          result.gpsSource = 'exif';
          console.log('ExifUtils: GPS extracted from EXIF for', file.name);
        }
        
        // Extract timestamp (when photo was taken)
        result.timestamp = extractTimestamp(exifData);
      }
    } catch (error) {
      console.warn('ExifUtils: Error reading EXIF data for', file.name, error);
    }

    // Step 2: Fallback to browser geolocation if no EXIF GPS
    // This is useful for photos taken directly from camera in browser
    if (!result.coordinates) {
      console.log('ExifUtils: No EXIF GPS, trying browser geolocation...');
      try {
        const browserCoords = await getBrowserGeolocation();
        if (browserCoords) {
          result.coordinates = browserCoords;
          result.hasGpsData = true;
          result.gpsSource = 'browser';
          console.log('ExifUtils: Using browser geolocation for', file.name, browserCoords);
        }
      } catch (geoError) {
        console.log('ExifUtils: Browser geolocation not available:', geoError.message);
      }
    }

    return result;
  }

  /**
   * Get current position from browser geolocation API
   * @returns {Promise<Object|null>} - { latitude, longitude } or null
   */
  function getBrowserGeolocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Math.round(position.coords.latitude * 1000000) / 1000000,
            longitude: Math.round(position.coords.longitude * 1000000) / 1000000
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000  // Cache position for 1 minute
        }
      );
    });
  }

  /**
   * Read EXIF data from a file using exif-js library
   * @param {File} file - The image file
   * @returns {Promise<Object|null>} - Raw EXIF data or null
   */
  function readExifData(file) {
    return new Promise((resolve) => {
      // Check if EXIF library is loaded
      if (typeof EXIF === 'undefined') {
        console.warn('ExifUtils: EXIF library not loaded. GPS extraction disabled.');
        resolve(null);
        return;
      }

      // Use EXIF.getData directly on the File object
      // This preserves all EXIF data including GPS coordinates
      EXIF.getData(file, function() {
        const allTags = EXIF.getAllTags(this);
        resolve(allTags && Object.keys(allTags).length > 0 ? allTags : null);
      });
    });
  }

  /**
   * Extract GPS coordinates from EXIF data
   * @param {Object} exifData - Raw EXIF data
   * @returns {Object|null} - { latitude, longitude } or null if not available
   */
  function extractGpsCoordinates(exifData) {
    if (!exifData) return null;

    const lat = exifData.GPSLatitude;
    const latRef = exifData.GPSLatitudeRef;
    const lon = exifData.GPSLongitude;
    const lonRef = exifData.GPSLongitudeRef;

    // Check if all required GPS data is present
    if (!lat || !lon || !latRef || !lonRef) {
      return null;
    }

    try {
      // Convert GPS coordinates from degrees/minutes/seconds to decimal
      const latitude = convertDMSToDecimal(lat, latRef);
      const longitude = convertDMSToDecimal(lon, lonRef);

      // Validate coordinates
      if (isValidLatitude(latitude) && isValidLongitude(longitude)) {
        return {
          latitude: Math.round(latitude * 1000000) / 1000000,  // 6 decimal places
          longitude: Math.round(longitude * 1000000) / 1000000
        };
      }
    } catch (error) {
      console.warn('ExifUtils: Error converting GPS coordinates:', error);
    }

    return null;
  }

  /**
   * Convert GPS coordinates from DMS (Degrees/Minutes/Seconds) to decimal
   * @param {Array} dms - Array of [degrees, minutes, seconds]
   * @param {string} ref - Reference direction (N/S/E/W)
   * @returns {number} - Decimal coordinate
   */
  function convertDMSToDecimal(dms, ref) {
    if (!Array.isArray(dms) || dms.length < 3) {
      throw new Error('Invalid DMS format');
    }

    // Handle both number and object formats (exif-js can return either)
    const degrees = typeof dms[0] === 'object' ? dms[0].numerator / dms[0].denominator : dms[0];
    const minutes = typeof dms[1] === 'object' ? dms[1].numerator / dms[1].denominator : dms[1];
    const seconds = typeof dms[2] === 'object' ? dms[2].numerator / dms[2].denominator : dms[2];

    let decimal = degrees + (minutes / 60) + (seconds / 3600);

    // Apply direction (South and West are negative)
    if (ref === 'S' || ref === 'W') {
      decimal = -decimal;
    }

    return decimal;
  }

  /**
   * Validate latitude value
   * @param {number} lat - Latitude value
   * @returns {boolean} - True if valid
   */
  function isValidLatitude(lat) {
    return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
  }

  /**
   * Validate longitude value
   * @param {number} lon - Longitude value
   * @returns {boolean} - True if valid
   */
  function isValidLongitude(lon) {
    return typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180;
  }

  /**
   * Extract timestamp from EXIF data
   * @param {Object} exifData - Raw EXIF data
   * @returns {string|null} - ISO timestamp string or null
   */
  function extractTimestamp(exifData) {
    if (!exifData) return null;

    // Try different EXIF date fields (in order of preference)
    const dateFields = [
      'DateTimeOriginal',  // When the photo was taken
      'DateTimeDigitized', // When the photo was digitized
      'DateTime'           // Last modified
    ];

    for (const field of dateFields) {
      if (exifData[field]) {
        try {
          const parsed = parseExifDate(exifData[field]);
          if (parsed) {
            return parsed.toISOString();
          }
        } catch (error) {
          console.warn('ExifUtils: Error parsing date from', field, error);
        }
      }
    }

    return null;
  }

  /**
   * Parse EXIF date string to Date object
   * EXIF format: "YYYY:MM:DD HH:MM:SS"
   * @param {string} dateStr - EXIF date string
   * @returns {Date|null} - Date object or null
   */
  function parseExifDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // EXIF date format: "2024:01:15 14:30:00"
    const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    
    if (match) {
      const [, year, month, day, hour, minute, second] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,  // JavaScript months are 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      
      // Validate the date
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * Normalize photo data - handles both old format (URL string) and new format (object)
   * This ensures backward compatibility with existing data
   * @param {string|Object} photo - Photo data in either format
   * @returns {Object} - Normalized photo object
   */
  function normalizePhotoData(photo) {
    // Already in new format
    if (typeof photo === 'object' && photo !== null && photo.url) {
      return {
        url: photo.url,
        filename: photo.filename || extractFilenameFromUrl(photo.url),
        coordinates: photo.coordinates || null,
        timestamp: photo.timestamp || null,
        caption: photo.caption || ''
      };
    }

    // Old format: just a URL string
    if (typeof photo === 'string') {
      return {
        url: photo,
        filename: extractFilenameFromUrl(photo),
        coordinates: null,
        timestamp: null,
        caption: ''
      };
    }

    // Unknown format - return safe default
    console.warn('ExifUtils: Unknown photo format:', photo);
    return {
      url: '',
      filename: 'unknown',
      coordinates: null,
      timestamp: null,
      caption: ''
    };
  }

  /**
   * Extract filename from a URL
   * @param {string} url - The URL
   * @returns {string} - Filename or 'unknown'
   */
  function extractFilenameFromUrl(url) {
    if (!url || typeof url !== 'string') return 'unknown';
    
    try {
      // Handle Firebase Storage URLs
      const decoded = decodeURIComponent(url);
      const match = decoded.match(/[^/]+\.(jpg|jpeg|png|gif|webp|heic)/i);
      if (match) {
        return match[0];
      }
      
      // Fallback: get last path segment
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1].split('?')[0];
      return lastPart || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Format coordinates for display
   * @param {Object} coordinates - { latitude, longitude }
   * @returns {string} - Formatted string like "45.3214° N, 72.1856° O"
   */
  function formatCoordinates(coordinates) {
    if (!coordinates || coordinates.latitude == null || coordinates.longitude == null) {
      return 'Localisation non disponible';
    }

    const lat = coordinates.latitude;
    const lon = coordinates.longitude;
    
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'O';  // 'O' for Ouest in French
    
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
  }

  /**
   * Generate Google Maps link for coordinates
   * @param {Object} coordinates - { latitude, longitude }
   * @returns {string|null} - Google Maps URL or null
   */
  function getGoogleMapsLink(coordinates) {
    if (!coordinates || coordinates.latitude == null || coordinates.longitude == null) {
      return null;
    }
    
    return `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
  }

  /**
   * Get photo URL from either format (backward compatible)
   * Use this helper everywhere photos are displayed
   * @param {string|Object} photo - Photo in old (string) or new (object) format
   * @returns {string} - The photo URL
   */
  function getPhotoUrl(photo) {
    if (typeof photo === 'string') {
      return photo;
    }
    if (typeof photo === 'object' && photo !== null && photo.url) {
      return photo.url;
    }
    return '';
  }

  // Public API
  return {
    extractPhotoMetadata: extractPhotoMetadata,
    normalizePhotoData: normalizePhotoData,
    formatCoordinates: formatCoordinates,
    getGoogleMapsLink: getGoogleMapsLink,
    getPhotoUrl: getPhotoUrl,
    getBrowserGeolocation: getBrowserGeolocation,  // Exposed for testing
    
    // Expose for testing
    _internal: {
      convertDMSToDecimal: convertDMSToDecimal,
      parseExifDate: parseExifDate,
      extractFilenameFromUrl: extractFilenameFromUrl
    }
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.ExifUtils = ExifUtils;
}