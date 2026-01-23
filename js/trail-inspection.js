/**
 * Trail Inspection Form Management - Updated Version
 * Handles form functionality, photo uploads, and data submission
 * Now includes trail status (open/closed) and optional snow conditions
 * 
 * v2.1.0 - Added GPS coordinate extraction from photos
 */

class TrailInspectionManager {
  constructor() {
    this.selectedFiles = [];
    this.storage = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    
    this.initializeElements();
    this.initializeFirebase();
    this.bindEvents();
    this.setCurrentDateTime();
  }

  initializeElements() {
    // Form elements
    this.form = document.getElementById('trail-inspection-form');
    this.trailSelect = document.getElementById('trail-select');
    this.inspectorName = document.getElementById('inspector-name');
    this.inspectorId = document.getElementById('inspector-id');
    this.inspectionDate = document.getElementById('inspection-date');
    this.inspectionTime = document.getElementById('inspection-time');
    this.comments = document.getElementById('comments');
    this.otherIssues = document.getElementById('other-issues');
    
    // Photo upload elements
    this.photoUpload = document.getElementById('photo-upload');
    this.fileInput = document.getElementById('file-input');
    this.previewContainer = document.getElementById('preview-container');
    
    // Action buttons
    this.submitBtn = document.getElementById('submit-btn');
    this.cancelBtn = document.getElementById('cancel-action');
    
    // Status messages
    this.successMessage = document.getElementById('success-message');
    this.errorMessage = document.getElementById('error-message');
    
    // Loading and content containers
    this.loadingScreen = document.getElementById('loading');
    this.mainContent = document.getElementById('main-content');
  }

  initializeFirebase() {
    if (typeof firebase !== 'undefined') {
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.storage = firebase.storage();
    } else {
      console.error('Firebase not available');
      this.showError('Firebase non disponible');
    }
  }

  bindEvents() {
    // Form submission
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    // Cancel button
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.handleCancel());
    }
    
    // Photo upload events
    if (this.photoUpload && this.fileInput) {
      this.photoUpload.addEventListener('click', () => this.fileInput.click());
      this.photoUpload.addEventListener('dragover', (e) => this.handleDragOver(e));
      this.photoUpload.addEventListener('drop', (e) => this.handleDrop(e));
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
    
	if (this.trailSelect) {
	  this.trailSelect.addEventListener('change', (e) => {
		this.updateStatusOptionsForTrail(e.target.value);
	  });
	}

    // Form validation on input change
    const requiredInputs = this.form.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('change', () => this.validateField(input));
    });
  }

setCurrentDateTime() {
    const now = new Date();
    
    // FIX: Use local date components instead of toISOString() which uses UTC
    // This prevents the date from showing tomorrow when creating reports late in the evening
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    
    if (this.inspectionDate) {
      this.inspectionDate.value = dateStr;
    }
    if (this.inspectionTime) {
      this.inspectionTime.value = timeStr;
    }
  }

  async loadInspectionData() {
    try {
      // Load inspector info
      const user = this.auth.currentUser;
      if (user) {
        // Try to get inspector name from Firestore
        const inspectorDoc = await this.db.collection('inspectors').doc(user.uid).get();
        if (inspectorDoc.exists) {
          const inspectorData = inspectorDoc.data();
          this.inspectorName.value = inspectorData.name || user.email;
        } else {
          this.inspectorName.value = user.email;
        }
        this.inspectorId.value = user.uid;
      }

      // Load trails for selection
      const trailsSnapshot = await this.db.collection('trails').orderBy('name').get();
      
      this.trailSelect.innerHTML = '<option value="">Sélectionner un sentier</option>';
      
      trailsSnapshot.forEach(doc => {
        const trail = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = `${trail.name} (${trail.length} km - ${this.getDifficultyText(trail.difficulty)})`;
        this.trailSelect.appendChild(option);
      });
      
    } catch (error) {
      console.error('Error loading trails:', error);
      this.showError('Erreur lors du chargement des sentiers');
    }
  }

async updateStatusOptionsForTrail(trailId) {
  if (!trailId) {
    // Reset to default labels if no trail selected
    this.setStatusLabels('🟢 Ouvert', '🔴 Fermé');
    return;
  }

  try {
    // Get the latest inspection for this trail to find current status
    const inspectionsSnapshot = await this.db.collection('trail_inspections')
      .where('trail_id', '==', trailId)
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    let currentStatus = 'unknown';
    if (!inspectionsSnapshot.empty) {
      const lastInspection = inspectionsSnapshot.docs[0].data();
      currentStatus = lastInspection.trail_status || 'unknown';
    }

    // Update labels based on current status
    if (currentStatus === 'open') {
      this.setStatusLabels('🟢 Rester ouvert', '🔴 À fermer');
    } else if (currentStatus === 'closed') {
      this.setStatusLabels('🟢 À ouvrir', '🔴 Rester fermé');
    } else {
      this.setStatusLabels('🟢 Ouvert', '🔴 Fermé');
    }

  } catch (error) {
    console.error('Error fetching trail status:', error);
    this.setStatusLabels('🟢 Ouvert', '🔴 Fermé');
  }
}

setStatusLabels(openLabel, closedLabel) {
  const openText = document.querySelector('#status-open + .radio-label .radio-text');
  const closedText = document.querySelector('#status-closed + .radio-label .radio-text');
  
  if (openText) openText.textContent = openLabel;
  if (closedText) closedText.textContent = closedLabel;
}

  getDifficultyText(difficulty) {
    const difficultyMap = {
      'easy': 'Facile',
      'medium': 'Intermédiaire', 
      'hard': 'Difficile'
    };
    return difficultyMap[difficulty] || difficulty || 'Non spécifié';
  }

  // Photo handling methods
  handleDragOver(e) {
    e.preventDefault();
    this.photoUpload.classList.add('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    this.photoUpload.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    this.processFiles(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  }

  processFiles(files) {
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        this.showError(`Le fichier ${file.name} est trop volumineux (max 10MB)`);
        return;
      }
      
      if (this.selectedFiles.length < 10) { // Limit to 10 files
        this.selectedFiles.push(file);
        this.createPhotoPreview(file);
      } else {
        this.showError('Maximum 10 photos autorisées');
      }
    });
    
    // Reset file input
    this.fileInput.value = '';
  }

  createPhotoPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'photo-preview';
    
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.alt = file.name;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'photo-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Supprimer cette photo';
    
    removeBtn.addEventListener('click', () => {
      const index = this.selectedFiles.indexOf(file);
      if (index > -1) {
        this.selectedFiles.splice(index, 1);
      }
      preview.remove();
      URL.revokeObjectURL(objectUrl);
    });
    
    preview.appendChild(img);
    preview.appendChild(removeBtn);
    this.previewContainer.appendChild(preview);
  }

  // Form validation
  validateField(field) {
    const isValid = field.checkValidity();
    
    if (isValid) {
      field.classList.remove('is-invalid');
      field.classList.add('is-valid');
    } else {
      field.classList.remove('is-valid');
      field.classList.add('is-invalid');
    }
    
    return isValid;
  }

  validateForm() {
    let isValid = true;
    const requiredFields = this.form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    // Check if trail status is selected
    const statusSelected = this.form.querySelector('input[name="trail-status"]:checked');
    if (!statusSelected) {
      this.showError('Veuillez sélectionner le statut du sentier (Ouvert/Fermé)');
      isValid = false;
    }
    
    // Check if condition is selected
    const conditionSelected = this.form.querySelector('input[name="condition"]:checked');
    if (!conditionSelected) {
      this.showError('Veuillez sélectionner l\'état général du sentier');
      isValid = false;
    }
    
    return isValid;
  }

  // Form submission
  async handleSubmit(e) {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }
    
    try {
      this.setFormLoading(true);
      this.hideMessages();
      
      // Collect form data
      const formData = this.collectFormData();
      
      // Upload photos if any (now with GPS extraction)
      if (this.selectedFiles.length > 0) {
        formData.photos = await this.uploadPhotos();
      }
      
      // Save inspection AND update trail status
      await this.saveInspection(formData);
      
      // Get trail name for confirmation message
      const trailName = this.trailSelect.selectedOptions[0]?.textContent || 'le sentier';
      const statusText = formData.trail_status === 'open' ? 'ouvert' : 'fermé';
      
      this.showSuccess(`Inspection enregistrée avec succès! ${trailName} est maintenant marqué comme ${statusText}.`);
      
      // Reset form after short delay
      setTimeout(() => {
        this.resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting inspection:', error);
      this.handleSubmissionError(error);
    } finally {
      this.setFormLoading(false);
    }
  }

  collectFormData() {
    const formData = {
      trail_id: this.trailSelect.value,
      inspector_id: this.inspectorId.value,
      inspector_name: this.inspectorName.value,
      date: this.createTimestamp(),
      trail_status: this.form.querySelector('input[name="trail-status"]:checked')?.value,
      condition: this.form.querySelector('input[name="condition"]:checked')?.value,
      snow_condition: this.form.querySelector('input[name="snow-condition"]:checked')?.value || null,
      issues: this.collectIssues(),
      notes: this.comments.value.trim(),
      photos: [], // Will be populated after upload
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add other issues if specified
    if (this.otherIssues.value.trim()) {
      formData.issues.push(this.otherIssues.value.trim());
    }
    
    return formData;
  }

  createTimestamp() {
    const dateStr = this.inspectionDate.value;
    const timeStr = this.inspectionTime.value;
    const dateTime = new Date(`${dateStr}T${timeStr}`);
    return firebase.firestore.Timestamp.fromDate(dateTime);
  }

  collectIssues() {
    const issues = [];
    const checkboxes = this.form.querySelectorAll('input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
      if (checkbox.value) {
        issues.push(checkbox.value);
      }
    });
    
    return issues;
  }

  /**
   * Upload photos with GPS metadata extraction
   * Returns array of photo objects with url, coordinates, timestamp, and filename
   * 
   * @returns {Promise<Array>} Array of photo objects
   */
  async uploadPhotos() {
    const uploadPromises = this.selectedFiles.map(async (file, index) => {
	const inspectionId = Date.now();
      const fileName = `inspections/trails/${inspectionId}/${index}-${file.name}`;
      const storageRef = this.storage.ref(fileName);
      
      // Extract EXIF metadata (GPS coordinates and timestamp) if available
      let metadata = {
        filename: file.name,
        coordinates: null,
        timestamp: null
      };
      
      // Check if ExifUtils is available and extract metadata
      if (typeof ExifUtils !== 'undefined') {
        try {
          const exifData = await ExifUtils.extractPhotoMetadata(file);
          metadata.coordinates = exifData.coordinates;
          metadata.timestamp = exifData.timestamp;
          
          if (exifData.hasGpsData) {
            console.log(`GPS data extracted for ${file.name}:`, exifData.coordinates);
          }
        } catch (exifError) {
          console.warn('Could not extract EXIF data:', exifError);
          // Continue without EXIF data - graceful degradation
        }
      }
      
      // Upload file to Firebase Storage
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      // Return photo object with all metadata
      return {
        url: downloadURL,
        filename: metadata.filename,
        coordinates: metadata.coordinates,
        timestamp: metadata.timestamp,
        caption: ''  // Can be added later if needed
      };
    });

    return Promise.all(uploadPromises);
  }

  async saveInspection(formData) {
    // Use a batch to save both the inspection and update the trail status
    const batch = this.db.batch();
      
    // 1. Save the inspection document
    const inspectionRef = this.db.collection('trail_inspections').doc();
    batch.set(inspectionRef, formData);
      
    // 2. Update the trail's status field
    const trailRef = this.db.collection('trails').doc(formData.trail_id);
    batch.update(trailRef, {
      status: formData.trail_status,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      lastInspectionId: inspectionRef.id
    });
    
    // Execute both operations atomically
    await batch.commit();
  
    console.log('Inspection saved with ID:', inspectionRef.id);
    console.log('Trail status updated to:', formData.trail_status);
  
    return inspectionRef.id;
  }

  handleSubmissionError(error) {
    let errorMessage = 'Erreur lors de l\'enregistrement de l\'inspection';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'Permissions insuffisantes pour enregistrer l\'inspection';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Service temporairement indisponible. Veuillez réessayer.';
    } else if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    this.showError(errorMessage);
  }

  setFormLoading(loading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = loading;
      this.submitBtn.textContent = loading ? 'Enregistrement...' : 'Enregistrer l\'inspection';
    }
  }

  resetForm() {
	// Save inspector info before reset (it never changes during session)
	const inspectorNameValue = this.inspectorName.value;
	const inspectorIdValue = this.inspectorId.value;

    if (this.form) {
      this.form.reset();
    }
    
    // Restore inspector info
    this.inspectorName.value = inspectorNameValue;
    this.inspectorId.value = inspectorIdValue;
  
    // Clear photo previews
    if (this.previewContainer) {
      this.previewContainer.innerHTML = '';
    }
    this.selectedFiles = [];
    
    // Reset datetime
    this.setCurrentDateTime();
    
    // Clear validation states
    const fields = this.form.querySelectorAll('.is-valid, .is-invalid');
    fields.forEach(field => {
      field.classList.remove('is-valid', 'is-invalid');
    });
    
    this.hideMessages();
  }

  handleCancel() {
    if (confirm('Êtes-vous sûr de vouloir annuler? Toutes les données saisies seront perdues.')) {
      window.location.href = '../index.html';
    }
  }

  // UI feedback methods
  showSuccess(message) {
    this.hideMessages();
    if (this.successMessage) {
      this.successMessage.textContent = message;
      this.successMessage.style.display = 'block';
      this.successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      setTimeout(() => {
        this.successMessage.style.display = 'none';
      }, 5000);
    }
  }

  showError(message) {
    this.hideMessages();
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
      this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      setTimeout(() => {
        this.errorMessage.style.display = 'none';
      }, 8000);
    }
  }

  hideMessages() {
    if (this.successMessage) {
      this.successMessage.style.display = 'none';
    }
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
    }
  }

  showMainContent() {
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'none';
    }
    if (this.mainContent) {
      this.mainContent.style.display = 'block';
    }
  }

  async initialize() {
    try {
      // Check authentication
      if (!this.auth || !this.auth.currentUser) {
        throw new Error('Authentication required');
      }

      // Load inspection data
      await this.loadInspectionData();
      
      // Show main content
      this.showMainContent();
      
      console.log('Trail inspection form initialized successfully');
      
    } catch (error) {
      console.error('Error initializing trail inspection form:', error);
      this.showError('Erreur lors de l\'initialisation du formulaire');
    }
  }
}

// Global instance
let trailInspectionManager;

// Initialize when DOM is loaded and auth is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the trail inspection page
  if (!document.getElementById('trail-inspection-form')) {
    return;
  }

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return;
  }

  // Initialize trail inspection manager
  trailInspectionManager = new TrailInspectionManager();

  // Wait for auth state to be determined
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is authenticated, initialize the form
      trailInspectionManager.initialize();
    } else {
      // Redirect to login if not authenticated
      const loginUrl = window.location.pathname.includes('/pages/') 
        ? '../pages/login.html' 
        : 'pages/login.html';
      window.location.href = loginUrl;
    }
  });
});