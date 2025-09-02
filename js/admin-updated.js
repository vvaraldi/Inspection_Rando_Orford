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
 * @version 2.0.0
 */

class AdminManager {
  constructor() {
    this.currentUserId = null;
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.loadingScreen = null;
    this.mainContent = null;
    this.userToDelete = null;
    
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
    
    // User management elements
    this.userForm = document.getElementById('user-form');
    this.inspectorsTable = document.getElementById('inspectors-table');
    this.deleteModal = document.getElementById('delete-modal');
    
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

    // User form
    if (this.userForm) {
      this.userForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
    }

    // Cancel user form
    const cancelBtn = document.getElementById('cancel-user-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.resetUserForm());
    }

    // Modal events
    this.bindModalEvents();
    
    // Data management buttons
    this.bindDataManagementEvents();
    
    // Statistics refresh
    const refreshStatsBtn = document.getElementById('refresh-stats');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => this.loadStatistics());
    }

    // Users refresh
    const refreshUsersBtn = document.getElementById('refresh-users');
    if (refreshUsersBtn) {
      refreshUsersBtn.addEventListener('click', () => this.loadInspectors());
    }
  }

  bindModalEvents() {
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const confirmDelete = document.getElementById('confirm-delete');

    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeModal());
    }

    if (modalCancel) {
      modalCancel.addEventListener('click', () => this.closeModal());
    }

    if (confirmDelete) {
      confirmDelete.addEventListener('click', () => this.confirmDeleteUser());
    }

    // Close modal when clicking outside
    if (this.deleteModal) {
      this.deleteModal.addEventListener('click', (e) => {
        if (e.target === this.deleteModal) {
          this.closeModal();
        }
      });
    }
  }

  bindDataManagementEvents() {
    const buttons = [
      { id: 'init-trails-btn', handler: () => this.initializeTrails() },
      { id: 'init-shelters-btn', handler: () => this.initializeShelters() },
      { id: 'create-sample-btn', handler: () => this.createSampleData() },
      { id: 'export-data-btn', handler: () => this.exportData() },
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

  // FIXED USER CREATION METHOD - Option B Implementation
  async handleUserFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
      name: document.getElementById('user-name').value.trim(),
      email: document.getElementById('user-email').value.trim(),
      phone: document.getElementById('user-phone').value.trim(),
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value,
      status: document.getElementById('user-status').value
    };

    if (!this.validateUserForm(userData)) {
      return;
    }

    let secondaryApp = null;

    try {
      this.setFormLoading(true);
      
      // Create secondary Firebase app instance to avoid automatic login
      secondaryApp = firebase.initializeApp(this.getFirebaseConfig(), "secondary");
      const secondaryAuth = secondaryApp.auth();
      
      // Create user with secondary app (this won't affect current session)
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(
        userData.email, 
        userData.password
      );

      // Add user data to Firestore using main database instance
      await this.db.collection('inspectors').doc(userCredential.user.uid).set({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        role: userData.role,
        status: userData.status,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: this.currentUserId
      });

      this.showSuccess('Utilisateur créé avec succès');
      this.resetUserForm();
      this.loadInspectors(); // Refresh the table
      
    } catch (error) {
      console.error('Error creating user:', error);
      this.handleUserCreationError(error);
    } finally {
      // Always clean up the secondary app
      if (secondaryApp) {
        try {
          await secondaryApp.delete();
        } catch (cleanupError) {
          console.warn('Error cleaning up secondary app:', cleanupError);
        }
      }
      this.setFormLoading(false);
    }
  }

  validateUserForm(userData) {
    if (!userData.name) {
      this.showError('Le nom est requis');
      return false;
    }
    
    if (!userData.email) {
      this.showError('L\'email est requis');
      return false;
    }
    
    if (!userData.password || userData.password.length < 6) {
      this.showError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (!userData.role) {
      this.showError('Le rôle est requis');
      return false;
    }

    if (!userData.status) {
      this.showError('Le statut est requis');
      return false;
    }

    return true;
  }

  handleUserCreationError(error) {
    let message = 'Erreur lors de la création de l\'utilisateur';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Cette adresse email est déjà utilisée';
        break;
      case 'auth/invalid-email':
        message = 'Adresse email invalide';
        break;
      case 'auth/weak-password':
        message = 'Le mot de passe est trop faible';
        break;
      case 'auth/operation-not-allowed':
        message = 'La création de comptes est désactivée';
        break;
      default:
        message = error.message || message;
    }
    
    this.showError(message);
  }

  setFormLoading(loading) {
    const submitBtn = document.getElementById('submit-user-btn');
    const form = this.userForm;
    
    if (loading) {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Création...';
      }
      if (form) {
        form.style.opacity = '0.6';
      }
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Créer l\'utilisateur';
      }
      if (form) {
        form.style.opacity = '1';
      }
    }
  }

  resetUserForm() {
    if (this.userForm) {
      this.userForm.reset();
    }
    this.hideMessages();
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
              
              if (userData.status !== 'active') {
                this.showError('Votre compte a été désactivé');
                await this.auth.signOut();
                this.redirectToLogin();
                resolve(false);
                return;
              }
              
              if (userData.role !== 'admin') {
                this.showError('Accès refusé - Droits administrateur requis');
                setTimeout(() => {
                  window.location.href = '../index.html';
                }, 2000);
                resolve(false);
                return;
              }
              
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
      case 'statistics':
        this.loadStatistics();
        break;
      case 'users':
        this.loadInspectors();
        break;
    }
  }

  async loadInspectors() {
    try {
      console.log('Loading inspectors...');
      
      // Show loading state
      if (this.inspectorsTable) {
        const tbody = this.inspectorsTable.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chargement des utilisateurs...</td></tr>';
        }
      }
      
      const snapshot = await this.db.collection('inspectors')
        .orderBy('createdAt', 'desc')
        .get();

      console.log('Inspectors loaded:', snapshot.size);

      if (this.inspectorsTable) {
        const tbody = this.inspectorsTable.querySelector('tbody');
        if (!tbody) {
          console.error('Table tbody not found');
          return;
        }
        
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun utilisateur trouvé</td></tr>';
          return;
        }

        snapshot.forEach((doc) => {
          const userData = doc.data();
          const userId = doc.id;
          console.log('Creating row for user:', userData.name, userId);
          const row = this.createUserRow(userId, userData);
          tbody.appendChild(row);
        });

        // Bind events for interactive elements
        this.bindTableEvents();
      } else {
        console.error('inspectorsTable not found');
      }
    } catch (error) {
      console.error('Error loading inspectors:', error);
      if (this.inspectorsTable) {
        const tbody = this.inspectorsTable.querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--color-danger);">Erreur: ${error.message}</td></tr>`;
        }
      }
    }
  }

  createUserRow(userId, userData) {
    const row = document.createElement('tr');
    const isCurrentUser = userId === this.currentUserId;
    
    const roleClass = userData.role === 'admin' ? 'role-admin' : 'role-inspector';
    const roleText = userData.role === 'admin' ? 'Administrateur' : 'Inspecteur';
    
    const statusClass = userData.status === 'active' ? 'status-active' : 'status-inactive';
    const statusText = userData.status === 'active' ? 'Actif' : 'Inactif';

    row.innerHTML = `
      <td>
        ${userData.name}
        ${isCurrentUser ? '<span class="current-user-indicator">(Vous)</span>' : ''}
      </td>
      <td>${userData.email}</td>
      <td>${userData.phone || '-'}</td>
      <td>
        <button class="role-badge ${roleClass}" 
                data-user-id="${userId}" 
                data-current-role="${userData.role}"
                ${isCurrentUser ? 'disabled title="Vous ne pouvez pas modifier votre propre rôle"' : ''}>
          ${roleText}
        </button>
      </td>
      <td>
        <button class="status-badge ${statusClass}" 
                data-user-id="${userId}" 
                data-current-status="${userData.status}"
                ${isCurrentUser ? 'disabled title="Vous ne pouvez pas modifier votre propre statut"' : ''}>
          ${statusText}
        </button>
      </td>
      <td>
        <div class="admin-table-actions">
          <button class="btn btn-danger btn-icon" 
                  data-user-id="${userId}"
                  onclick="adminManager.deleteUser('${userId}')"
                  ${isCurrentUser ? 'disabled title="Vous ne pouvez pas vous supprimer"' : ''}>
            🗑️
          </button>
        </div>
      </td>
    `;

    return row;
  }

  bindTableEvents() {
    // Role toggle buttons
    document.querySelectorAll('.role-badge:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        const currentRole = e.target.dataset.currentRole;
        const newRole = currentRole === 'admin' ? 'inspector' : 'admin';
        this.toggleUserRole(userId, newRole, e.target);
      });
    });

    // Status toggle buttons
    document.querySelectorAll('.status-badge:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        const currentStatus = e.target.dataset.currentStatus;
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        this.toggleUserStatus(userId, newStatus, e.target);
      });
    });
  }

  async toggleUserRole(userId, newRole, buttonElement) {
    try {
      buttonElement.disabled = true;
      
      await this.db.collection('inspectors').doc(userId).update({
        role: newRole
      });

      // Update UI
      const newText = newRole === 'admin' ? 'Administrateur' : 'Inspecteur';
      const newClass = newRole === 'admin' ? 'role-admin' : 'role-inspector';
      
      buttonElement.textContent = newText;
      buttonElement.className = `role-badge ${newClass}`;
      buttonElement.dataset.currentRole = newRole;

      this.showSuccess('Rôle mis à jour avec succès');
    } catch (error) {
      console.error('Error updating user role:', error);
      this.showError('Erreur lors de la mise à jour du rôle');
    } finally {
      buttonElement.disabled = false;
    }
  }

  async toggleUserStatus(userId, newStatus, buttonElement) {
    try {
      buttonElement.disabled = true;
      
      await this.db.collection('inspectors').doc(userId).update({
        status: newStatus
      });

      // Update UI
      const newText = newStatus === 'active' ? 'Actif' : 'Inactif';
      const newClass = newStatus === 'active' ? 'status-active' : 'status-inactive';
      
      buttonElement.textContent = newText;
      buttonElement.className = `status-badge ${newClass}`;
      buttonElement.dataset.currentStatus = newStatus;

      this.showSuccess('Statut mis à jour avec succès');
    } catch (error) {
      console.error('Error updating user status:', error);
      this.showError('Erreur lors de la mise à jour du statut');
    } finally {
      buttonElement.disabled = false;
    }
  }

  deleteUser(userId) {
    this.userToDelete = userId;
    if (this.deleteModal) {
      this.deleteModal.classList.add('show');
    }
  }

  async confirmDeleteUser() {
    if (!this.userToDelete) return;

    try {
      await this.db.collection('inspectors').doc(this.userToDelete).delete();
      this.showSuccess('Utilisateur supprimé avec succès');
      this.loadInspectors();
      this.closeModal();
    } catch (error) {
      console.error('Error deleting user:', error);
      this.showError('Erreur lors de la suppression de l\'utilisateur');
    }
  }

  closeModal() {
    if (this.deleteModal) {
      this.deleteModal.classList.remove('show');
    }
    this.userToDelete = null;
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
      
      // Load initial data
      this.loadInspectors();
      
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
        coordinates: { top: 394, left: 450 }
      },
      {
        id: 'trail_2',
        name: "Tracé du lynx",
        length: 0.6,
        difficulty: "easy",
        description: "Court sentier avec peu de dénivelé",
        coordinates: { top: 323, left: 210 }
      },
      {
        id: 'trail_3',
        name: "Adams",
        length: 0.6,
        difficulty: "easy",
        description: "Sentier familial accessible",
        coordinates: { top: 520, left: 420 }
      },
      {
        id: 'trail_4',
        name: "La Belle et la Bête",
        length: 2.0,
        difficulty: "medium",
        description: "Sentier intermédiaire avec quelques défis",
        coordinates: { top: 280, left: 380 }
      },
      {
        id: 'trail_5',
        name: "Pic de l'Ours",
        length: 3.2,
        difficulty: "hard",
        description: "Sentier difficile pour randonneurs expérimentés",
        coordinates: { top: 180, left: 320 }
      },
      {
        id: 'trail_6',
        name: "Sentier des Érables",
        length: 1.8,
        difficulty: "medium",
        description: "Belle vue sur la vallée",
        coordinates: { top: 450, left: 380 }
      },
      {
        id: 'trail_7',
        name: "Circuit du Sommet",
        length: 4.5,
        difficulty: "hard",
        description: "Circuit complet du mont Orford",
        coordinates: { top: 150, left: 400 }
      }
    ];
  }

  getInitialSheltersData() {
    return [
      {
        id: 'shelter_1',
        name: "Abri du Lac",
        altitude: 450,
        capacity: 8,
        description: "Abri principal près du lac",
        coordinates: { top: 380, left: 290 }
      },
      {
        id: 'shelter_2',
        name: "Refuge des Pins",
        altitude: 620,
        capacity: 6,
        description: "Petit refuge dans la forêt de pins",
        coordinates: { top: 250, left: 350 }
      },
      {
        id: 'shelter_3',
        name: "Cabane du Sommet",
        altitude: 850,
        capacity: 12,
        description: "Grande cabane au sommet avec vue panoramique",
        coordinates: { top: 120, left: 380 }
      },
      {
        id: 'shelter_4',
        name: "Abri de la Vallée",
        altitude: 380,
        capacity: 4,
        description: "Petit abri d'urgence en vallée",
        coordinates: { top: 480, left: 320 }
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

  async exportData() {
    try {
      const button = document.getElementById('export-data-btn');
      if (button) {
        button.disabled = true;
        button.textContent = 'Export en cours...';
      }
      
      // Load all data
      const [trails, shelters, trailInspections, shelterInspections, inspectors] = await Promise.all([
        this.db.collection('trails').get(),
        this.db.collection('shelters').get(),
        this.db.collection('trail_inspections').get(),
        this.db.collection('shelter_inspections').get(),
        this.db.collection('inspectors').get()
      ]);
      
      // Prepare export data
      const exportData = {
        exportDate: new Date().toISOString(),
        trails: trails.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        shelters: shelters.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        trailInspections: trailInspections.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        shelterInspections: shelterInspections.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        inspectors: inspectors.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `ski-track-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✓ Données exportées avec succès');
      
    } catch (error) {
      console.error('✗ Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export: ' + error.message);
    } finally {
      const button = document.getElementById('export-data-btn');
      if (button) {
        button.disabled = false;
        button.textContent = 'Exporter les données';
      }
    }
  }

  async deleteOldInspections() {
    const cutoffDateInput = document.getElementById('cutoff-date');
    if (!cutoffDateInput || !cutoffDateInput.value) {
      alert('Veuillez sélectionner une date limite');
      return;
    }

    const cutoffDate = new Date(cutoffDateInput.value);
    const cutoffTimestamp = firebase.firestore.Timestamp.fromDate(cutoffDate);

    if (!confirm(`⚠️ ATTENTION: Cela supprimera toutes les inspections antérieures au ${cutoffDate.toLocaleDateString()}. Cette action est irréversible. Continuer?`)) {
      return;
    }

    try {
      const button = document.getElementById('delete-old-inspections-btn');
      if (button) {
        button.disabled = true;
        button.textContent = 'Suppression...';
      }

      // Delete old trail inspections
      const oldTrailInspections = await this.db.collection('trail_inspections')
        .where('date', '<', cutoffTimestamp)
        .get();

      // Delete old shelter inspections
      const oldShelterInspections = await this.db.collection('shelter_inspections')
        .where('date', '<', cutoffTimestamp)
        .get();

      const batch = this.db.batch();
      let totalDeleted = 0;

      oldTrailInspections.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });

      oldShelterInspections.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });

      await batch.commit();

      alert(`✓ ${totalDeleted} inspections supprimées avec succès`);
      console.log(`✓ ${totalDeleted} inspections supprimées avec succès`);

    } catch (error) {
      console.error('✗ Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    } finally {
      const button = document.getElementById('delete-old-inspections-btn');
      if (button) {
        button.disabled = false;
        button.textContent = 'Supprimer les anciennes inspections';
      }
    }
  }

  async resetAllInspections() {
    if (!confirm('⚠️ ATTENTION: Cela supprimera TOUTES les inspections. Cette action est irréversible. Continuer?')) {
      return;
    }

    try {
      const button = document.getElementById('reset-inspections-btn');
      if (button) {
        button.disabled = true;
        button.textContent = 'Réinitialisation...';
      }

      // Get all inspections
      const [trailInspections, shelterInspections] = await Promise.all([
        this.db.collection('trail_inspections').get(),
        this.db.collection('shelter_inspections').get()
      ]);

      const batch = this.db.batch();
      let totalDeleted = 0;

      // Delete all trail inspections
      trailInspections.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });

      // Delete all shelter inspections
      shelterInspections.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });

      await batch.commit();

      alert(`✓ ${totalDeleted} inspections supprimées avec succès`);
      console.log(`✓ Toutes les inspections ont été supprimées`);

    } catch (error) {
      console.error('✗ Erreur lors de la réinitialisation:', error);
      alert('Erreur lors de la réinitialisation: ' + error.message);
    } finally {
      const button = document.getElementById('reset-inspections-btn');
      if (button) {
        button.disabled = false;
        button.textContent = 'Réinitialiser tout';
      }
    }
  }

				/**
				 * ADD THESE METHODS TO YOUR AdminManager CLASS in admin-updated.js
				 * Add them after the existing methods and before the initialize() method
				 */

				// Trail Status Migration Method
				async addTrailStatusMigration() {
				  if (!confirm('Cela ajoutera le champ "status" à tous les sentiers existants. Tous les sentiers seront marqués comme "ouverts" par défaut. Continuer?')) {
					return;
				  }
				  
				  try {
					this.showStatus('migration-status', 'Migration du statut des sentiers en cours...', 'info');
					
					// Get all existing trails
					const trailsSnapshot = await this.db.collection('trails').get();
					
					if (trailsSnapshot.empty) {
					  this.showStatus('migration-status', 'Aucun sentier trouvé pour la migration.', 'warning');
					  return;
					}
					
					const batch = this.db.batch();
					let updatedCount = 0;
					let alreadyUpdatedCount = 0;
					
					trailsSnapshot.forEach(doc => {
					  const trailData = doc.data();
					  
					  // Only update if status field doesn't exist
					  if (!trailData.hasOwnProperty('status')) {
						const trailRef = this.db.collection('trails').doc(doc.id);
						batch.update(trailRef, {
						  status: 'open', // Default all trails to open
						  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
						  updatedBy: this.currentUserId
						});
						updatedCount++;
					  } else {
						alreadyUpdatedCount++;
					  }
					});
					
					if (updatedCount === 0) {
					  this.showStatus('migration-status', 
						`✓ Migration terminée: ${alreadyUpdatedCount} sentier(s) ont déjà le champ status.`, 
						'info');
					  return;
					}
					
					// Execute the batch update
					await batch.commit();
					
					this.showStatus('migration-status', 
					  `✓ Migration réussie: ${updatedCount} sentier(s) mis à jour avec le statut "ouvert"! ` +
					  `${alreadyUpdatedCount > 0 ? `(${alreadyUpdatedCount} déjà à jour)` : ''}`, 
					  'success');
					console.log(`✓ Trail status migration completed: ${updatedCount} trails updated`);
					
				  } catch (error) {
					console.error('✗ Erreur lors de la migration du statut des sentiers:', error);
					this.showStatus('migration-status', 'Erreur lors de la migration: ' + error.message, 'danger');
				  }
				}

				// Enhanced Trail Initialization with Status (replaces existing method)
				async initializeTrailsWithStatus() {
				  if (!confirm('Cela créera les sentiers initiaux avec le champ status. Les sentiers existants ne seront pas modifiés. Continuer?')) {
					return;
				  }
				  
				  try {
					this.showStatus('trails-init-status', 'Initialisation des sentiers avec statut en cours...', 'info');
					
					const trails = this.getInitialTrailsDataWithStatus(); // New method
					const batch = this.db.batch();
					let createdCount = 0;
					let skippedCount = 0;
					
					// Check which trails already exist
					for (const trail of trails) {
					  const trailDoc = await this.db.collection('trails').doc(trail.id).get();
					  
					  if (!trailDoc.exists) {
						const trailRef = this.db.collection('trails').doc(trail.id);
						batch.set(trailRef, {
						  ...trail,
						  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
						  createdBy: this.currentUserId
						});
						createdCount++;
					  } else {
						skippedCount++;
					  }
					}
					
					if (createdCount === 0) {
					  this.showStatus('trails-init-status', 
						`✓ Tous les sentiers (${skippedCount}) existent déjà.`, 
						'info');
					  return;
					}
					
					await batch.commit();
					
					this.showStatus('trails-init-status', 
					  `✓ ${createdCount} nouveau(x) sentier(s) créé(s) avec le statut! ` +
					  `${skippedCount > 0 ? `(${skippedCount} déjà existant(s))` : ''}`, 
					  'success');
					console.log('✓ Sentiers avec statut initialisés avec succès');
					
				  } catch (error) {
					console.error('✗ Erreur lors de l\'initialisation des sentiers avec statut:', error);
					this.showStatus('trails-init-status', 'Erreur lors de l\'initialisation: ' + error.message, 'danger');
				  }
				}

				// Updated trail data with status field
				getInitialTrailsDataWithStatus() {
				  return [
					{
					  id: 'trail_1',
					  name: "La tortue",
					  length: 1.1,
					  difficulty: "easy",
					  status: "open", // NEW: Default status
					  description: "Sentier facile idéal pour débutants",
					  coordinates: { top: 394, left: 450 }
					},
					{
					  id: 'trail_2',
					  name: "Tracé du lynx",
					  length: 0.6,
					  difficulty: "easy",
					  status: "open", // NEW: Default status
					  description: "Court sentier avec peu de dénivelé",
					  coordinates: { top: 323, left: 210 }
					},
					{
					  id: 'trail_3',
					  name: "Adams",
					  length: 0.6,
					  difficulty: "easy",
					  status: "open", // NEW: Default status
					  description: "Sentier familial accessible",
					  coordinates: { top: 520, left: 420 }
					},
					{
					  id: 'trail_4',
					  name: "La Belle et la Bête",
					  length: 2.0,
					  difficulty: "medium",
					  status: "open", // NEW: Default status
					  description: "Sentier intermédiaire avec quelques défis",
					  coordinates: { top: 280, left: 380 }
					},
					{
					  id: 'trail_5',
					  name: "Pic de l'Ours",
					  length: 3.2,
					  difficulty: "hard",
					  status: "open", // NEW: Default status
					  description: "Sentier difficile pour randonneurs expérimentés",
					  coordinates: { top: 180, left: 320 }
					},
					{
					  id: 'trail_6',
					  name: "Sentier des Érables",
					  length: 1.8,
					  difficulty: "medium",
					  status: "open", // NEW: Default status
					  description: "Belle vue sur la vallée",
					  coordinates: { top: 450, left: 380 }
					},
					{
					  id: 'trail_7',
					  name: "Circuit du Sommet",
					  length: 4.5,
					  difficulty: "hard",
					  status: "open", // NEW: Default status
					  description: "Circuit complet du mont Orford",
					  coordinates: { top: 150, left: 400 }
					}
				  ];
				}

				/**
				 * ADD THESE EVENT BINDINGS TO YOUR bindEvents() METHOD
				 * Add these lines in the bindEvents() method after the existing event listeners
				 */

				// ADD THESE LINES TO bindEvents() method:
				const migrateTrailStatusBtn = document.getElementById('migrate-trail-status-btn');
				if (migrateTrailStatusBtn) {
				  migrateTrailStatusBtn.addEventListener('click', () => this.addTrailStatusMigration());
				}

				const initTrailsWithStatusBtn = document.getElementById('init-trails-with-status-btn');
				if (initTrailsWithStatusBtn) {
				  initTrailsWithStatusBtn.addEventListener('click', () => this.initializeTrailsWithStatus());
				}

				/**
				 * ALTERNATIVE APPROACH: If you prefer to have a single "Smart Migration" button
				 * This method will automatically detect what needs to be done
				 */

				async smartTrailStatusMigration() {
				  try {
					this.showStatus('migration-status', 'Analyse des sentiers en cours...', 'info');
					
					// Check if trails exist
					const trailsSnapshot = await this.db.collection('trails').get();
					
					if (trailsSnapshot.empty) {
					  // No trails exist, create them with status
					  if (confirm('Aucun sentier trouvé. Voulez-vous créer les sentiers initiaux avec le champ status?')) {
						await this.initializeTrailsWithStatus();
					  }
					  return;
					}
					
					// Check how many trails need status migration
					let needsMigration = 0;
					let hasStatus = 0;
					
					trailsSnapshot.forEach(doc => {
					  const data = doc.data();
					  if (data.hasOwnProperty('status')) {
						hasStatus++;
					  } else {
						needsMigration++;
					  }
					});
					
					if (needsMigration > 0) {
					  if (confirm(`${needsMigration} sentier(s) ont besoin du champ status. Lancer la migration?`)) {
						await this.addTrailStatusMigration();
					  }
					} else {
					  this.showStatus('migration-status', `✓ Tous les ${hasStatus} sentiers ont déjà le champ status.`, 'success');
					}
					
				  } catch (error) {
					console.error('Erreur lors de l\'analyse des sentiers:', error);
					this.showStatus('migration-status', 'Erreur lors de l\'analyse: ' + error.message, 'danger');
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
