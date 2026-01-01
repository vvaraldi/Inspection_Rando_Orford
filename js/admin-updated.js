/**
 * =====================================================
 * ADMIN.JS - Enhanced Admin Panel for Ski-Track
 * =====================================================
 * 
 * Enhanced version with better organization and UI integration
 * with the new CSS architecture.
 * 
 * @requires Firebase Auth, Firestore, Storage
 * @author Ski-Track Team
 * @version 2.1.0
 * 
 * Note: User management has been removed - now handled centrally
 * at https://vvaraldi.github.io/Orford_Patrouille/index.html
 */

class AdminManager {
  constructor() {
    this.currentUserId = null;
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.loadingScreen = null;
    this.mainContent = null;
    
    this.initializeElements();
    this.initializeFirebase();
    this.bindEvents();
  }

  initializeElements() {
    this.loadingScreen = document.getElementById('loading');
    this.mainContent = document.getElementById('main-content');
    
    // Tab elements
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');
    
    // Status message elements
    this.userSuccessMessage = document.getElementById('user-success-message');
    this.userErrorMessage = document.getElementById('user-error-message');
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

  // Helper method to get Firebase configuration
  getFirebaseConfig() {
    return {
      apiKey: "AIzaSyDcBZrwGTskM7QUvanzLTACEJ_T-55j-DA",
      authDomain: "trail-inspection.firebaseapp.com",
      projectId: "trail-inspection",
      storageBucket: "trail-inspection.firebasestorage.app",
      messagingSenderId: "415995272058",
      appId: "1:415995272058:web:dc476de8ffee052e2ad4c3",
      measurementId: "G-EBLYWBM9YB"
    };
  }

  bindEvents() {
    // Tab navigation
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Data management buttons
    this.bindDataManagementEvents();
    
    // Statistics refresh
    const refreshStatsBtn = document.getElementById('refresh-stats');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => this.loadStatistics());
    }
  }

  bindDataManagementEvents() {
    const buttons = [
      { id: 'init-trails-btn', handler: () => this.initializeTrails() },
      { id: 'init-shelters-btn', handler: () => this.initializeShelters() },
      { id: 'create-sample-btn', handler: () => this.createSampleData() },
      { id: 'delete-old-inspections-btn', handler: () => this.deleteOldInspections() },
      { id: 'reset-inspections-btn', handler: () => this.resetAllInspections() }
    ];

    buttons.forEach(({ id, handler }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', handler);
      }
    });
  }

  async checkAdminPermissions() {
    return new Promise((resolve) => {
      this.auth.onAuthStateChanged(async (user) => {
        if (user) {
          this.currentUserId = user.uid;
          try {
            const userDoc = await this.db.collection('inspectors').doc(user.uid).get();
            
            if (userDoc.exists) {
              const userData = userDoc.data();
              
              // Check 1: Is user active?
              if (userData.status !== 'active') {
                this.showError('Votre compte a été désactivé');
                await this.auth.signOut();
                this.redirectToLogin();
                resolve(false);
                return;
              }
              
              // Check 2: Does user have inspection access?
              if (userData.allowInspection !== true) {
                this.showError('Vous n\'avez pas accès au système d\'inspection');
                await this.auth.signOut();
                this.redirectToLogin();
                resolve(false);
                return;
              }
              
              // Check 3: Is user admin? (for admin page specifically)
              if (userData.role !== 'admin') {
                this.showError('Accès refusé - Droits administrateur requis');
                setTimeout(() => {
                  window.location.href = '../index.html';
                }, 2000);
                resolve(false);
                return;
              }
              
              // ✓ All checks passed
              this.updateUserInfo(userData.name);
              resolve(true);
              
            } else {
              this.showError('Utilisateur non trouvé dans la base de données');
              this.redirectToLogin();
              resolve(false);
            }
          } catch (error) {
            console.error('Error checking admin permissions:', error);
            this.showError('Erreur lors de la vérification des permissions');
            this.redirectToLogin();
            resolve(false);
          }
        } else {
          this.redirectToLogin();
          resolve(false);
        }
      });
    });
  }

  updateUserInfo(userName) {
    const userInfoElements = document.querySelectorAll('.user-name, #user-name-display, #admin-name');
    userInfoElements.forEach(element => {
      if (element) {
        element.textContent = userName;
      }
    });
  }

  redirectToLogin() {
    const loginUrl = window.location.pathname.includes('/pages/') 
      ? 'login.html' 
      : 'pages/login.html';
    window.location.href = loginUrl;
  }

  switchTab(tabName) {
    // Update tab buttons
    this.tabBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // Update tab content
    this.tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabName}-tab`) {
        content.classList.add('active');
      }
    });

    // Load data based on active tab
    switch (tabName) {
      case 'stats':
        this.loadStatistics();
        break;
    }
  }

  async loadStatistics() {
    try {
      // Load basic statistics
      const [trailInspections, shelterInspections, inspectors] = await Promise.all([
        this.db.collection('trail_inspections').get(),
        this.db.collection('shelter_inspections').get(),
        this.db.collection('inspectors').where('status', '==', 'active').get()
      ]);

      // Update statistics display
      this.updateStatElement('total-inspections', trailInspections.size + shelterInspections.size);
      this.updateStatElement('trail-inspections', trailInspections.size);
      this.updateStatElement('shelter-inspections', shelterInspections.size);
      this.updateStatElement('active-users', inspectors.size);

      // Calculate week inspections
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoTimestamp = firebase.firestore.Timestamp.fromDate(weekAgo);

      const [weekTrails, weekShelters] = await Promise.all([
        this.db.collection('trail_inspections').where('date', '>=', weekAgoTimestamp).get(),
        this.db.collection('shelter_inspections').where('date', '>=', weekAgoTimestamp).get()
      ]);

      this.updateStatElement('week-inspections', weekTrails.size + weekShelters.size);

      // Count open issues
      let openIssues = 0;
      trailInspections.forEach(doc => {
        const data = doc.data();
        if (data.issues && data.issues.length > 0) {
          openIssues += data.issues.length;
        }
      });
      shelterInspections.forEach(doc => {
        const data = doc.data();
        if (data.issues && data.issues.length > 0) {
          openIssues += data.issues.length;
        }
      });

      this.updateStatElement('open-issues', openIssues);

    } catch (error) {
      console.error('Error loading statistics:', error);
      this.showError('Erreur lors du chargement des statistiques');
    }
  }

  updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  showSuccess(message) {
    this.hideMessages();
    if (this.userSuccessMessage) {
      this.userSuccessMessage.textContent = message;
      this.userSuccessMessage.style.display = 'block';
      setTimeout(() => {
        this.userSuccessMessage.style.display = 'none';
      }, 5000);
    }
  }

  showError(message) {
    this.hideMessages();
    if (this.userErrorMessage) {
      this.userErrorMessage.textContent = message;
      this.userErrorMessage.style.display = 'block';
      setTimeout(() => {
        this.userErrorMessage.style.display = 'none';
      }, 5000);
    }
  }

  hideMessages() {
    if (this.userSuccessMessage) {
      this.userSuccessMessage.style.display = 'none';
    }
    if (this.userErrorMessage) {
      this.userErrorMessage.style.display = 'none';
    }
  }

  showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.className = `status-message status-${type}`;
      element.style.display = 'block';
      
      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          element.style.display = 'none';
        }, 5000);
      }
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
      // Wait for Firebase auth to be ready
      if (!this.auth) {
        throw new Error('Firebase Auth not available');
      }

      // Check authentication and admin permissions
      const isAdmin = await this.checkAdminPermissions();
      if (!isAdmin) {
        return;
      }

      // Initialize the interface
      this.showMainContent();
      
      console.log('Admin panel initialized successfully');
      
    } catch (error) {
      console.error('Error initializing admin panel:', error);
      this.showError('Erreur lors de l\'initialisation du panneau d\'administration');
    }
  }

  // Data definitions for initialization
  getInitialTrailsData() {
    return [
        {
          id: 'trail_1',
          name: "La tortue",
          length: 1.1,
          difficulty: "easy",
          description: "Sentier facile idéal pour débutants",
          status: "open",
          coordinates: { top: 387, left: 454 }
        },
        {
          id: 'trail_2',
          name: "Tracé du lynx",
          length: 0.6,
          difficulty: "easy",
          description: "Court sentier avec peu de dénivelé",
          status: "open",
          coordinates: { top: 316, left: 228 }
        },
        {
          id: 'trail_3',
          name: "Adams",
          length: 0.6,
          difficulty: "easy",
          description: "Sentier familial accessible",
          status: "open",
          coordinates: { top: 500, left: 425 }
        },
        {
          id: 'trail_4',
          name: "Le renard",
          length: 2.4,
          difficulty: "easy",
          description: "Sentier plus long mais avec pente douce",
          status: "open",
          coordinates: { top: 418, left: 73 }
        },
        {
          id: 'trail_5',
          name: "Le lièvre",
          length: 1.3,
          difficulty: "medium",
          description: "Sentier intermédiaire avec quelques pentes",
          status: "open",
          coordinates: { top: 143, left: 298 }
        },
        {
          id: 'trail_6',
          name: "Le Campagnol",
          length: 1.5,
          difficulty: "hard",
          description: "Sentier difficile pour randonneurs expérimentés",
          status: "open",
          coordinates: { top: 20, left: 426 }
        },
        {
          id: 'trail_7',
          name: "L'Hermine",
          length: 1.8,
          difficulty: "medium",
          description: "Sentier intermédiaire avec belle vue",
          status: "open",
          coordinates: { top: 360, left: 533 }
        },
        {
          id: 'trail_8',
          name: "L'Alouette",
          length: 2.4,
          difficulty: "medium",
          description: "Sentier avec dénivelé modéré",
          status: "open",
          coordinates: { top: 390, left: 664 }
        },
        {
          id: 'trail_9',
          name: "L'Urubu",
          length: 1.2,
          difficulty: "hard",
          description: "Sentier technique et escarpé",
          status: "open",
          coordinates: { top: 485, left: 270 }
        },
        {
          id: 'trail_10',
          name: "La Carcajou",
          length: 0.8,
          difficulty: "hard",
          description: "Court sentier mais très exigeant",
          status: "open",
          coordinates: { top: 455, left: 305 }
        },
        {
          id: 'trail_11',
          name: "La Mille-Pattes",
          length: 1.5,
          difficulty: "hard",
          description: "Sentier avec plusieurs segments techniques",
          status: "open",
          coordinates: { top: 298, left: 523 }
        }
    ];
  }

  getInitialSheltersData() {
    return [
        {
          id: 'shelter_1',
          name: "Mont Giroux",
          altitude: 650,
          coordinates: { top: 437, left: 159 }
        },
        {
          id: 'shelter_2',
          name: "Mont Orford",
          altitude: 850,
          coordinates: { top: 39, left: 479 }
        },
        {
          id: 'shelter_3',
          name: "Mont Alfred-Desrochers",
          altitude: 615,
          coordinates: { top: 168, left: 622 }
        }
    ];
  }

  // Data initialization methods implementation
  async initializeTrails() {
    try {
      this.showStatus('trails-status', 'Initialisation des sentiers en cours...', 'info');
      
      const trails = this.getInitialTrailsData();
      const batch = this.db.batch();
      
      for (const trail of trails) {
        const trailRef = this.db.collection('trails').doc(trail.id);
        batch.set(trailRef, {
          ...trail,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: this.currentUserId
        });
      }
      
      await batch.commit();
      
      this.showStatus('trails-status', `✓ ${trails.length} sentiers initialisés avec succès!`, 'success');
      console.log('✓ Sentiers initialisés avec succès');
      
    } catch (error) {
      console.error('✗ Erreur lors de l\'initialisation des sentiers:', error);
      this.showStatus('trails-status', 'Erreur lors de l\'initialisation des sentiers: ' + error.message, 'danger');
    }
  }

  async initializeShelters() {
    try {
      this.showStatus('shelters-status', 'Initialisation des abris en cours...', 'info');
      
      const shelters = this.getInitialSheltersData();
      const batch = this.db.batch();
      
      for (const shelter of shelters) {
        const shelterRef = this.db.collection('shelters').doc(shelter.id);
        batch.set(shelterRef, {
          ...shelter,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: this.currentUserId
        });
      }
      
      await batch.commit();
      
      this.showStatus('shelters-status', `✓ ${shelters.length} abris initialisés avec succès!`, 'success');
      console.log('✓ Abris initialisés avec succès');
      
    } catch (error) {
      console.error('✗ Erreur lors de l\'initialisation des abris:', error);
      this.showStatus('shelters-status', 'Erreur lors de l\'initialisation des abris: ' + error.message, 'danger');
    }
  }

  async deleteOldInspections() {
    const cutoffDateInput = document.getElementById('cutoff-date');
    
    if (!cutoffDateInput || !cutoffDateInput.value) {
      this.showStatus('delete-old-status', 'Veuillez sélectionner une date limite.', 'warning');
      return;
    }

    const cutoffDate = new Date(cutoffDateInput.value);
    cutoffDate.setHours(23, 59, 59, 999); // End of the selected day
    
    const cutoffTimestamp = firebase.firestore.Timestamp.fromDate(cutoffDate);
    const formattedDate = cutoffDate.toLocaleDateString('fr-CA');

    if (!confirm(`⚠️ ATTENTION: Vous êtes sur le point de supprimer TOUTES les inspections antérieures au ${formattedDate}.\n\nCette action est IRRÉVERSIBLE.\n\nContinuer?`)) {
      return;
    }

    try {
      this.showStatus('delete-old-status', 'Recherche des inspections à supprimer...', 'info');

      // Query inspections before cutoff date
      const [trailInspections, shelterInspections] = await Promise.all([
        this.db.collection('trail_inspections').where('date', '<', cutoffTimestamp).get(),
        this.db.collection('shelter_inspections').where('date', '<', cutoffTimestamp).get()
      ]);

      const totalToDelete = trailInspections.size + shelterInspections.size;

      if (totalToDelete === 0) {
        this.showStatus('delete-old-status', 'Aucune inspection trouvée avant cette date.', 'info');
        return;
      }

      this.showStatus('delete-old-status', `Suppression de ${totalToDelete} inspections en cours...`, 'info');

      // Delete in batches (Firestore limit is 500 per batch)
      const batchSize = 400;
      let deletedCount = 0;

      // Delete trail inspections
      const trailDocs = trailInspections.docs;
      for (let i = 0; i < trailDocs.length; i += batchSize) {
        const batch = this.db.batch();
        const chunk = trailDocs.slice(i, i + batchSize);
        
        for (const doc of chunk) {
          // Delete associated photos from storage if they exist
          const data = doc.data();
          if (data.photos && data.photos.length > 0) {
            for (const photoUrl of data.photos) {
              try {
                const storageRef = this.storage.refFromURL(photoUrl);
                await storageRef.delete();
              } catch (photoError) {
                console.warn('Could not delete photo:', photoError);
              }
            }
          }
          batch.delete(doc.ref);
        }
        
        await batch.commit();
        deletedCount += chunk.length;
        this.showStatus('delete-old-status', `Suppression en cours... ${deletedCount}/${totalToDelete}`, 'info');
      }

      // Delete shelter inspections
      const shelterDocs = shelterInspections.docs;
      for (let i = 0; i < shelterDocs.length; i += batchSize) {
        const batch = this.db.batch();
        const chunk = shelterDocs.slice(i, i + batchSize);
        
        for (const doc of chunk) {
          // Delete associated photos from storage if they exist
          const data = doc.data();
          if (data.photos && data.photos.length > 0) {
            for (const photoUrl of data.photos) {
              try {
                const storageRef = this.storage.refFromURL(photoUrl);
                await storageRef.delete();
              } catch (photoError) {
                console.warn('Could not delete photo:', photoError);
              }
            }
          }
          batch.delete(doc.ref);
        }
        
        await batch.commit();
        deletedCount += chunk.length;
        this.showStatus('delete-old-status', `Suppression en cours... ${deletedCount}/${totalToDelete}`, 'info');
      }

      this.showStatus('delete-old-status', `✓ ${totalToDelete} inspections supprimées avec succès!`, 'success');
      
      // Refresh statistics
      this.loadStatistics();

    } catch (error) {
      console.error('Error deleting old inspections:', error);
      this.showStatus('delete-old-status', `✗ Erreur: ${error.message}`, 'error');
    }
  }

  async createSampleData() {
    if (!confirm('Cela ajoutera plusieurs inspections fictives. Continuer?')) {
      return;
    }
    
    try {
      this.showStatus('sample-status', 'Création des données de test en cours...', 'info');
      
      // Create sample trail inspections
      const sampleTrailInspections = [
        {
          trail_id: 'trail_2',
          condition: 'warning',
          notes: 'Quelques branches tombées',
          issues: ['Obstacles sur le sentier'],
          inspector_name: 'Admin Test',
          inspector_id: this.currentUserId,
          date: firebase.firestore.FieldValue.serverTimestamp()
        }
      ];

      // Create sample shelter inspections
      const sampleShelterInspections = [
        {
          shelter_id: 'shelter_1',
          condition: 'good',
          notes: 'Abri propre et en bon état',
          cleanliness: 'clean',
          accessibility: 'good',
          issues: [],
          inspector_name: 'Admin Test',
          inspector_id: this.currentUserId,
          date: firebase.firestore.FieldValue.serverTimestamp()
        }
      ];

      const batch = this.db.batch();

      // Add sample trail inspections
      sampleTrailInspections.forEach((inspection, index) => {
        const docRef = this.db.collection('trail_inspections').doc();
        batch.set(docRef, inspection);
      });

      // Add sample shelter inspections
      sampleShelterInspections.forEach((inspection, index) => {
        const docRef = this.db.collection('shelter_inspections').doc();
        batch.set(docRef, inspection);
      });

      await batch.commit();

      this.showStatus('sample-status', '✓ Données de test créées avec succès!', 'success');
      console.log('✓ Données de test créées avec succès');
      
    } catch (error) {
      console.error('✗ Erreur lors de la création des données de test:', error);
      this.showStatus('sample-status', 'Erreur lors de la création des données de test: ' + error.message, 'danger');
    }
  }

}

// Global admin manager instance
let adminManager;

// Initialize when DOM is loaded and auth is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the admin page
  if (!document.getElementById('main-content')) {
    return;
  }

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return;
  }

  // Initialize admin manager
  adminManager = new AdminManager();

  // Wait for auth state to be determined
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is authenticated, check admin permissions and initialize
      adminManager.initialize();
    } else {
      // Redirect to login if not authenticated
      adminManager.redirectToLogin();
    }
  });
});