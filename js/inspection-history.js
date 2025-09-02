/**
 * Inspection History Management
 * Handles filtering, sorting, pagination and modal display
 */


/**
 * Récupère le nom de l'inspecteur à partir de son ID
 * @param {string} inspectorId - L'ID de l'inspecteur
 * @returns {Promise<string>} - Le nom de l'inspecteur ou une valeur par défaut
 */
async function getInspectorName(inspectorId) {
  if (!inspectorId) {
    console.warn("ID d'inspecteur manquant");
    return "Inspecteur inconnu";
  }
  
  try {
    const inspectorDoc = await db.collection('inspectors').doc(inspectorId).get();
    
    if (inspectorDoc.exists) {
      const data = inspectorDoc.data();
      return data.name || "Inspecteur sans nom";
    } else {
      console.warn(`Inspecteur non trouvé: ${inspectorId}`);
      return "Inspecteur inconnu";
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du nom de l'inspecteur:", error);
    return "Inspecteur inconnu";
  }
}

class InspectionHistoryManager {
  constructor() {
    console.log('Initializing InspectionHistoryManager');
    
    this.allInspections = [];
    this.filteredInspections = [];
    this.currentPage = 1;
    this.pageSize = 25;
    this.sortField = 'date';
    this.sortDirection = 'desc';
    this.filtersVisible = true;
	this.isAdminUser = false;
	this.auth = firebase.auth();
	this.db = firebase.firestore();
	this.storage = firebase.storage();

	console.log('Firebase services initialized - Storage available:', !!this.storage); // Add this debug line
  
  // Check if Firebase is available
    if (typeof db === 'undefined') {
      console.error('Firebase Firestore not available');
      this.showError('Firebase non disponible');
      return;
    }
    
	this.initializeElements();
    this.bindEvents();
    this.loadData();
  }

  initializeElements() {
    console.log('Initializing elements');
    
    // Main elements
    this.loadingScreen = document.getElementById('loading');
    this.mainContent = document.getElementById('main-content');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.inspectionsTable = document.getElementById('inspections-table');
    this.paginationContainer = document.getElementById('pagination-container');
    this.paginationButtons = document.getElementById('pagination-buttons');
    this.paginationInfo = document.getElementById('pagination-info');
    this.resultsCount = document.getElementById('results-count');
    
    // Check critical elements
    if (!this.inspectionsTable) {
      console.error('Critical element missing: inspections-table');
      return false;
    }
    
    // Filter elements
    this.dateFilter = document.getElementById('date-filter');
    this.customDateRange = document.getElementById('custom-date-range');
    this.startDate = document.getElementById('start-date');
    this.endDate = document.getElementById('end-date');
    this.typeFilter = document.getElementById('type-filter');
    this.locationFilter = document.getElementById('location-filter');
    this.statusFilter = document.getElementById('status-filter');
    this.inspectorFilter = document.getElementById('inspector-filter');
    this.searchInput = document.getElementById('search-input');
    this.toggleFiltersBtn = document.getElementById('toggle-filters');
    this.filtersContent = document.getElementById('filters-content');
    this.resetFiltersBtn = document.getElementById('reset-filters');
    this.applyFiltersBtn = document.getElementById('apply-filters');
    this.pageSizeSelect = document.getElementById('page-size');
    
    // Modal elements
    this.modal = document.getElementById('inspection-modal');
    this.modalContent = document.getElementById('modal-content');
    this.closeModalBtn = document.getElementById('close-modal');
    this.closeModalBtnFooter = document.getElementById('close-modal-btn');
    
    // Export button
    this.exportBtn = document.getElementById('export-btn');
    
    console.log('Elements initialized successfully');
    return true;
  }

  bindEvents() {
    console.log('Binding events');
    
    // Filter events - check if elements exist
    if (this.dateFilter) this.dateFilter.addEventListener('change', () => this.handleDateFilterChange());
    if (this.typeFilter) this.typeFilter.addEventListener('change', () => this.applyFilters());
    if (this.locationFilter) this.locationFilter.addEventListener('change', () => this.applyFilters());
    if (this.statusFilter) this.statusFilter.addEventListener('change', () => this.applyFilters());
    if (this.inspectorFilter) this.inspectorFilter.addEventListener('change', () => this.applyFilters());
    if (this.searchInput) this.searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
    if (this.resetFiltersBtn) this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());
    if (this.applyFiltersBtn) this.applyFiltersBtn.addEventListener('click', () => this.applyFilters());
    if (this.pageSizeSelect) this.pageSizeSelect.addEventListener('change', () => this.handlePageSizeChange());
    
    // Toggle filters
    if (this.toggleFiltersBtn) this.toggleFiltersBtn.addEventListener('click', () => this.toggleFilters());
    
    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', (e) => this.handleSort(e));
    });
    
    // Modal events
    if (this.closeModalBtn) this.closeModalBtn.addEventListener('click', () => this.closeModal());
    if (this.closeModalBtnFooter) this.closeModalBtnFooter.addEventListener('click', () => this.closeModal());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }
    
    // Export
    if (this.exportBtn) this.exportBtn.addEventListener('click', () => this.exportData());
    
    console.log('Events bound successfully');
  }

async loadData() {
  try {
    this.showLoading(true);
    
    // Check user role first
    await this.checkUserRole();
    console.log('Role check complete, isAdminUser:', this.isAdminUser);
    
    // Load trail inspections
    const trailInspectionsSnapshot = await db.collection('trail_inspections').get();
    const trailInspections = await Promise.all(trailInspectionsSnapshot.docs.map(async doc => {
      const data = doc.data();
      
      // Récupérer le nom de l'inspecteur
      let inspectorName = "Non spécifié";
      if (data.inspector_name) {
        // Utiliser le nom déjà stocké si disponible
        inspectorName = data.inspector_name;
      } else if (data.inspector_id) {
        // Sinon, récupérer le nom à partir de l'ID
        inspectorName = await getInspectorName(data.inspector_id);
      }
      
      return {
        id: doc.id,
        type: 'trail',
        ...data,
        date: data.date ? data.date.toDate() : new Date(),
        locationId: data.trail_id,
        inspector: inspectorName  // Utiliser le nom résolu au lieu de l'ID
      };
    }));

    // Load shelter inspections
    const shelterInspectionsSnapshot = await db.collection('shelter_inspections').get();
    const shelterInspections = await Promise.all(shelterInspectionsSnapshot.docs.map(async doc => {
      const data = doc.data();
      
      // Récupérer le nom de l'inspecteur
      let inspectorName = "Non spécifié";
      if (data.inspector_name) {
        // Utiliser le nom déjà stocké si disponible
        inspectorName = data.inspector_name;
      } else if (data.inspector_id) {
        // Sinon, récupérer le nom à partir de l'ID
        inspectorName = await getInspectorName(data.inspector_id);
      }
      
      return {
        id: doc.id,
        type: 'shelter',
        ...data,
        date: data.date ? data.date.toDate() : new Date(),
        locationId: data.shelter_id,
        inspector: inspectorName  // Utiliser le nom résolu au lieu de l'ID
      };
    }));

    // Combine all inspections
    this.allInspections = [...trailInspections, ...shelterInspections];

    // Load location names for each inspection
    await this.loadLocationNames();
    
    // Load locations for filters
    await this.loadFilterOptions();
    
    // Initial filter and display
    this.applyFilters();
    this.showMainContent();

  } catch (error) {
		console.error('Erreur lors du chargement des données:', error);
		this.showError('Erreur lors du chargement des données');
	} finally {
		this.showLoading(false);
	}
}

  async loadLocationNames() {
    try {
      // Load trails
      const trailsSnapshot = await db.collection('trails').get();
      const trails = new Map();
      trailsSnapshot.forEach(doc => {
        trails.set(doc.id, doc.data());
      });

      // Load shelters
      const sheltersSnapshot = await db.collection('shelters').get();
      const shelters = new Map();
      sheltersSnapshot.forEach(doc => {
        shelters.set(doc.id, doc.data());
      });

      // Update inspection location names
      this.allInspections.forEach(inspection => {
        if (inspection.type === 'trail' && inspection.locationId) {
          const trail = trails.get(inspection.locationId);
          inspection.location = trail ? trail.name : 'Sentier inconnu';
        } else if (inspection.type === 'shelter' && inspection.locationId) {
          const shelter = shelters.get(inspection.locationId);
          inspection.location = shelter ? shelter.name : 'Abri inconnu';
        } else {
          inspection.location = 'Lieu non spécifié';
        }
      });

    } catch (error) {
      console.error('Erreur lors du chargement des noms de lieux:', error);
    }
  }

  async loadFilterOptions() {
    try {
      // Load trails
      const trailsSnapshot = await db.collection('trails').get();
      const trails = trailsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        type: 'trail'
      }));

      // Load shelters
      const sheltersSnapshot = await db.collection('shelters').get();
      const shelters = sheltersSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        type: 'shelter'
      }));

      // Combine and sort locations
      const allLocations = [...trails, ...shelters].sort((a, b) => a.name.localeCompare(b.name));

      // Populate location filter
      this.locationFilter.innerHTML = '<option value="all">Tous</option>';
      allLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = `${location.name} (${location.type === 'trail' ? 'Sentier' : 'Abri'})`;
        this.locationFilter.appendChild(option);
      });

      // Populate inspector filter with unique inspectors
      const inspectors = [...new Set(this.allInspections.map(i => i.inspector))].filter(Boolean);
      this.inspectorFilter.innerHTML = '<option value="all">Tous les inspecteurs</option>';
      inspectors.forEach(inspector => {
        const option = document.createElement('option');
        option.value = inspector;
        option.textContent = inspector;
        this.inspectorFilter.appendChild(option);
      });

    } catch (error) {
      console.error('Erreur lors du chargement des options de filtre:', error);
    }
  }

  handleDateFilterChange() {
    const value = this.dateFilter.value;
    if (value === 'custom') {
      this.customDateRange.style.display = 'block';
    } else {
      this.customDateRange.style.display = 'none';
    }
    this.applyFilters();
  }

  applyFilters() {
    this.showLoading(true);
    
    setTimeout(() => {
      this.filteredInspections = this.allInspections.filter(inspection => {
        return this.passesDateFilter(inspection) &&
               this.passesTypeFilter(inspection) &&
               this.passesLocationFilter(inspection) &&
               this.passesStatusFilter(inspection) &&
               this.passesInspectorFilter(inspection) &&
               this.passesSearchFilter(inspection);
      });

      this.sortInspections();
      this.currentPage = 1;
      this.updateDisplay();
      this.showLoading(false);
    }, 100);
  }

  passesDateFilter(inspection) {
    const filterValue = this.dateFilter.value;
    const inspectionDate = inspection.date;
    const now = new Date();

    switch (filterValue) {
      case 'all':
        return true;
      case 'today':
        return this.isSameDay(inspectionDate, now);
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return inspectionDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return inspectionDate >= monthAgo;
      case 'custom':
        const startDate = this.startDate.value ? new Date(this.startDate.value) : null;
        const endDate = this.endDate.value ? new Date(this.endDate.value) : null;
        
        if (startDate && endDate) {
          return inspectionDate >= startDate && inspectionDate <= endDate;
        } else if (startDate) {
          return inspectionDate >= startDate;
        } else if (endDate) {
          return inspectionDate <= endDate;
        }
        return true;
      default:
        return true;
    }
  }

  passesTypeFilter(inspection) {
    const filterValue = this.typeFilter.value;
    return filterValue === 'all' || inspection.type === filterValue;
  }

  passesLocationFilter(inspection) {
    const filterValue = this.locationFilter.value;
    return filterValue === 'all' || inspection.locationId === filterValue;
  }

  passesStatusFilter(inspection) {
    const filterValue = this.statusFilter.value;
    return filterValue === 'all' || inspection.condition === filterValue;
  }

  passesInspectorFilter(inspection) {
    const filterValue = this.inspectorFilter.value;
    return filterValue === 'all' || inspection.inspector === filterValue;
  }

  passesSearchFilter(inspection) {
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (!searchTerm) return true;

    const searchableText = [
      inspection.inspector,
      inspection.location,
      inspection.notes,
      ...(inspection.issues || [])
    ].join(' ').toLowerCase();

    return searchableText.includes(searchTerm);
  }

  sortInspections() {
    this.filteredInspections.sort((a, b) => {
      let valueA, valueB;

      switch (this.sortField) {
        case 'date':
          valueA = a.date.getTime();
          valueB = b.date.getTime();
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        case 'location':
          valueA = a.location || '';
          valueB = b.location || '';
          break;
        case 'inspector':
          valueA = a.inspector || '';
          valueB = b.inspector || '';
          break;
        case 'condition':
          const order = { 'critical': 0, 'warning': 1, 'good': 2, 'not-inspected': 3 };
          valueA = order[a.condition] || 4;
          valueB = order[b.condition] || 4;
          break;
        default:
          valueA = a.date.getTime();
          valueB = b.date.getTime();
      }

      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
  }

  handleSort(event) {
    const field = event.target.dataset.sort;
    
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.sortInspections();
    this.updateDisplay();
    this.updateSortIndicators();
  }

  updateSortIndicators() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    
    const currentTh = document.querySelector(`th[data-sort="${this.sortField}"]`);
    if (currentTh) {
      currentTh.classList.add(`sort-${this.sortDirection}`);
    }
  }

  handlePageSizeChange() {
    this.pageSize = parseInt(this.pageSizeSelect.value);
    this.currentPage = 1;
    this.updateDisplay();
  }

  updateDisplay() {
    this.displayInspections();
    this.updatePagination();
    this.updateResultsCount();
  }

  displayInspections(inspections) {
	  if (!inspections || inspections.length === 0) {
		this.inspectionsTable.innerHTML = `
		  <tr>
			<td colspan="8" class="text-center">Aucune inspection trouvée</td>
		  </tr>
		`;
		document.getElementById('results-count').textContent = '0';
		return;
	  }

	  let html = '';
	  
	  inspections.forEach(inspection => {
		const date = inspection.date ? inspection.date.toDate() : new Date();
		const formattedDate = this.formatDate(date);
		const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
		const locationName = inspection.locationName || 'Inconnu';
		const inspectorName = inspection.inspector_name || 'Inconnu';
		
		// Status badge
		const statusBadge = this.createStatusBadge(inspection.condition);
		
		// NEW: Trail Status badge (only for trail inspections)
		const trailStatusBadge = inspection.type === 'trail' && inspection.trail_status 
		  ? this.createTrailStatusBadge(inspection.trail_status)
		  : '<span class="badge badge-secondary">N/A</span>';
		
		// Photos count
		const photosCount = inspection.photos ? inspection.photos.length : 0;
		const photosText = photosCount > 0 ? `${photosCount} photo${photosCount > 1 ? 's' : ''}` : 'Aucune';
		
		// Admin actions
		const adminActions = this.isAdminUser ? 
		  `<button class="btn btn-sm btn-danger" onclick="inspectionHistoryManager.deleteInspection('${inspection.id}')" title="Supprimer">🗑️</button>` : 
		  '';

		html += `
		  <tr class="inspection-row" data-inspection-id="${inspection.id}">
			<td>${formattedDate}</td>
			<td>
			  <span class="badge badge-${inspection.type === 'trail' ? 'primary' : 'secondary'}">
				${typeText}
			  </span>
			</td>
			<td>${locationName}</td>
			<td>${inspectorName}</td>
			<td>${statusBadge}</td>
			<td>${trailStatusBadge}</td>
			<td>
			  <span class="text-muted">${photosText}</span>
			</td>
			<td>
			  <div class="btn-group btn-group-sm">
				<button class="btn btn-sm btn-primary" onclick="inspectionHistoryManager.viewInspectionDetails('${inspection.id}')" title="Voir les détails">👁️</button>
				${adminActions}
			  </div>
			</td>
		  </tr>
		`;
	  });

	  this.inspectionsTable.innerHTML = html;
	  document.getElementById('results-count').textContent = inspections.length.toString();
  }

  createInspectionRow(inspection) {
	console.log('Creating row - isAdminUser:', this.isAdminUser); // Add this line for debugging

    const row = document.createElement('tr');
    
    const formattedDate = this.formatDate(inspection.date);
    const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
    const typeClass = inspection.type === 'trail' ? 'type-trail' : 'type-shelter';
    const statusBadge = this.createStatusBadge(inspection.condition);
    const photoCount = inspection.photos ? inspection.photos.length : 0;

  // Create action buttons - add delete button for admin users
  let actionButtons = `
    <div class="action-buttons">
      <button class="btn btn-sm btn-primary" onclick="inspectionHistory.viewDetails('${inspection.id}')" title="Voir les détails">
        👁️
      </button>
      <button class="btn btn-sm btn-secondary" onclick="inspectionHistory.downloadReport('${inspection.id}')" title="Télécharger le rapport">
        📄
      </button>`;

  // Add delete button only for admin users
  if (this.isAdminUser) {
    actionButtons += `
      <button class="btn btn-sm btn-danger" onclick="inspectionHistory.deleteInspection('${inspection.id}')" title="Supprimer l'inspection">
        🗑️
      </button>`;
  }

  actionButtons += `</div>`;

  row.innerHTML = `
    <td>${formattedDate}</td>
    <td class="${typeClass}">${typeText}</td>
    <td>${inspection.location || 'Non spécifié'}</td>
    <td>${inspection.inspector || 'Non spécifié'}</td>
    <td>${statusBadge}</td>
    <td>
      <span class="photo-count">
        📷 ${photoCount}
      </span>
    </td>
    <td>
      ${actionButtons}
    </td>
  `;

  return row;
  }

  createStatusBadge(condition) {
    const badges = {
      good: '<span class="badge badge-success">Bon</span>',
      warning: '<span class="badge badge-warning">Attention</span>',
      critical: '<span class="badge badge-danger">Critique</span>',
      'not-inspected': '<span class="badge badge-secondary">Non inspecté</span>'
    };
    return badges[condition] || badges['not-inspected'];
  }

  createTrailStatusBadge(trailStatus) {
	  const statusConfig = {
		'open': { class: 'badge-success', text: '🟢 Ouvert', title: 'Sentier ouvert au public' },
		'closed': { class: 'badge-danger', text: '🔴 Fermé', title: 'Sentier fermé au public' }
	  };
	  
	  const config = statusConfig[trailStatus] || { class: 'badge-secondary', text: '❓ Inconnu', title: 'Statut inconnu' };
	  
	  return `<span class="badge ${config.class}" title="${config.title}">${config.text}</span>`;
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredInspections.length / this.pageSize);
    
    if (totalPages <= 1) {
      this.paginationButtons.innerHTML = '';
      return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
      <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
              onclick="inspectionHistory.goToPage(${this.currentPage - 1})" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        ‹
      </button>
    `;

    // Page numbers
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
          <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                  onclick="inspectionHistory.goToPage(${i})">
            ${i}
          </button>
        `;
      }
    } else {
      // Complex pagination with ellipsis
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          paginationHTML += `
            <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="inspectionHistory.goToPage(${i})">
              ${i}
            </button>
          `;
        }
        paginationHTML += '<span class="page-ellipsis">…</span>';
        paginationHTML += `
          <button class="page-btn" onclick="inspectionHistory.goToPage(${totalPages})">
            ${totalPages}
          </button>
        `;
      } else if (this.currentPage >= totalPages - 2) {
        paginationHTML += `
          <button class="page-btn" onclick="inspectionHistory.goToPage(1)">1</button>
        `;
        paginationHTML += '<span class="page-ellipsis">…</span>';
        for (let i = totalPages - 4; i <= totalPages; i++) {
          paginationHTML += `
            <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="inspectionHistory.goToPage(${i})">
              ${i}
            </button>
          `;
        }
      } else {
        paginationHTML += `
          <button class="page-btn" onclick="inspectionHistory.goToPage(1)">1</button>
        `;
        paginationHTML += '<span class="page-ellipsis">…</span>';
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          paginationHTML += `
            <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="inspectionHistory.goToPage(${i})">
              ${i}
            </button>
          `;
        }
        paginationHTML += '<span class="page-ellipsis">…</span>';
        paginationHTML += `
          <button class="page-btn" onclick="inspectionHistory.goToPage(${totalPages})">
            ${totalPages}
          </button>
        `;
      }
    }

    // Next button
    paginationHTML += `
      <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
              onclick="inspectionHistory.goToPage(${this.currentPage + 1})" 
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        ›
      </button>
    `;

    this.paginationButtons.innerHTML = paginationHTML;
    this.updatePaginationInfo();
  }

  updatePaginationInfo() {
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredInspections.length);
    const total = this.filteredInspections.length;
    
    this.paginationInfo.textContent = `Affichage de ${startIndex} à ${endIndex} sur ${total} inspections`;
  }

  updateResultsCount() {
    this.resultsCount.textContent = this.filteredInspections.length;
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredInspections.length / this.pageSize);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.updateDisplay();
    }
  }

  async viewDetails(inspectionId) {
    try {
      const inspection = this.allInspections.find(i => i.id === inspectionId);
      if (!inspection) return;

      const modalContent = await this.generateModalContent(inspection);
      this.modalContent.innerHTML = modalContent;
      this.showModal();
    } catch (error) {
      console.error('Erreur lors de l\'affichage des détails:', error);
    }
  }

  // Updated generateModalContent method - ADD TRAIL STATUS
  async generateModalContent(inspection) {
	  const formattedDate = this.formatDate(inspection.date.toDate());
	  const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
	  const statusBadge = this.createStatusBadge(inspection.condition);

	  let specificInfo = '';
	  if (inspection.type === 'trail') {
		// NEW: Trail Status in modal
		const trailStatusBadge = inspection.trail_status 
		  ? this.createTrailStatusBadge(inspection.trail_status)
		  : '<span class="badge badge-secondary">Non spécifié</span>';
		  
		specificInfo = `
		  <div class="detail-section">
			<h3>Informations du sentier</h3>
			<ul class="detail-list">
			  <li class="detail-item">
				<span class="detail-label">Statut du sentier</span>
				<span class="detail-value">${trailStatusBadge}</span>
			  </li>
			  <li class="detail-item">
				<span class="detail-label">Longueur</span>
				<span class="detail-value">${inspection.length || 'Non spécifié'} km</span>
			  </li>
			  <li class="detail-item">
				<span class="detail-label">Difficulté</span>
				<span class="detail-value">${this.getDifficultyText(inspection.difficulty)}</span>
			  </li>
			  ${inspection.snow_condition ? `
			  <li class="detail-item">
				<span class="detail-label">Conditions de neige</span>
				<span class="detail-value">${this.getSnowConditionText(inspection.snow_condition)}</span>
			  </li>` : ''}
			</ul>
		  </div>
		`;
	  } else if (inspection.type === 'shelter') {
		specificInfo = `
		  <div class="detail-section">
			<h3>Informations de l'abri</h3>
			<ul class="detail-list">
			  ${inspection.cleanliness ? `
			  <li class="detail-item">
				<span class="detail-label">Propreté</span>
				<span class="detail-value">${this.getCleanlinessText(inspection.cleanliness)}</span>
			  </li>` : ''}
			  ${inspection.accessibility ? `
			  <li class="detail-item">
				<span class="detail-label">Accessibilité</span>
				<span class="detail-value">${this.getAccessibilityText(inspection.accessibility)}</span>
			  </li>` : ''}
			  ${inspection.capacity ? `
			  <li class="detail-item">
				<span class="detail-label">Capacité</span>
				<span class="detail-value">${inspection.capacity} personnes</span>
			  </li>` : ''}
			</ul>
		  </div>
		`;
	  }

	  // Issues section
	  let issuesSection = '';
	  if (inspection.issues && inspection.issues.length > 0) {
		issuesSection = `
		  <div class="detail-section">
			<h3>Problèmes identifiés</h3>
			<ul class="issues-list">
			  ${inspection.issues.map(issue => `<li class="issue-item">⚠️ ${issue}</li>`).join('')}
			</ul>
		  </div>
		`;
	  }

	  // Photos section
	  let photosSection = '';
	  if (inspection.photos && inspection.photos.length > 0) {
		photosSection = `
		  <div class="detail-section">
			<h3>Photos (${inspection.photos.length})</h3>
			<div class="photos-grid">
			  ${inspection.photos.map((photo, index) => `
				<div class="photo-thumbnail" onclick="window.open('${photo}', '_blank')">
				  <img src="${photo}" alt="Photo ${index + 1}" loading="lazy" />
				</div>
			  `).join('')}
			</div>
		  </div>
		`;
	  }

	  // Notes section
	  let notesSection = '';
	  if (inspection.notes && inspection.notes.trim()) {
		notesSection = `
		  <div class="detail-section">
			<h3>Notes et commentaires</h3>
			<div class="notes-content">
			  ${inspection.notes.replace(/\n/g, '<br>')}
			</div>
		  </div>
		`;
	  }

	  return `
		<div class="inspection-details">
		  <div class="detail-header">
			<div class="detail-header-main">
			  <h2>${typeText}: ${inspection.locationName}</h2>
			  <div class="detail-header-meta">
				<span class="detail-date">${formattedDate}</span>
				<span class="detail-inspector">Par ${inspection.inspector_name}</span>
			  </div>
			</div>
			<div class="detail-header-status">
			  ${statusBadge}
			</div>
		  </div>

		  ${specificInfo}
		  ${issuesSection}
		  ${notesSection}
		  ${photosSection}
		</div>
	  `;
  }

// NEW HELPER METHOD: Get snow condition text
  getSnowConditionText(condition) {
	  const conditionMap = {
		'good': 'Bonnes conditions',
		'warning': 'Conditions moyennes',
		'critical': 'Mauvaises conditions',
		'none': 'Non évalué'
	  };
	  return conditionMap[condition] || condition;
  }

  getDifficultyText(difficulty) {
    const texts = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile'
    };
    return texts[difficulty] || 'Non spécifié';
  }

  getSnowConditionText(condition) {
    const texts = {
      good: 'Bonnes',
      warning: 'Moyennes',
      critical: 'Mauvaises'
    };
    return texts[condition] || 'Non spécifié';
  }

  getCleanlinessText(cleanliness) {
    const texts = {
      good: 'Propre',
      warning: 'Moyen',
      critical: 'Sale'
    };
    return texts[cleanliness] || 'Non spécifié';
  }

  getAccessibilityText(accessibility) {
    const texts = {
      good: 'Dégagé',
      warning: 'Partiellement obstrué',
      critical: 'Bloqué'
    };
    return texts[accessibility] || 'Non spécifié';
  }

  downloadReport(inspectionId) {
    const inspection = this.allInspections.find(i => i.id === inspectionId);
    if (!inspection) return;

    // Generate and download PDF report
    this.generatePDFReport(inspection);
  }

  generatePDFReport(inspection) {
    // Simple text-based report for now
    const reportContent = this.generateTextReport(inspection);
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-${inspection.id}-${this.formatDateForFilename(inspection.date)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateTextReport(inspection) {
    const typeText = inspection.type === 'trail' ? 'Sentier' : 'Abri';
    const formattedDate = this.formatDate(inspection.date);
    
    let report = `RAPPORT D'INSPECTION\n`;
    report += `========================\n\n`;
    report += `Date: ${formattedDate}\n`;
    report += `Type: ${typeText}\n`;
    report += `Lieu: ${inspection.location || 'Non spécifié'}\n`;
    report += `Inspecteur: ${inspection.inspector || 'Non spécifié'}\n`;
    report += `État: ${inspection.condition || 'Non spécifié'}\n\n`;
    
    if (inspection.notes) {
      report += `NOTES:\n${inspection.notes}\n\n`;
    }
    
    if (inspection.issues && inspection.issues.length > 0) {
      report += `PROBLÈMES SIGNALÉS:\n`;
      inspection.issues.forEach((issue, index) => {
        report += `${index + 1}. ${issue}\n`;
      });
      report += `\n`;
    }
    
    if (inspection.photos && inspection.photos.length > 0) {
      report += `PHOTOS:\n`;
      inspection.photos.forEach((photo, index) => {
        report += `${index + 1}. ${photo}\n`;
      });
    }
    
    return report;
  }

  exportData() {
    const csv = this.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspections-export-${this.formatDateForFilename(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateCSV() {
    const headers = [
      'Date',
      'Type',
      'Lieu',
      'Inspecteur',
      'État',
      'Notes',
      'Problèmes',
      'Nombre de photos'
    ];
    
    let csv = headers.join(',') + '\n';
    
    this.filteredInspections.forEach(inspection => {
      const row = [
        this.formatDate(inspection.date),
        inspection.type === 'trail' ? 'Sentier' : 'Abri',
        `"${inspection.location || ''}"`,
        `"${inspection.inspector || ''}"`,
        inspection.condition || '',
        `"${inspection.notes || ''}"`,
        `"${inspection.issues ? inspection.issues.join('; ') : ''}"`,
        inspection.photos ? inspection.photos.length : 0
      ];
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  resetFilters() {
    this.dateFilter.value = 'all';
    this.typeFilter.value = 'all';
    this.locationFilter.value = 'all';
    this.statusFilter.value = 'all';
    this.inspectorFilter.value = 'all';
    this.searchInput.value = '';
    this.startDate.value = '';
    this.endDate.value = '';
    this.customDateRange.style.display = 'none';
    
    this.applyFilters();
  }

  toggleFilters() {
    this.filtersVisible = !this.filtersVisible;
    this.filtersContent.style.display = this.filtersVisible ? 'block' : 'none';
    
    const toggleText = document.getElementById('filter-toggle-text');
    toggleText.textContent = this.filtersVisible ? 'Masquer' : 'Afficher';
  }

  showModal() {
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  showLoading(show = true) {
    if (show) {
      this.loadingOverlay.style.display = 'flex';
    } else {
      this.loadingOverlay.style.display = 'none';
    }
  }

  showMainContent() {
    this.loadingScreen.style.display = 'none';
    this.mainContent.style.display = 'block';
  }

  showError(message) {
    this.inspectionsTable.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="color: var(--color-danger);">
          ${message}
        </td>
      </tr>
    `;
    this.showMainContent();
  }

  formatDate(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  formatDateForFilename(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

async checkUserRole() {
  console.log('Checking user role...'); // Add this line
  try {
    if (!this.auth || !this.auth.currentUser) {
      console.log('No auth or db available'); // Add this line  
      this.isAdminUser = false;
      return;
    }

    const user = this.auth.currentUser;
    const userDoc = await this.db.collection('inspectors').doc(user.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      this.isAdminUser = (userData.role === 'admin');
      console.log('User role check complete - isAdmin:', this.isAdminUser, 'userData:', userData); // Add this line
    }
  } catch (error) {
    console.error('Error checking user role:', error);
    this.isAdminUser = false;
  }
}

async deleteInspection(inspectionId) {
  if (!this.isAdminUser) {
    alert('Accès refusé - Permissions administrateur requises');
    return;
  }

  const inspection = this.allInspections.find(i => i.id === inspectionId);
  if (!inspection) {
    alert('Inspection non trouvée');
    return;
  }

  // Enhanced confirmation message with photo info
  const photoCount = inspection.photos ? inspection.photos.length : 0;
  const confirmMessage = `Êtes-vous sûr de vouloir supprimer cette inspection ?\n\n` +
    `Date: ${this.formatDate(inspection.date)}\n` +
    `Type: ${inspection.type === 'trail' ? 'Sentier' : 'Abri'}\n` +
    `Lieu: ${inspection.location || 'Non spécifié'}\n` +
    `Inspecteur: ${inspection.inspector || 'Non spécifié'}\n` +
    `Photos: ${photoCount} photo(s)\n\n` +
    `Cette action supprimera définitivement l'inspection ET toutes ses photos.\n` +
    `Cette action est irréversible.`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // Show loading state
    const deleteButton = document.querySelector(`button[onclick*="deleteInspection('${inspectionId}')"]`);
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.innerHTML = '⏳';
    }

    // Use the initialized storage reference
    if (!this.storage) {
      throw new Error('Firebase Storage non initialisé');
    }

    // Step 1: Delete all photos from Firebase Storage
    if (inspection.photos && inspection.photos.length > 0) {
      console.log(`Deleting ${inspection.photos.length} photos from storage...`);
      
      const photoDeletePromises = inspection.photos.map(async (photoUrl) => {
        try {
          // Extract the storage path from the download URL
          const storageRef = this.storage.refFromURL(photoUrl);
          await storageRef.delete();
          console.log(`Deleted photo: ${storageRef.fullPath}`);
        } catch (photoError) {
          console.warn(`Failed to delete photo: ${photoUrl}`, photoError);
          // Continue with other deletions even if one fails
        }
      });

      // Wait for all photo deletions to complete (or fail)
      await Promise.allSettled(photoDeletePromises);
    }

    // Step 2: Delete the inspection document from Firestore
    const collection = inspection.type === 'trail' ? 'trail_inspections' : 'shelter_inspections';
    console.log(`Deleting inspection document from ${collection}...`);
    await this.db.collection(collection).doc(inspectionId).delete();

    // Step 3: Remove from local arrays and update display
    this.allInspections = this.allInspections.filter(i => i.id !== inspectionId);
    this.filteredInspections = this.filteredInspections.filter(i => i.id !== inspectionId);

    this.updateDisplay();
    
    // Show success message with details
    const successMessage = photoCount > 0 
      ? `Inspection supprimée avec succès (${photoCount} photo(s) également supprimée(s))`
      : 'Inspection supprimée avec succès';
    
    this.showSuccessMessage(successMessage);
    
    console.log(`Successfully deleted inspection ${inspectionId} with ${photoCount} photos`);
    
  } catch (error) {
    console.error('Error deleting inspection:', error);
    
    let errorMessage = 'Erreur lors de la suppression de l\'inspection';
    if (error.code === 'permission-denied') {
      errorMessage = 'Permissions insuffisantes pour supprimer cette inspection';
    } else if (error.code === 'not-found') {
      errorMessage = 'Inspection non trouvée (peut-être déjà supprimée)';
    } else if (error.message) {
      errorMessage += ': ' + error.message;
    }
    
    alert(errorMessage);
    
    // Restore button state
    const deleteButton = document.querySelector(`button[onclick*="deleteInspection('${inspectionId}')"]`);
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = '🗑️';
    }
  }
}

// Add this method to show success messages
showSuccessMessage(message) {
  // Create a temporary success message element
  const successDiv = document.createElement('div');
  successDiv.className = 'alert alert-success';
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
    font-weight: 500;
  `;
  successDiv.textContent = message;
  
  document.body.appendChild(successDiv);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 5000);
}

}

// Initialize when DOM is loaded and auth is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the inspection history page
  if (!document.getElementById('inspections-table')) {
    console.log('Not on inspection history page');
    return;
  }

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return;
  }

  // Wait for auth to be ready
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is authenticated, initialize the inspection history
      console.log('User authenticated, initializing inspection history');
      window.inspectionHistory = new InspectionHistoryManager();
    } else {
      // Redirect to login if not authenticated
      console.log('User not authenticated, redirecting to login');
      const loginUrl = window.location.pathname.includes('/pages/') 
        ? 'login.html' 
        : 'pages/login.html';
      window.location.href = loginUrl;
    }
  });
});
