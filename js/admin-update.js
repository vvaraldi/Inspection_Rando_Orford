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

  async checkAdminPermissions() {
    try {
      if (!this.auth) return false;

      const user = this.auth.currentUser;
      if (!user) {
        this.redirectToLogin();
        return false;
      }

      // Check if user is admin
      const userDoc = await this.db.collection('inspectors').doc(user.uid).get();
      
      if (!userDoc.exists) {
        this.showError('Utilisateur non trouvé dans la base de données');
        return false;
      }

      const userData = userDoc.data();
      if (userData.role !== 'admin') {
        this.showError('Accès refusé - Permissions administrateur requises');
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 2000);
        return false;
      }

      this.currentUserId = user.uid;
      this.updateUserInfo(userData.name);
      return true;
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      this.showError('Erreur lors de la vérification des permissions');
      return false;
    }
  }

  redirectToLogin() {
    const loginUrl = window.location.pathname.includes('/pages/') 
      ? 'login.html' 
      : 'pages/login.html';
    window.location.href = loginUrl;
  }

  updateUserInfo(name) {
    const adminName = document.getElementById('admin-name');
    if (adminName && name) {
      adminName.textContent = name;
    }
  }

  switchTab(tabName) {
    // Remove active class from all tabs and contents
    this.tabBtns.forEach(btn => btn.classList.remove('active'));
    this.tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`${tabName}-tab`);

    if (selectedBtn && selectedContent) {
      selectedBtn.classList.add('active');
      selectedContent.classList.add('active');

      // Load data for the selected tab
      this.loadTabData(tabName);
    }
  }

  loadTabData(tabName) {
    switch (tabName) {
      case 'users':
        this.loadInspectors();
        break;
      case 'stats':
        this.loadStatistics();
        break;
      // 'data' tab doesn't need initial loading
    }
  }

  async loadInspectors() {
    try {
      this.showTableLoading();
      
      const snapshot = await this.db.collection('inspectors').get();
      const tbody = this.inspectorsTable.querySelector('tbody');
      tbody.innerHTML = '';

      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun utilisateur trouvé</td></tr>';
        return;
      }

      snapshot.forEach(doc => {
        const userData = doc.data();
        const row = this.createInspectorRow(doc.id, userData);
        tbody.appendChild(row);
      });

      this.bindTableEvents();
    } catch (error) {
      console.error('Error loading inspectors:', error);
      this.showTableError('Erreur lors du chargement des utilisateurs');
    }
  }

  createInspectorRow(userId, userData) {
    const row = document.createElement('tr');
    const isCurrentUser = (userId === this.currentUserId);
    
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

    try {
      this.setFormLoading(true);
      
      // Create user in Firebase Auth
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        userData.email, 
        userData.password
      );

      // Add user data to Firestore
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

    return true;
  }

  handleUserCreationError(error) {
    let errorMessage = 'Erreur lors de la création de l\'utilisateur';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Cette adresse email est déjà utilisée';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Adresse email invalide';
        break;
      case 'auth/weak-password':
        errorMessage = 'Le mot de passe est trop faible';
        break;
      default:
        errorMessage = error.message || errorMessage;
    }
    
    this.showError(errorMessage);
  }

  resetUserForm() {
    if (this.userForm) {
      this.userForm.reset();
    }
    this.hideMessages();
  }

  setFormLoading(isLoading) {
    const submitBtn = this.userForm.querySelector('button[type="submit"]');
    const inputs = this.userForm.querySelectorAll('input, select');

    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Création en cours...';
      inputs.forEach(input => input.disabled = true);
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Créer l\'utilisateur';
      inputs.forEach(input => input.disabled = false);
    }
  }

  deleteUser(userId) {
    if (userId === this.currentUserId) {
      this.showError('Vous ne pouvez pas vous supprimer vous-même');
      return;
    }

    this.userToDelete = userId;
    this.showModal();
  }

  async confirmDeleteUser() {
    if (!this.userToDelete) return;

    try {
      // Delete from Firestore
      await this.db.collection('inspectors').doc(this.userToDelete).delete();

      // Note: We don't delete from Firebase Auth as it requires special admin privileges
      // The user account will remain in Auth but won't be able to access the system

      this.showSuccess('Utilisateur supprimé avec succès');
      this.closeModal();
      this.loadInspectors(); // Refresh the table
      
    } catch (error) {
      console.error('Error deleting user:', error);
      this.showError('Erreur lors de la suppression de l\'utilisateur');
    }
  }

  showModal() {
    if (this.deleteModal) {
      this.deleteModal.classList.add('show');
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

  // Implementation of placeholder methods

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
      
      // Get an inspector for the tests
      const inspectorsSnapshot = await this.db.collection('inspectors').limit(1).get();
      if (inspectorsSnapshot.empty) {
        throw new Error('Aucun inspecteur disponible pour créer les données de test');
      }
      
      const inspectorId = inspectorsSnapshot.docs[0].id;
      const inspectorName = inspectorsSnapshot.docs[0].data().name;
      
      // Get trails and shelters
      const trailsSnapshot = await this.db.collection('trails').limit(3).get();
      const sheltersSnapshot = await this.db.collection('shelters').limit(2).get();
      
      const batch = this.db.batch();
      const now = new Date();
      let sampleCount = 0;
      
      // Create trail inspections
      trailsSnapshot.forEach((trailDoc, index) => {
        const date = new Date(now);
        date.setDate(date.getDate() - index * 7); // One inspection per week
        
        const inspectionRef = this.db.collection('trail_inspections').doc();
        batch.set(inspectionRef, {
          trail_id: trailDoc.id,
          inspector_id: inspectorId,
          inspector_name: inspectorName,
          date: firebase.firestore.Timestamp.fromDate(date),
          condition: ['good', 'warning', 'critical'][index % 3],
          issues: index % 2 === 0 ? ['Problème de test 1', 'Problème de test 2'] : [],
          notes: `Inspection de test #${index + 1}`,
          photos: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        sampleCount++;
      });
      
      // Create shelter inspections
      sheltersSnapshot.forEach((shelterDoc, index) => {
        const date = new Date(now);
        date.setDate(date.getDate() - index * 10);
        
        const inspectionRef = this.db.collection('shelter_inspections').doc();
        batch.set(inspectionRef, {
          shelter_id: shelterDoc.id,
          inspector_id: inspectorId,
          inspector_name: inspectorName,
          date: firebase.firestore.Timestamp.fromDate(date),
          condition: ['good', 'warning'][index % 2],
          cleanliness: ['good', 'warning', 'critical'][index % 3],
          accessibility: 'good',
          issues: [],
          notes: `Inspection d'abri de test #${index + 1}`,
          photos: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        sampleCount++;
      });
      
      await batch.commit();
      
      this.showStatus('sample-status', `✓ ${sampleCount} données de test créées avec succès!`, 'success');
      console.log('✓ Données de test créées avec succès');
      
    } catch (error) {
      console.error('✗ Erreur lors de la création des données de test:', error);
      this.showStatus('sample-status', 'Erreur lors de la création des données de test: ' + error.message, 'danger');
    }
  }

  async exportData() {
    try {
      const button = document.getElementById('export-data-btn');
      button.disabled = true;
      button.textContent = 'Export en cours...';
      
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
      button.disabled = false;
      button.textContent = 'Exporter les données';
    }
  }

  async deleteOldInspections() {
    const cutoffDateInput = document.getElementById('cutoff-date');
    if (!cutoffDateInput.value) {
      this.showStatus('delete-old-status', 'Veuillez sélectionner une date limite.', 'danger');
      return;
    }
    
    const cutoffDate = new Date(cutoffDateInput.value + 'T00:00:00');
    const cutoffTimestamp = firebase.firestore.Timestamp.fromDate(cutoffDate);
    
    if (!confirm(`Supprimer toutes les inspections antérieures au ${cutoffDate.toLocaleDateString('fr-FR')}?\n\nCette action est IRRÉVERSIBLE.`)) {
      return;
    }
    
    try {
      const button = document.getElementById('delete-old-inspections-btn');
      button.disabled = true;
      button.textContent = 'Suppression...';
      
      this.showStatus('delete-old-status', 'Suppression des anciennes inspections en cours...', 'info');
      
      // Count and delete trail inspections
      const trailSnapshot = await this.db.collection('trail_inspections')
        .where('date', '<', cutoffTimestamp)
        .get();
      
      const shelterSnapshot = await this.db.collection('shelter_inspections')
        .where('date', '<', cutoffTimestamp)
        .get();
      
      const batch = this.db.batch();
      let deleteCount = 0;
      
      trailSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;
      });
      
      shelterSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;
      });
      
      await batch.commit();
      
      this.showStatus('delete-old-status', `✓ ${deleteCount} inspection(s) supprimée(s) avec succès.`, 'success');
      
      // Refresh statistics
      this.loadStatistics();
      
    } catch (error) {
      console.error('✗ Erreur lors de la suppression:', error);
      this.showStatus('delete-old-status', 'Erreur lors de la suppression: ' + error.message, 'danger');
    } finally {
      const button = document.getElementById('delete-old-inspections-btn');
      button.disabled = false;
      button.textContent = 'Supprimer';
    }
  }

  async resetAllInspections() {
    if (!confirm('ATTENTION: Cette action supprimera TOUTES les inspections.\n\nCette action est IRRÉVERSIBLE.\n\nTaper "SUPPRIMER" pour confirmer:') || 
        prompt('Tapez "SUPPRIMER" pour confirmer:') !== 'SUPPRIMER') {
      return;
    }
    
    try {
      const button = document.getElementById('reset-inspections-btn');
      button.disabled = true;
      button.textContent = 'Suppression...';
      
      this.showStatus('reset-status', 'Suppression de toutes les inspections en cours...', 'info');
      
      // Get all inspections
      const [trailInspections, shelterInspections] = await Promise.all([
        this.db.collection('trail_inspections').get(),
        this.db.collection('shelter_inspections').get()
      ]);
      
      // Delete in batches (Firestore limit is 500 operations per batch)
      const allDocs = [...trailInspections.docs, ...shelterInspections.docs];
      const batchSize = 450;
      let deletedCount = 0;
      
      for (let i = 0; i < allDocs.length; i += batchSize) {
        const batch = this.db.batch();
        const batchDocs = allDocs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deletedCount += batchDocs.length;
      }
      
      this.showStatus('reset-status', `✓ ${deletedCount} inspection(s) supprimée(s) avec succès.`, 'success');
      
      // Refresh statistics
      this.loadStatistics();
      
    } catch (error) {
      console.error('✗ Erreur lors de la réinitialisation:', error);
      this.showStatus('reset-status', 'Erreur lors de la réinitialisation: ' + error.message, 'danger');
    } finally {
      const button = document.getElementById('reset-inspections-btn');
      button.disabled = false;
      button.textContent = 'Réinitialiser tout';
    }
  }

  // Utility methods for UI feedback

  showTableLoading() {
    const tbody = this.inspectorsTable.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chargement des utilisateurs...</td></tr>';
  }

  showTableError(message) {
    const tbody = this.inspectorsTable.querySelector('tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--color-danger);">${message}</td></tr>`;
  }

  showSuccess(message) {
    this.hideMessages();
    if (this.userSuccessMessage) {
      this.userSuccessMessage.textContent = message;
      this.userSuccessMessage.style.display = 'block';
      this.userSuccessMessage.classList.add('alert-fade-in');
      
      setTimeout(() => {
        this.userSuccessMessage.style.display = 'none';
        this.userSuccessMessage.classList.remove('alert-fade-in');
      }, 5000);
    }
  }

  showError(message) {
    this.hideMessages();
    if (this.userErrorMessage) {
      this.userErrorMessage.textContent = message;
      this.userErrorMessage.style.display = 'block';
      this.userErrorMessage.classList.add('alert-fade-in');
      
      setTimeout(() => {
        this.userErrorMessage.style.display = 'none';
        this.userErrorMessage.classList.remove('alert-fade-in');
      }, 8000);
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
      element.className = `alert alert-${type}`;
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