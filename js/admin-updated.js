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
    
    // Export modal element
    this.exportModal = document.getElementById('export-modal');
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
    
    // Export modal events
    this.bindExportModalEvents();
    
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

  bindExportModalEvents() {
    const exportModalClose = document.getElementById('export-modal-close');
    const exportModalCancel = document.getElementById('export-modal-cancel');
    const exportModalConfirm = document.getElementById('export-modal-confirm');

    if (exportModalClose) {
      exportModalClose.addEventListener('click', () => this.closeExportModal());
    }

    if (exportModalCancel) {
      exportModalCancel.addEventListener('click', () => this.closeExportModal());
    }

    if (exportModalConfirm) {
      exportModalConfirm.addEventListener('click', () => this.executeExport());
    }

    // Close modal when clicking outside
    if (this.exportModal) {
      this.exportModal.addEventListener('click', (e) => {
        if (e.target === this.exportModal) {
          this.closeExportModal();
        }
      });
    }
  }

  showExportModal() {
    // Calculate default date: September 1st of the current season
    // If we're before September, use last year's September 1st
    const today = new Date();
    let defaultYear = today.getFullYear();
    
    // If we're before September (months 0-8 in JS), use previous year
    if (today.getMonth() < 8) { // 8 = September (0-indexed)
      defaultYear = defaultYear - 1;
    }
    
    const defaultDate = new Date(defaultYear, 8, 1); // September 1st
    
    // Format date for input (YYYY-MM-DD)
    const formattedDate = defaultDate.toISOString().split('T')[0];
    
    const dateInput = document.getElementById('export-start-date');
    if (dateInput) {
      dateInput.value = formattedDate;
    }
    
    if (this.exportModal) {
		this.exportModal.classList.add('show');
    }
  }

  closeExportModal() {
    if (this.exportModal) {
		this.exportModal.classList.remove('show');
    }
  }

  // Helper method to format dates as "hh:mm of DD-MM-YYYY"
  formatExportDate(value) {
    if (!value) return null;
    
    let date;
    
    // Handle Firestore Timestamp
    if (value && typeof value.toDate === 'function') {
      date = value.toDate();
    }
    // Handle existing Date object
    else if (value instanceof Date) {
      date = value;
    }
    // Handle string or number
    else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    }
    // Handle Firestore Timestamp-like object with seconds
    else if (value && value.seconds) {
      date = new Date(value.seconds * 1000);
    }
    else {
      return value; // Return as-is if we can't parse it
    }
    
    // Check for valid date
    if (isNaN(date.getTime())) {
      return value;
    }
    
    // Format as "hh:mm of DD-MM-YYYY"
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${hours}:${minutes} of ${day}-${month}-${year}`;
  }

  // Helper method to process document data and format dates
  formatDocumentDates(data) {
    const formatted = { ...data };
    
    // List of known date fields to format
    const dateFields = ['date', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'lastLogin', 'last_login'];
    
    for (const key of Object.keys(formatted)) {
      const value = formatted[key];
      
      // Check if this is a known date field or looks like a Firestore Timestamp
      if (dateFields.includes(key) || (value && (typeof value.toDate === 'function' || value.seconds))) {
        formatted[key] = this.formatExportDate(value);
      }
    }
    
    return formatted;
  }


  bindDataManagementEvents() {
    const buttons = [
      { id: 'init-trails-btn', handler: () => this.initializeTrails() },
      { id: 'init-shelters-btn', handler: () => this.initializeShelters() },
      { id: 'create-sample-btn', handler: () => this.createSampleData() },
      { id: 'export-data-btn', handler: () => this.showExportModal() },
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
      status: document.getElementById('user-status').value,
      allowInspection: document.getElementById('user-allow-inspection')?.checked ?? true,
      allowInfraction: document.getElementById('user-allow-infraction')?.checked ?? true
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

      // Add user data to Firestore using main database instance with access control fields
      await this.db.collection('inspectors').doc(userCredential.user.uid).set({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        role: userData.role,
        status: userData.status,
        allowInspection: userData.allowInspection,
        allowInfraction: userData.allowInfraction,
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
  
  // Role styling
  const roleClass = userData.role === 'admin' ? 'role-admin' : 'role-inspector';
  const roleText = userData.role === 'admin' ? 'Administrateur' : 'Inspecteur';
  
  // Status styling
  const statusClass = userData.status === 'active' ? 'status-active' : 'status-inactive';
  const statusText = userData.status === 'active' ? 'Actif' : 'Inactif';

  // Access control styling
  const inspectionAccessClass = userData.allowInspection ? 'access-granted' : 'access-denied';
  const inspectionAccessText = userData.allowInspection ? '✓ Inspection' : '✗ Inspection';
  
  const infractionAccessClass = userData.allowInfraction ? 'access-granted' : 'access-denied';
  const infractionAccessText = userData.allowInfraction ? '✓ Infraction' : '✗ Infraction';

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
      <div class="access-badges">
        <button class="access-badge ${inspectionAccessClass}" 
                data-user-id="${userId}" 
                data-access-type="inspection"
                data-current-access="${userData.allowInspection}"
                title="Accès au projet Inspection">
          ${inspectionAccessText}
        </button>
        <button class="access-badge ${infractionAccessClass}" 
                data-user-id="${userId}" 
                data-access-type="infraction"
                data-current-access="${userData.allowInfraction}"
                title="Accès au projet Infraction">
          ${infractionAccessText}
        </button>
      </div>
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

    // Access toggle buttons
    document.querySelectorAll('.access-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        const accessType = e.target.dataset.accessType;
        const currentAccess = e.target.dataset.currentAccess === 'true';
        this.toggleUserAccess(userId, accessType, !currentAccess, e.target);
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

  async toggleUserAccess(userId, accessType, newAccess, buttonElement) {
  try {
    buttonElement.disabled = true;
    
    // Determine which field to update
    const fieldName = accessType === 'inspection' ? 'allowInspection' : 'allowInfraction';
    
    await this.db.collection('inspectors').doc(userId).update({
      [fieldName]: newAccess
    });

    // Update UI
    const newClass = newAccess ? 'access-granted' : 'access-denied';
    const oldClass = newAccess ? 'access-denied' : 'access-granted';
    const accessLabel = accessType === 'inspection' ? 'Inspection' : 'Infraction';
    const newText = newAccess ? `✓ ${accessLabel}` : `✗ ${accessLabel}`;
    
    buttonElement.classList.remove(oldClass);
    buttonElement.classList.add(newClass);
    buttonElement.textContent = newText;
    buttonElement.dataset.currentAccess = newAccess;

    this.showSuccess(`Accès ${accessLabel} ${newAccess ? 'activé' : 'désactivé'}`);
    
  } catch (error) {
    console.error('Error toggling access:', error);
    this.showError('Erreur lors de la modification de l\'accès');
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

  async executeExport() {
    const dateInput = document.getElementById('export-start-date');
    if (!dateInput || !dateInput.value) {
      alert('Veuillez sélectionner une date de début');
      return;
    }

    const startDate = new Date(dateInput.value);
    startDate.setHours(0, 0, 0, 0);
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);

    try {
      this.closeExportModal();
      
      const button = document.getElementById('export-data-btn');
      if (button) {
        button.disabled = true;
        button.textContent = 'Export en cours...';
      }
      
      // Load reference data for name resolution only
      const [trails, shelters, inspectors] = await Promise.all([
        this.db.collection('trails').get(),
        this.db.collection('shelters').get(),
        this.db.collection('inspectors').get()
      ]);

      // Create lookup maps for ID -> name resolution
      const trailsMap = new Map();
      trails.docs.forEach(doc => {
        const data = doc.data();
        trailsMap.set(doc.id, data.name || doc.id);
      });

      const sheltersMap = new Map();
      shelters.docs.forEach(doc => {
        const data = doc.data();
        sheltersMap.set(doc.id, data.name || doc.id);
      });

      const inspectorsMap = new Map();
      inspectors.docs.forEach(doc => {
        const data = doc.data();
        inspectorsMap.set(doc.id, data.name || doc.id);
      });

      // Load inspections filtered by date
      const [trailInspections, shelterInspections] = await Promise.all([
        this.db.collection('trail_inspections')
          .where('date', '>=', startTimestamp)
          .orderBy('date', 'desc')
          .get(),
        this.db.collection('shelter_inspections')
          .where('date', '>=', startTimestamp)
          .orderBy('date', 'desc')
          .get()
      ]);

      // Process trail inspections - resolve IDs to names
      const processedTrailInspections = trailInspections.docs.map(doc => {
        const data = this.formatDocumentDates(doc.data());
        if (data.trail_id) {
          data.trail_name = trailsMap.get(data.trail_id) || data.trail_id;
          delete data.trail_id;
        }
        if (data.inspector_id && !data.inspector_name) {
          data.inspector_name = inspectorsMap.get(data.inspector_id) || data.inspector_id;
        }
        delete data.inspector_id;
        return { id: doc.id, ...data };
      });

      // Process shelter inspections - resolve IDs to names
      const processedShelterInspections = shelterInspections.docs.map(doc => {
        const data = this.formatDocumentDates(doc.data());
        if (data.shelter_id) {
          data.shelter_name = sheltersMap.get(data.shelter_id) || data.shelter_id;
          delete data.shelter_id;
        }
        if (data.inspector_id && !data.inspector_name) {
          data.inspector_name = inspectorsMap.get(data.inspector_id) || data.inspector_id;
        }
        delete data.inspector_id;
        return { id: doc.id, ...data };
      });
      
      // Prepare export data - inspections only
      const exportData = {
        exportDate: this.formatExportDate(new Date()),
        exportPeriod: {
          from: this.formatExportDate(startDate),
          to: this.formatExportDate(new Date())
        },
        trailInspections: processedTrailInspections,
        shelterInspections: processedShelterInspections,
        summary: {
          trailInspectionsCount: trailInspections.size,
          shelterInspectionsCount: shelterInspections.size
        }
      };
      
      // Create filename with date range
      const fromDateStr = startDate.toISOString().split('T')[0];
      const toDateStr = new Date().toISOString().split('T')[0];
      const filename = `Inspections-from-${fromDateStr}-to-${toDateStr}.json`;
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✓ Données exportées avec succès (' + (trailInspections.size + shelterInspections.size) + ' inspections)');
      
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
