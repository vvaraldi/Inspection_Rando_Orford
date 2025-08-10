/**
 * =====================================================
 * ADMIN.JS - Panneau d'administration Ski-Track
 * =====================================================
 * 
 * Ce fichier gère toutes les fonctionnalités du panneau d'administration :
 * - Gestion des utilisateurs (création, modification, suppression)
 * - Gestion des rôles et permissions
 * - Initialisation des données système
 * - Suppression des anciennes inspections
 * - Statistiques et maintenance
 * 
 * @requires Firebase Auth, Firestore, Storage
 * @author Ski-Track Team
 * @version 1.0.0
 */

// =====================================================
// CONFIGURATION ET VARIABLES GLOBALES
// =====================================================

/**
 * Services Firebase - seront initialisés après le chargement du DOM
 */
let auth = null;
let db = null;
let storage = null;

/**
 * ID de l'utilisateur actuellement connecté
 * Utilisé pour empêcher l'auto-modification/suppression
 */
let currentUserId = null;

/**
 * Configuration des données initiales pour les sentiers et abris
 */
const INITIAL_DATA = {
  trails: [
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
      name: "Le renard",
      length: 2.4,
      difficulty: "easy",
      description: "Sentier plus long mais avec pente douce",
      coordinates: { top: 430, left: 45 }
    },
    {
      id: 'trail_5',
      name: "Le lièvre",
      length: 1.3,
      difficulty: "medium",
      description: "Sentier intermédiaire avec quelques pentes",
      coordinates: { top: 145, left: 283 }
    },
    {
      id: 'trail_6',
      name: "Le Campagnol",
      length: 1.5,
      difficulty: "hard",
      description: "Sentier difficile pour randonneurs expérimentés",
      coordinates: { top: 20, left: 426 }
    },
    {
      id: 'trail_7',
      name: "L'Hermine",
      length: 1.8,
      difficulty: "medium",
      description: "Sentier intermédiaire avec belle vue",
      coordinates: { top: 372, left: 530 }
    },
    {
      id: 'trail_8',
      name: "L'Alouette",
      length: 2.4,
      difficulty: "medium",
      description: "Sentier avec dénivelé modéré",
      coordinates: { top: 410, left: 661 }
    },
    {
      id: 'trail_9',
      name: "L'Urubu",
      length: 1.2,
      difficulty: "hard",
      description: "Sentier technique et escarpé",
      coordinates: { top: 504, left: 255 }
    },
    {
      id: 'trail_10',
      name: "La Carcajou",
      length: 0.8,
      difficulty: "hard",
      description: "Court sentier mais très exigeant",
      coordinates: { top: 470, left: 288 }
    },
    {
      id: 'trail_11',
      name: "La Mille-Pattes",
      length: 1.5,
      difficulty: "hard",
      description: "Sentier avec plusieurs segments techniques",
      coordinates: { top: 308, left: 518 }
    }
  ],
  
  shelters: [
    {
      id: 'shelter_1',
      name: "Mont Giroux",
      altitude: 650,
      coordinates: { top: 457, left: 134 }
    },
    {
      id: 'shelter_2',
      name: "Mont Orford",
      altitude: 850,
      coordinates: { top: 41, left: 470 }
    },
    {
      id: 'shelter_3',
      name: "Mont Alfred-Desrochers",
      altitude: 615,
      coordinates: { top: 176, left: 621 }
    }
  ]
};

// =====================================================
// INITIALISATION
// =====================================================

/**
 * Point d'entrée principal - Initialise l'application admin
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Initialisation du panneau d\'administration...');
  
  // Initialiser les services Firebase
  initializeFirebase();
  
  // Vérifier l'authentification
  checkAuthentication();
  
  // Configurer les gestionnaires d'événements
  setupEventHandlers();
  
  // Initialiser la date de suppression par défaut
  initializeDeleteDate();
});

/**
 * Initialise les services Firebase
 */
function initializeFirebase() {
  try {
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Tentative d'initialisation de Firebase Storage
    try {
      storage = firebase.storage();
      console.log("✓ Firebase Storage initialisé avec succès");
    } catch (error) {
      console.warn("⚠ Firebase Storage n'est pas disponible:", error);
      console.warn("Les fonctionnalités de gestion des photos seront limitées");
    }
    
    console.log('✓ Services Firebase initialisés');
  } catch (error) {
    console.error('✗ Erreur lors de l\'initialisation Firebase:', error);
    showGlobalError('Erreur d\'initialisation. Veuillez recharger la page.');
  }
}

// =====================================================
// AUTHENTIFICATION ET AUTORISATION
// =====================================================

/**
 * Vérifie l'authentification et les permissions admin
 */
function checkAuthentication() {
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      currentUserId = user.uid;
      console.log('👤 Utilisateur connecté:', user.email);
      
      try {
        // Vérifier les privilèges admin
        const doc = await db.collection('inspectors').doc(user.uid).get();
        
        if (doc.exists && doc.data().role === 'admin') {
          console.log('✓ Privilèges admin confirmés');
          document.getElementById('admin-name').textContent = doc.data().name;
          
          // Charger les données
          await loadInspectors();
          await loadStatistics();
        } else {
          console.warn('⚠ Accès refusé - Pas de privilèges admin');
          window.location.href = '../index.html';
        }
      } catch (error) {
        console.error('✗ Erreur lors de la vérification des privilèges:', error);
        window.location.href = '../index.html';
      }
    } else {
      console.log('🔒 Non authentifié - Redirection vers login');
      window.location.href = 'login.html';
    }
  });
}

// =====================================================
// GESTION DES UTILISATEURS
// =====================================================

/**
 * Charge et affiche la liste des inspecteurs
 */
async function loadInspectors() {
  console.log('📋 Chargement de la liste des inspecteurs...');
  
  try {
    const snapshot = await db.collection('inspectors').get();
    const tbody = document.querySelector('#inspectors-table tbody');
    
    if (!tbody) {
      console.error('Table des inspecteurs non trouvée');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Aucun utilisateur trouvé</td></tr>';
      return;
    }
    
    // Créer une ligne pour chaque inspecteur
    snapshot.forEach(doc => {
      const row = createInspectorRow(doc.id, doc.data());
      tbody.appendChild(row);
    });
    
    // Configurer les événements sur les nouveaux éléments
    setupUserTableEvents();
    
    console.log(`✓ ${snapshot.size} inspecteur(s) chargé(s)`);
    
  } catch (error) {
    console.error('✗ Erreur lors du chargement des inspecteurs:', error);
    showStatus('user-status-message', 'Erreur lors du chargement des inspecteurs.', 'error');
  }
}

/**
 * Crée une ligne de tableau pour un inspecteur
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @returns {HTMLElement} Élément TR
 */
function createInspectorRow(userId, userData) {
  const row = document.createElement('tr');
  const isCurrentUser = (userId === currentUserId);
  
  // Préparer les éléments HTML pour le rôle et le statut
  const roleHtml = createRoleElement(userId, userData.role, isCurrentUser);
  const statusHtml = createStatusElement(userId, userData.status, isCurrentUser);
  const deleteHtml = createDeleteButton(userId, isCurrentUser);
  
  row.innerHTML = `
    <td>${userData.name}${isCurrentUser ? ' <span style="color: #1a56db;">(Vous)</span>' : ''}</td>
    <td>${userData.email}</td>
    <td>${userData.phone || '-'}</td>
    <td>${roleHtml}</td>
    <td>${statusHtml}</td>
    <td>${deleteHtml}</td>
  `;
  
  return row;
}

/**
 * Crée l'élément HTML pour le rôle
 */
function createRoleElement(userId, role, isCurrentUser) {
  const roleText = role === 'admin' ? 'Administrateur' : 'Inspecteur';
  const roleClass = role === 'admin' ? 'role-admin' : 'role-inspector';
  
  if (isCurrentUser) {
    return `<span class="role-badge ${roleClass}" title="Vous ne pouvez pas modifier votre propre rôle">${roleText}</span>`;
  }
  
  return `
    <button class="role-toggle-btn role-badge ${roleClass}" 
            data-user-id="${userId}" 
            data-current-role="${role}"
            title="Cliquer pour changer le rôle">
      ${roleText}
    </button>
  `;
}

/**
 * Crée l'élément HTML pour le statut
 */
function createStatusElement(userId, status, isCurrentUser) {
  const statusText = status === 'active' ? 'Actif' : 'Inactif';
  const statusClass = status === 'active' ? 'status-active' : 'status-inactive';
  
  if (isCurrentUser) {
    return `<span class="status-badge ${statusClass}" title="Vous ne pouvez pas modifier votre propre statut">${statusText}</span>`;
  }
  
  return `
    <button class="status-toggle-btn status-badge ${statusClass}" 
            data-user-id="${userId}" 
            data-current-status="${status}"
            title="Cliquer pour changer le statut">
      ${statusText}
    </button>
  `;
}

/**
 * Crée le bouton de suppression
 */
function createDeleteButton(userId, isCurrentUser) {
  if (isCurrentUser) {
    return '<button class="btn btn-secondary btn-sm" disabled title="Vous ne pouvez pas supprimer votre propre compte">Supprimer</button>';
  }
  
  return `<button class="btn btn-danger btn-sm delete-user" data-id="${userId}">Supprimer</button>`;
}

/**
 * Configure les événements pour la table des utilisateurs
 */
function setupUserTableEvents() {
  // Boutons de basculement de rôle
  document.querySelectorAll('.role-toggle-btn').forEach(btn => {
    btn.addEventListener('click', handleRoleToggle);
  });
  
  // Boutons de basculement de statut
  document.querySelectorAll('.status-toggle-btn').forEach(btn => {
    btn.addEventListener('click', handleStatusToggle);
  });
  
  // Boutons de suppression
  document.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', handleUserDelete);
  });
}

/**
 * Gère le changement de rôle d'un utilisateur
 */
async function handleRoleToggle(event) {
  const button = event.currentTarget;
  const userId = button.getAttribute('data-user-id');
  const currentRole = button.getAttribute('data-current-role');
  const newRole = currentRole === 'admin' ? 'inspector' : 'admin';
  
  // Confirmation pour les changements sensibles
  const confirmMessage = newRole === 'admin' 
    ? 'Êtes-vous sûr de vouloir donner les droits administrateur à cet utilisateur?'
    : 'Êtes-vous sûr de vouloir retirer les droits administrateur à cet utilisateur?';
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  button.disabled = true;
  button.textContent = 'Modification...';
  
  try {
    await db.collection('inspectors').doc(userId).update({
      role: newRole,
      lastModified: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Mettre à jour l'interface
    const newRoleText = newRole === 'admin' ? 'Administrateur' : 'Inspecteur';
    const newRoleClass = newRole === 'admin' ? 'role-admin' : 'role-inspector';
    
    button.textContent = newRoleText;
    button.className = `role-toggle-btn role-badge ${newRoleClass}`;
    button.setAttribute('data-current-role', newRole);
    
    showTemporaryMessage(`Rôle mis à jour : ${newRoleText}`, 'success');
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    
    // Restaurer l'état original
    const originalText = currentRole === 'admin' ? 'Administrateur' : 'Inspecteur';
    const originalClass = currentRole === 'admin' ? 'role-admin' : 'role-inspector';
    
    button.textContent = originalText;
    button.className = `role-toggle-btn role-badge ${originalClass}`;
    
    showTemporaryMessage('Erreur lors de la mise à jour du rôle', 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Gère le changement de statut d'un utilisateur
 */
async function handleStatusToggle(event) {
  const button = event.currentTarget;
  const userId = button.getAttribute('data-user-id');
  const currentStatus = button.getAttribute('data-current-status');
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  button.disabled = true;
  button.textContent = 'Modification...';
  
  try {
    await db.collection('inspectors').doc(userId).update({
      status: newStatus,
      lastModified: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Mettre à jour l'interface
    const newStatusText = newStatus === 'active' ? 'Actif' : 'Inactif';
    const newStatusClass = newStatus === 'active' ? 'status-active' : 'status-inactive';
    
    button.textContent = newStatusText;
    button.className = `status-toggle-btn status-badge ${newStatusClass}`;
    button.setAttribute('data-current-status', newStatus);
    
    showTemporaryMessage(`Statut mis à jour : ${newStatusText}`, 'success');
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    
    // Restaurer l'état original
    const originalText = currentStatus === 'active' ? 'Actif' : 'Inactif';
    const originalClass = currentStatus === 'active' ? 'status-active' : 'status-inactive';
    
    button.textContent = originalText;
    button.className = `status-toggle-btn status-badge ${originalClass}`;
    
    showTemporaryMessage('Erreur lors de la mise à jour du statut', 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Gère la suppression d'un utilisateur
 */
async function handleUserDelete(event) {
  const userId = event.currentTarget.getAttribute('data-id');
  
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur? Cette action est irréversible.')) {
    return;
  }
  
  event.currentTarget.disabled = true;
  
  try {
    const result = await deleteUser(userId);
    
    if (result.success) {
      alert(result.message);
      await loadInspectors(); // Recharger la liste
    } else {
      alert(result.message);
      event.currentTarget.disabled = false;
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    alert('Erreur lors de la suppression de l\'utilisateur');
    event.currentTarget.disabled = false;
  }
}

/**
 * Supprime un utilisateur et ses données associées
 * @param {string} userId - ID de l'utilisateur à supprimer
 * @returns {Object} Résultat de l'opération
 */
async function deleteUser(userId) {
  try {
    // Vérifier que l'utilisateur existe
    const userDoc = await db.collection('inspectors').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error("Utilisateur non trouvé dans la base de données");
    }
    
    // Supprimer l'utilisateur de Firestore
    await db.collection('inspectors').doc(userId).delete();
    
    // Note: Les inspections de cet utilisateur sont conservées pour l'historique
    // Si vous voulez les supprimer aussi, décommentez le code suivant :
    /*
    // Supprimer les inspections de sentiers
    const trailInspections = await db.collection('trail_inspections')
      .where('inspector_id', '==', userId)
      .get();
    
    const trailBatch = db.batch();
    trailInspections.forEach(doc => {
      trailBatch.delete(doc.ref);
    });
    await trailBatch.commit();
    
    // Supprimer les inspections d'abris
    const shelterInspections = await db.collection('shelter_inspections')
      .where('inspector_id', '==', userId)
      .get();
    
    const shelterBatch = db.batch();
    shelterInspections.forEach(doc => {
      shelterBatch.delete(doc.ref);
    });
    await shelterBatch.commit();
    */
    
    console.log("✓ Utilisateur supprimé avec succès");
    
    return {
      success: true,
      message: "Utilisateur supprimé. Note: Les inspections historiques sont conservées."
    };
    
  } catch (error) {
    console.error("✗ Erreur lors de la suppression de l'utilisateur:", error);
    
    return {
      success: false,
      message: "Erreur lors de la suppression: " + error.message
    };
  }
}

/**
 * Gère la création d'un nouvel utilisateur
 */
async function handleUserCreation(event) {
  event.preventDefault();
  
  const formData = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    phone: document.getElementById('user-phone').value,
    password: document.getElementById('user-password').value,
    role: document.getElementById('user-role').value,
    status: document.getElementById('user-status').value
  };
  
  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  
  try {
    // Créer l'utilisateur dans Firebase Auth
    const userCredential = await auth.createUserWithEmailAndPassword(
      formData.email, 
      formData.password
    );
    
    console.log("✓ Utilisateur créé dans Auth:", userCredential.user.uid);
    
    // Ajouter les informations dans Firestore
    await db.collection('inspectors').doc(userCredential.user.uid).set({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      status: formData.status,
      role: formData.role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("✓ Inspecteur ajouté à Firestore");
    showStatus('user-status-message', 'Utilisateur créé avec succès!', 'success');
    
    // Réinitialiser le formulaire et recharger la liste
    event.target.reset();
    await loadInspectors();
    
  } catch (error) {
    console.error("✗ Erreur lors de la création de l'utilisateur:", error);
    showStatus('user-status-message', 'Erreur: ' + error.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// =====================================================
// GESTION DES DONNÉES SYSTÈME
// =====================================================

/**
 * Initialise les données des sentiers
 */
async function initializeTrails() {
  if (!confirm('Êtes-vous sûr de vouloir initialiser les données des sentiers? Cela écrasera toutes les données existantes.')) {
    return;
  }
  
  showStatus('trails-status', 'Initialisation en cours...', 'info');
  
  try {
    const batch = db.batch();
    
    // Supprimer les sentiers existants
    const existingTrails = await db.collection('trails').get();
    existingTrails.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Ajouter les nouveaux sentiers
    INITIAL_DATA.trails.forEach(trail => {
      const docRef = db.collection('trails').doc(trail.id);
      batch.set(docRef, {
        name: trail.name,
        length: trail.length,
        difficulty: trail.difficulty,
        description: trail.description,
        coordinates: trail.coordinates,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    console.log('✓ Sentiers initialisés avec succès');
    showStatus('trails-status', 'Données des sentiers initialisées avec succès!', 'success');
    
  } catch (error) {
    console.error('✗ Erreur lors de l\'initialisation des sentiers:', error);
    showStatus('trails-status', 'Erreur: ' + error.message, 'error');
  }
}

/**
 * Initialise les données des abris
 */
async function initializeShelters() {
  if (!confirm('Êtes-vous sûr de vouloir initialiser les données des abris? Cela écrasera toutes les données existantes.')) {
    return;
  }
  
  showStatus('shelters-status', 'Initialisation en cours...', 'info');
  
  try {
    const batch = db.batch();
    
    // Supprimer les abris existants
    const existingShelters = await db.collection('shelters').get();
    existingShelters.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Ajouter les nouveaux abris
    INITIAL_DATA.shelters.forEach(shelter => {
      const docRef = db.collection('shelters').doc(shelter.id);
      batch.set(docRef, {
        name: shelter.name,
        altitude: shelter.altitude,
        coordinates: shelter.coordinates,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    console.log('✓ Abris initialisés avec succès');
    showStatus('shelters-status', 'Données des abris initialisées avec succès!', 'success');
    
  } catch (error) {
    console.error('✗ Erreur lors de l\'initialisation des abris:', error);
    showStatus('shelters-status', 'Erreur: ' + error.message, 'error');
  }
}

/**
 * Réinitialise toutes les inspections
 */
async function resetAllInspections() {
  if (!confirm('ATTENTION: Voulez-vous vraiment supprimer TOUTES les inspections? Cette action est irréversible.')) {
    return;
  }
  
  showStatus('reset-status', 'Réinitialisation en cours...', 'warning');
  
  try {
    // Supprimer les inspections de sentiers
    const trailBatch = db.batch();
    const trailInspections = await db.collection('trail_inspections').get();
    trailInspections.forEach(doc => {
      trailBatch.delete(doc.ref);
    });
    await trailBatch.commit();
    
    // Supprimer les inspections d'abris
    const shelterBatch = db.batch();
    const shelterInspections = await db.collection('shelter_inspections').get();
    shelterInspections.forEach(doc => {
      shelterBatch.delete(doc.ref);
    });
    await shelterBatch.commit();
    
    console.log('✓ Toutes les inspections ont été supprimées');
    showStatus('reset-status', 'Toutes les inspections ont été supprimées.', 'success');
    
    // Recharger les statistiques
    await loadStatistics();
    
  } catch (error) {
    console.error('✗ Erreur lors de la réinitialisation:', error);
    showStatus('reset-status', 'Erreur: ' + error.message, 'error');
  }
}

// =====================================================
// SUPPRESSION DES ANCIENNES INSPECTIONS
// =====================================================

/**
 * Initialise la date par défaut pour la suppression (7 mois avant aujourd'hui)
 */
function initializeDeleteDate() {
  const cutoffDateInput = document.getElementById('cutoff-date');
  if (!cutoffDateInput) return;
  
  const today = new Date();
  const sevenMonthsAgo = new Date(today);
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  
  // Formater la date pour l'input (YYYY-MM-DD)
  const year = sevenMonthsAgo.getFullYear();
  const month = String(sevenMonthsAgo.getMonth() + 1).padStart(2, '0');
  const day = String(sevenMonthsAgo.getDate()).padStart(2, '0');
  cutoffDateInput.value = `${year}-${month}-${day}`;
}

/**
 * Supprime les inspections antérieures à une date donnée
 */
async function deleteOldInspections() {
  const cutoffDateInput = document.getElementById('cutoff-date');
  
  if (!cutoffDateInput || !cutoffDateInput.value) {
    alert('Veuillez sélectionner une date limite.');
    return;
  }
  
  const button = document.getElementById('delete-old-inspections-btn');
  const originalText = button.textContent;
  
  // Convertir la date en timestamp Firebase
  const cutoffDate = new Date(cutoffDateInput.value + 'T00:00:00');
  const cutoffTimestamp = firebase.firestore.Timestamp.fromDate(cutoffDate);
  
  button.disabled = true;
  button.textContent = 'Comptage des inspections...';
  
  try {
    // Compter les inspections à supprimer
    const stats = await countInspectionsToDelete(cutoffTimestamp);
    
    if (stats.total === 0) {
      showStatus('delete-old-status', 'Aucune inspection trouvée avant cette date.', 'info');
      return;
    }
    
    // Demander confirmation
    if (!confirmDeletion(stats, cutoffDate)) {
      return;
    }
    
    // Procéder à la suppression
    button.textContent = 'Suppression en cours...';
    showStatus('delete-old-status', 'Suppression des inspections en cours...', 'warning');
    
    const result = await performDeletion(cutoffTimestamp, button);
    
    // Afficher le résultat
    displayDeletionResult(result);
    
    // Recharger les statistiques
    await loadStatistics();
    
  } catch (error) {
    console.error('✗ Erreur lors de la suppression:', error);
    showStatus('delete-old-status', 'Erreur lors de la suppression: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

/**
 * Compte les inspections à supprimer
 */
async function countInspectionsToDelete(cutoffTimestamp) {
  const trailSnapshot = await db.collection('trail_inspections')
    .where('date', '<', cutoffTimestamp)
    .get();
  
  const shelterSnapshot = await db.collection('shelter_inspections')
    .where('date', '<', cutoffTimestamp)
    .get();
  
  return {
    trails: trailSnapshot.size,
    shelters: shelterSnapshot.size,
    total: trailSnapshot.size + shelterSnapshot.size,
    trailSnapshot,
    shelterSnapshot
  };
}

/**
 * Demande confirmation pour la suppression
 */
function confirmDeletion(stats, cutoffDate) {
  const formattedDate = cutoffDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  const confirmMessage = 
    `ATTENTION: Vous êtes sur le point de supprimer ${stats.total} inspection(s) antérieure(s) au ${formattedDate}:\n\n` +
    `- ${stats.trails} inspection(s) de sentiers\n` +
    `- ${stats.shelters} inspection(s) d'abris\n\n` +
    `Cette action est IRRÉVERSIBLE. Voulez-vous continuer?`;
  
  return confirm(confirmMessage);
}

/**
 * Effectue la suppression des inspections et photos
 */
async function performDeletion(cutoffTimestamp, button) {
  const stats = await countInspectionsToDelete(cutoffTimestamp);
  const canDeletePhotos = storage !== null;
  
  let deletedCount = 0;
  let photosDeleted = 0;
  let photosFailed = 0;
  
  if (!canDeletePhotos) {
    console.warn('⚠ Firebase Storage non disponible - les photos ne seront pas supprimées');
  }
  
  // Supprimer les inspections de sentiers
  if (stats.trails > 0) {
    button.textContent = `Suppression des inspections de sentiers...`;
    
    for (const doc of stats.trailSnapshot.docs) {
      const inspectionData = doc.data();
      
      // Supprimer les photos si possible
      if (canDeletePhotos && inspectionData.photos && inspectionData.photos.length > 0) {
        button.textContent = `Suppression des photos... (${deletedCount + 1}/${stats.total})`;
        const photoResult = await deleteInspectionPhotos(inspectionData, doc.id, 'trails');
        photosDeleted += photoResult.deleted;
        photosFailed += photoResult.failed;
      }
      
      // Supprimer le document
      await doc.ref.delete();
      deletedCount++;
      button.textContent = `Suppression... (${deletedCount}/${stats.total})`;
    }
  }
  
  // Supprimer les inspections d'abris
  if (stats.shelters > 0) {
    button.textContent = `Suppression des inspections d'abris...`;
    
    for (const doc of stats.shelterSnapshot.docs) {
      const inspectionData = doc.data();
      
      // Supprimer les photos si possible
      if (canDeletePhotos && inspectionData.photos && inspectionData.photos.length > 0) {
        button.textContent = `Suppression des photos... (${deletedCount + 1}/${stats.total})`;
        const photoResult = await deleteInspectionPhotos(inspectionData, doc.id, 'shelters');
        photosDeleted += photoResult.deleted;
        photosFailed += photoResult.failed;
      }
      
      // Supprimer le document
      await doc.ref.delete();
      deletedCount++;
      button.textContent = `Suppression... (${deletedCount}/${stats.total})`;
    }
  }
  
  return {
    total: stats.total,
    deleted: deletedCount,
    photosDeleted,
    photosFailed,
    canDeletePhotos
  };
}

/**
 * Supprime les photos d'une inspection
 */
async function deleteInspectionPhotos(inspectionData, inspectionId, type) {
  if (!storage || !inspectionData.photos || inspectionData.photos.length === 0) {
    return { deleted: 0, failed: 0 };
  }
  
  let deleted = 0;
  let failed = 0;
  
  for (const photoUrl of inspectionData.photos) {
    try {
      const photoRef = storage.refFromURL(photoUrl);
      await photoRef.delete();
      deleted++;
      console.log('✓ Photo supprimée:', photoUrl);
    } catch (error) {
      console.error('✗ Erreur lors de la suppression de la photo:', photoUrl, error);
      failed++;
    }
  }
  
  return { deleted, failed };
}

/**
 * Affiche le résultat de la suppression
 */
function displayDeletionResult(result) {
  let statusMessage = `✓ ${result.total} inspection(s) supprimée(s) avec succès.`;
  
  if (result.canDeletePhotos) {
    if (result.photosDeleted > 0 || result.photosFailed > 0) {
      statusMessage += ` ${result.photosDeleted} photo(s) supprimée(s).`;
      if (result.photosFailed > 0) {
        statusMessage += ` ${result.photosFailed} photo(s) n'ont pas pu être supprimées.`;
      }
    }
  } else {
    statusMessage += '\n⚠ Note: Les photos n\'ont pas pu être supprimées (Firebase Storage non configuré).';
  }
  
  showStatus('delete-old-status', statusMessage, 'success');
}

// =====================================================
// STATISTIQUES
// =====================================================

/**
 * Charge et affiche les statistiques
 */
async function loadStatistics() {
  console.log('📊 Chargement des statistiques...');
  
  try {
    // Compter les inspections
    const trailInspections = await db.collection('trail_inspections').get();
    const shelterInspections = await db.collection('shelter_inspections').get();
    
    // Mettre à jour l'affichage (si les éléments existent)
    const totalElem = document.getElementById('total-inspections');
    if (totalElem) {
      totalElem.textContent = trailInspections.size + shelterInspections.size;
    }
    
    const trailElem = document.getElementById('trail-inspections');
    if (trailElem) {
      trailElem.textContent = trailInspections.size;
    }
    
    const shelterElem = document.getElementById('shelter-inspections');
    if (shelterElem) {
      shelterElem.textContent = shelterInspections.size;
    }
    
    // Compter les utilisateurs actifs
    const inspectors = await db.collection('inspectors')
      .where('status', '==', 'active')
      .get();
    
    const activeUsersElem = document.getElementById('active-users');
    if (activeUsersElem) {
      activeUsersElem.textContent = inspectors.size;
    }
    
    console.log('✓ Statistiques chargées');
    
  } catch (error) {
    console.error('✗ Erreur lors du chargement des statistiques:', error);
  }
}

// =====================================================
// GESTIONNAIRES D'ÉVÉNEMENTS
// =====================================================

/**
 * Configure tous les gestionnaires d'événements
 */
function setupEventHandlers() {
  // Gestion des onglets
  setupTabNavigation();
  
  // Formulaire de création d'utilisateur
  const userForm = document.getElementById('user-form');
  if (userForm) {
    userForm.addEventListener('submit', handleUserCreation);
  }
  
  // Bouton d'annulation du formulaire
  const cancelBtn = document.getElementById('cancel-user-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.getElementById('user-form').reset();
    });
  }
  
  // Boutons d'initialisation des données
  const initTrailsBtn = document.getElementById('init-trails-btn');
  if (initTrailsBtn) {
    initTrailsBtn.addEventListener('click', initializeTrails);
    initTrailsBtn.disabled = false; // Activer le bouton
  }
  
  const initSheltersBtn = document.getElementById('init-shelters-btn');
  if (initSheltersBtn) {
    initSheltersBtn.addEventListener('click', initializeShelters);
    initSheltersBtn.disabled = false; // Activer le bouton
  }
  
  // Bouton de réinitialisation des inspections
  const resetBtn = document.getElementById('reset-inspections-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllInspections);
    resetBtn.disabled = false; // Activer le bouton
  }
  
  // Bouton de suppression des anciennes inspections
  const deleteOldBtn = document.getElementById('delete-old-inspections-btn');
  if (deleteOldBtn) {
    deleteOldBtn.addEventListener('click', deleteOldInspections);
  }
  
  // Bouton de création de données de test
  const sampleBtn = document.getElementById('create-sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', createSampleData);
    sampleBtn.disabled = false; // Activer le bouton
  }
  
  // Bouton d'export (pas encore implémenté)
  const exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      alert('Fonctionnalité d\'exportation en cours de développement.');
    });
  }
  
  // Modal de suppression
  setupModalHandlers();
}

/**
 * Configure la navigation par onglets
 */
function setupTabNavigation() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      // Désactiver tous les onglets
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
      });
      
      // Activer l'onglet cliqué
      this.classList.add('active');
      
      // Masquer tout le contenu
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Afficher le contenu correspondant
      const tabId = this.getAttribute('data-tab') + '-tab';
      const tabContent = document.getElementById(tabId);
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
}

/**
 * Configure les gestionnaires de la modal
 */
function setupModalHandlers() {
  const modal = document.getElementById('delete-modal');
  if (!modal) return;
  
  const closeBtn = modal.querySelector('.modal-close');
  const cancelBtn = modal.querySelector('.modal-cancel');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  // Fermer la modal en cliquant à l'extérieur
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

/**
 * Crée des données de test
 */
async function createSampleData() {
  if (!confirm('Voulez-vous créer des données d\'inspection de test? Cela ajoutera plusieurs inspections fictives.')) {
    return;
  }
  
  showStatus('sample-status', 'Création des données de test en cours...', 'info');
  
  try {
    // Récupérer un inspecteur pour les tests
    const inspectorsSnapshot = await db.collection('inspectors').limit(1).get();
    if (inspectorsSnapshot.empty) {
      throw new Error('Aucun inspecteur disponible pour créer les données de test');
    }
    
    const inspectorId = inspectorsSnapshot.docs[0].id;
    
    // Récupérer les sentiers et abris
    const trailsSnapshot = await db.collection('trails').limit(3).get();
    const sheltersSnapshot = await db.collection('shelters').limit(2).get();
    
    const batch = db.batch();
    const now = new Date();
    
    // Créer des inspections de sentiers
    trailsSnapshot.forEach((trailDoc, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - index * 7); // Une inspection par semaine
      
      const inspectionRef = db.collection('trail_inspections').doc();
      batch.set(inspectionRef, {
        trail_id: trailDoc.id,
        inspector_id: inspectorId,
        date: firebase.firestore.Timestamp.fromDate(date),
        condition: ['good', 'warning', 'critical'][index % 3],
        issues: index % 2 === 0 ? ['Test issue 1', 'Test issue 2'] : [],
        comments: `Inspection de test #${index + 1}`,
        photos: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    // Créer des inspections d'abris
    sheltersSnapshot.forEach((shelterDoc, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - index * 10);
      
      const inspectionRef = db.collection('shelter_inspections').doc();
      batch.set(inspectionRef, {
        shelter_id: shelterDoc.id,
        inspector_id: inspectorId,
        date: firebase.firestore.Timestamp.fromDate(date),
        condition: ['good', 'warning'][index % 2],
        cleanliness: ['good', 'warning', 'critical'][index % 3],
        accessibility: 'good',
        issues: [],
        comments: `Inspection d'abri de test #${index + 1}`,
        photos: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    console.log('✓ Données de test créées avec succès');
    showStatus('sample-status', 'Données de test créées avec succès!', 'success');
    
    // Recharger les statistiques
    await loadStatistics();
    
  } catch (error) {
    console.error('✗ Erreur lors de la création des données de test:', error);
    showStatus('sample-status', 'Erreur: ' + error.message, 'error');
  }
}

// =====================================================
// UTILITAIRES D'INTERFACE
// =====================================================

/**
 * Affiche un message de statut
 * @param {string} elementId - ID de l'élément où afficher le message
 * @param {string} message - Message à afficher
 * @param {string} type - Type de message (success, error, warning, info)
 */
function showStatus(elementId, message, type) {
  const statusElement = document.getElementById(elementId);
  if (!statusElement) return;
  
  statusElement.textContent = message;
  statusElement.className = 'status-message status-' + type;
  statusElement.style.display = 'block';
  
  // Masquer automatiquement après 5 secondes (sauf pour les erreurs)
  if (type !== 'error') {
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
}

/**
 * Affiche un message temporaire flottant
 * @param {string} message - Message à afficher
 * @param {string} type - Type de message (success, error)
 */
function showTemporaryMessage(message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `status-message status-${type} temporary-message`;
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(messageDiv);
  
  // Supprimer après 3 secondes
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
}

/**
 * Affiche une erreur globale
 * @param {string} message - Message d'erreur
 */
function showGlobalError(message) {
  alert(`Erreur système:\n\n${message}`);
}

// =====================================================
// EXPORT DES FONCTIONS (si utilisation en module)
// =====================================================

// Si vous voulez utiliser ce fichier comme module, décommentez :
/*
export {
  initializeFirebase,
  checkAuthentication,
  loadInspectors,
  loadStatistics,
  deleteOldInspections,
  initializeTrails,
  initializeShelters,
  resetAllInspections
};
*/

console.log('✓ admin.js chargé avec succès');
