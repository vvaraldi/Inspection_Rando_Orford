// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDcBZrwGTskM7QUvanzLTACEJ_T-55j-DA",
    authDomain: "trail-inspection.firebaseapp.com",
    projectId: "trail-inspection",
    storageBucket: "trail-inspection.firebasestorage.app",
    messagingSenderId: "415995272058",
    appId: "1:415995272058:web:dc476de8ffee052e2ad4c3",
    measurementId: "G-EBLYWBM9YB"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

// Références aux services Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Current user data
let currentUser = null;
let currentUserData = null;

/**
 * Vérifie l'état d'authentification de l'utilisateur
 * Redirige vers la page de connexion si non connecté
 * Charge les données du tableau de bord si connecté
 */
function checkAuthStatus() {
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  const loginLink = document.getElementById('login-link');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const adminLink = document.getElementById('admin-link');
  const mobileAdminLink = document.getElementById('mobile-admin-link');
  
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      currentUser = user;
      console.log("Utilisateur connecté:", user.email);
      
      try {
        // Récupérer une seule fois les informations de l'utilisateur
        const inspectorDoc = await db.collection('inspectors').doc(user.uid).get();
        
        if (inspectorDoc.exists) {
          currentUserData = inspectorDoc.data();
          currentUserData.uid = user.uid;
          
          // Vérifier si l'utilisateur est actif
          if (currentUserData.status !== 'active') {
            console.log("Compte utilisateur désactivé");
            alert('Votre compte a été désactivé. Contactez l\'administrateur.');
            await auth.signOut();
            redirectToLogin(loading, mainContent);
            return;
          }
          
          // Vérifier si l'utilisateur a accès au système d'inspection
          if (currentUserData.allowInspection !== true) {
            console.log("Utilisateur n'a pas accès au système d'inspection");
            alert('Vous n\'avez pas accès au système d\'inspection. Contactez l\'administrateur.');
            await auth.signOut();
            redirectToLogin(loading, mainContent);
            return;
          }
          
          // Mettre à jour le nom affiché
          const userName = document.getElementById('user-name');
          if (userName && currentUserData.name) {
            userName.textContent = currentUserData.name;
          }
          
          // Vérifier si l'utilisateur est admin
          if (currentUserData.role === 'admin') {
            console.log("L'utilisateur est administrateur");
            if (adminLink) adminLink.style.display = 'inline';
            if (mobileAdminLink) mobileAdminLink.style.display = 'inline';
          }
          
          // Update Infraction link visibility based on user's infraction access
          updateInfractionLinkVisibility(currentUserData);
        } else {
          console.warn("Document de l'utilisateur non trouvé dans Firestore");
        }
        
        // Mettre à jour les liens de connexion/déconnexion
        setupLogoutLinks(loginLink, mobileLoginLink);
        
        // Afficher le contenu et charger les données
        showContentAndLoadData(loading, mainContent);
        
      } catch (error) {
        console.error("Erreur lors de la vérification de l'utilisateur:", error);
        setupLogoutLinks(loginLink, mobileLoginLink);
        showContentAndLoadData(loading, mainContent);
      }
      
    } else {
      // Utilisateur non connecté
      console.log("Aucun utilisateur connecté");
      redirectToLogin(loading, mainContent);
    }
  });
}

/**
 * Update Infraction link visibility based on user's infraction access
 * @param {Object} userData - User data from inspectors collection
 */
function updateInfractionLinkVisibility(userData) {
  const infractionLink = document.getElementById('infraction-link');
  const infractionDivider = document.getElementById('infraction-divider');
  const mobileInfractionLink = document.getElementById('mobile-infraction-link');
  
  // Check if user has infraction access
  const hasInfractionAccess = userData.allowInfraction === true;
  
  if (hasInfractionAccess) {
    // Show Infraction links
    if (infractionLink) infractionLink.style.display = 'inline-flex';
    if (infractionDivider) infractionDivider.style.display = 'inline-block';
    if (mobileInfractionLink) mobileInfractionLink.style.display = 'block';
  } else {
    // Hide Infraction links
    if (infractionLink) infractionLink.style.display = 'none';
    if (infractionDivider) infractionDivider.style.display = 'none';
    if (mobileInfractionLink) mobileInfractionLink.style.display = 'none';
  }
}

/**
 * Configure les liens de déconnexion
 */
function setupLogoutLinks(loginLink, mobileLoginLink) {
  const logoutHandler = function(e) {
    e.preventDefault();
    auth.signOut().then(() => {
      const loginUrl = window.location.pathname.includes('/pages/') 
        ? 'login.html' 
        : 'pages/login.html';
      window.location.href = loginUrl;
    }).catch((error) => {
      console.error("Erreur lors de la déconnexion:", error);
    });
  };
  
  if (loginLink) {
    loginLink.textContent = 'Déconnexion';
    loginLink.addEventListener('click', logoutHandler);
  }
  
  if (mobileLoginLink) {
    mobileLoginLink.textContent = 'Déconnexion';
    mobileLoginLink.addEventListener('click', logoutHandler);
  }
}

/**
 * Affiche le contenu principal et charge les données
 */
function showContentAndLoadData(loading, mainContent) {
  if (loading) loading.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  // Charger les données du tableau de bord si la fonction existe
  if (typeof loadDashboardData === 'function') {
    loadDashboardData();
  }
}

/**
 * Redirige vers la page de connexion
 */
function redirectToLogin(loading, mainContent) {
  if (loading) loading.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';
  
  const loginUrl = window.location.pathname.includes('/pages/') 
    ? 'login.html' 
    : 'pages/login.html';
  window.location.href = loginUrl;
}

/**
 * Get current user data
 * @returns {Object|null} Current user data
 */
function getCurrentUser() {
  return currentUserData;
}

/**
 * Get current user ID
 * @returns {string|null} Current user ID
 */
function getCurrentUserId() {
  return currentUser ? currentUser.uid : null;
}

/**
 * Check if current user is admin
 */
function isAdmin() {
  return currentUserData && currentUserData.role === 'admin';
}

/**
 * Check if current user has infraction access
 * @returns {boolean} True if has infraction access
 */
function hasInfractionAccess() {
  return currentUserData && currentUserData.allowInfraction === true;
}

/**
 * Get Firebase config
 */
function getFirebaseConfig() {
  return firebaseConfig;
}

// Écouter le chargement du document pour vérifier l'authentification
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
});