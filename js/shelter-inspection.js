/**
 * Shelter Inspection Form Management
 * Handles form functionality, photo uploads, and data submission
 */

class ShelterInspectionManager {
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
    this.form = document.getElementById('shelter-inspection-form');
    this.shelterSelect = document.getElementById('shelter-select');
    this.inspectorName = document.getElementById('inspector-name');
    this.inspectorId = document.getElementById('inspector-id');
    this.inspectionDate = document.getElementById('inspection-date');
    this.inspectionTime = document.getElementById('inspection-time');
    this.comments = document.getElementById('comments');
    this.otherIssues = document.getElementById('other-issues');
    this.cleanlinessDetails = document.getElementById('cleanliness-details');
    this.accessibilityDetails = document.getElementById('accessibility-details');
    
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
      console.log('Firebase services initialized successfully');
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

    // Photo upload events
    if (this.photoUpload && this.fileInput) {
      this.photoUpload.addEventListener('click', () => this.fileInput.click());
      this.photoUpload.addEventListener('dragover', (e) => this.handleDragOver(e));
      this.photoUpload.addEventListener('drop', (e) => this.handleDrop(e));
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Cancel button
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    // Form validation on input change
    this.bindValidationEvents();
  }

  bindValidationEvents() {
    // Required field validation
    const requiredFields = this.form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('change', () => this.validateField(field));
    });
  }

  setCurrentDateTime() {
    const now = new Date();
    
    // Set current date
    if (this.inspectionDate) {
      this.inspectionDate.value = now.toISOString().split('T')[0];
    }
    
    // Set current time
    if (this.inspectionTime) {
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      this.inspectionTime.value = `${hours}:${minutes}`;
    }
  }

  async loadInspectionData() {
    try {
      // Load shelters for selection
      await this.loadShelters();
      
      // Fill inspector information
      this.fillInspectorField();
      
      console.log('Shelter inspection data loaded successfully');
    } catch (error) {
      console.error('Error loading inspection data:', error);
      this.showError('Erreur lors du chargement des données');
    }
  }

  async loadShelters() {
    try {
      if (!this.db) {
        throw new Error('Database not available');
      }

      const sheltersSnapshot = await this.db.collection('shelters').orderBy('name').get();
      
      if (this.shelterSelect) {
        // Clear existing options except the first one
        this.shelterSelect.innerHTML = '<option value="">Sélectionner un abri</option>';
        
        sheltersSnapshot.forEach(doc => {
          const shelter = doc.data();
          const option = document.createElement('option');
          option.value = doc.id;
          option.textContent = `${shelter.name} (${shelter.altitude}m - ${shelter.capacity} personnes)`;
          this.shelterSelect.appendChild(option);
        });
      }
      
      console.log(`${sheltersSnapshot.size} shelters loaded`);
    } catch (error) {
      console.error('Error loading shelters:', error);
      this.showError('Erreur lors du chargement des abris');
    }
  }

  fillInspectorField() {
    if (this.auth && this.auth.currentUser) {
      const user = this.auth.currentUser;
      
      // Get user data from Firestore
      this.db.collection('inspectors').doc(user.uid).get()
        .then(doc => {
          if (doc.exists) {
            const userData = doc.data();
            if (this.inspectorName) {
              this.inspectorName.value = userData.name || user.email;
            }
            if (this.inspectorId) {
              this.inspectorId.value = user.uid;
            }
          }
        })
        .catch(error => {
          console.error('Error getting inspector data:', error);
          // Fallback to email
          if (this.inspectorName) {
            this.inspectorName.value = user.email;
          }
          if (this.inspectorId) {
            this.inspectorId.value = user.uid;
          }
        });
    }
  }

  // Photo upload handling (same as trail inspection)
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.photoUpload.classList.add('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.photoUpload.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    this.processFiles(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  }

  processFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        this.showError(`Le fichier ${file.name} est trop volumineux (max 10MB)`);
        return;
      }
      
      this.selectedFiles.push(file);
      this.createPhotoPreview(file);
    });
    
    // Reset file input
    this.fileInput.value = '';
  }

  createPhotoPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'photo-preview';
    
    const img = document.createElement('img');
    const removeBtn = document.createElement('button');
    removeBtn.className = 'photo-preview-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.type = 'button';
    
    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.alt = 'Photo preview';
    
    // Remove button functionality
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
    
    // Check if condition is selected
    const conditionSelected = this.form.querySelector('input[name="condition"]:checked');
    if (!conditionSelected) {
      this.showError('Veuillez sélectionner l\'état général de l\'abri');
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
      
      // Upload photos if any
      if (this.selectedFiles.length > 0) {
        formData.photos = await this.uploadPhotos();
      }
      
      // Save inspection to Firestore
      await this.saveInspection(formData);
      
      this.showSuccess('Inspection d\'abri enregistrée avec succès!');
      
      // Reset form after short delay
      setTimeout(() => {
        this.resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting shelter inspection:', error);
      this.handleSubmissionError(error);
    } finally {
      this.setFormLoading(false);
    }
  }

  collectFormData() {
    const formData = {
      shelter_id: this.shelterSelect.value,
      inspector_id: this.inspectorId.value,
      inspector_name: this.inspectorName.value,
      date: this.createTimestamp(),
      condition: this.form.querySelector('input[name="condition"]:checked')?.value,
      cleanliness: this.form.querySelector('input[name="cleanliness"]:checked')?.value,
      accessibility: this.form.querySelector('input[name="accessibility"]:checked')?.value,
      cleanliness_details: this.cleanlinessDetails.value.trim(),
      accessibility_details: this.accessibilityDetails.value.trim(),
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

  async uploadPhotos() {
    const uploadPromises = this.selectedFiles.map(async (file, index) => {
      const fileName = `shelter-inspections/${Date.now()}-${index}-${file.name}`;
      const storageRef = this.storage.ref(fileName);
      
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      return downloadURL;
    });
    
    return Promise.all(uploadPromises);
  }

  async saveInspection(formData) {
    const docRef = await this.db.collection('shelter_inspections').add(formData);
    console.log('Shelter inspection saved with ID:', docRef.id);
    return docRef.id;
  }

  handleSubmissionError(error) {
    let errorMessage = 'Erreur lors de l\'enregistrement de l\'inspection d\'abri';
    
    if (error.code === 'permission-denied') {
      errorMessage = 'Permissions insuffisantes pour enregistrer l\'inspection';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Service temporairement indisponible. Veuillez réessayer.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    this.showError(errorMessage);
  }

  // Form state management
  setFormLoading(isLoading) {
    if (isLoading) {
      this.form.classList.add('form-loading');
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<span>Enregistrement en cours...</span>';
      
      // Disable all form inputs
      const inputs = this.form.querySelectorAll('input, select, textarea, button');
      inputs.forEach(input => input.disabled = true);
    } else {
      this.form.classList.remove('form-loading');
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = 'Enregistrer l\'inspection';
      
      // Re-enable all form inputs
      const inputs = this.form.querySelectorAll('input, select, textarea, button');
      inputs.forEach(input => input.disabled = false);
    }
  }

  resetForm() {
	// Store inspector info before reset
	const inspectorId = this.inspectorId.value;
	const inspectorName = this.inspectorName.value;

    // Reset form fields
    this.form.reset();
    
	// Restore inspector info
	this.inspectorId.value = inspectorId;
	this.inspectorName.value = inspectorName;
  
	// Clear selected files
    this.selectedFiles = [];
    
    // Clear photo previews
    this.previewContainer.innerHTML = '';
    
    // Reset validation classes
    const validatedFields = this.form.querySelectorAll('.is-valid, .is-invalid');
    validatedFields.forEach(field => {
      field.classList.remove('is-valid', 'is-invalid');
    });
    
    // Reset date and time
    this.setCurrentDateTime();
    
    // Hide messages
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
      
      console.log('Shelter inspection form initialized successfully');
      
    } catch (error) {
      console.error('Error initializing shelter inspection form:', error);
      this.showError('Erreur lors de l\'initialisation du formulaire');
    }
  }
}

// Global instance
let shelterInspectionManager;

// Initialize when DOM is loaded and auth is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the shelter inspection page
  if (!document.getElementById('shelter-inspection-form')) {
    return;
  }

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return;
  }

  // Initialize shelter inspection manager
  shelterInspectionManager = new ShelterInspectionManager();

  // Wait for auth state to be determined
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is authenticated, initialize the form
      shelterInspectionManager.initialize();
    } else {
      // Redirect to login if not authenticated
      const loginUrl = window.location.pathname.includes('/pages/') 
        ? 'login.html' 
        : 'pages/login.html';
      window.location.href = loginUrl;
    }
  });

  // Global function for backward compatibility (called by auth.js)
  window.loadShelterInspectionData = function() {
    if (shelterInspectionManager) {
      shelterInspectionManager.loadInspectionData();
    }
  };
});