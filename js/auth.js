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
          
          // NEW: Update Infraction link visibility
          updateMainMenuLinkVisibility(currentUserData);
          
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
 * Configure les liens de déconnexion
 */
function setupLogoutLinks(loginLink, mobileLoginLink) {
  const logoutHandler = function(e) {
    e.preventDefault();
    auth.signOut().then(() => {
		window.location.href = 'https://vvaraldi.github.io/Orford_Patrouille/pages/login.html';
    }).catch(error => {
      console.error("Erreur lors de la déconnexion:", error);
    });
  };
  
  if (loginLink) {
    loginLink.textContent = 'Déconnexion';
    loginLink.onclick = logoutHandler;
  }
  
  if (mobileLoginLink) {
    mobileLoginLink.textContent = 'Déconnexion';
    mobileLoginLink.onclick = logoutHandler;
  }
}

/**
 * Affiche le contenu principal et charge les données
 */
function showContentAndLoadData(loading, mainContent) {
  if (loading) loading.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  // Charger les données selon la page
  if (typeof loadMapData === 'function') {
    console.log("Chargement des données de la carte...");
    loadMapData().then(() => {
      // Initialize bulk status buttons after map data is loaded (admin only)
      if (typeof initBulkStatusButtons === 'function') {
        console.log("Initializing bulk status buttons...");
        initBulkStatusButtons();
      }
    });
  }
  
  if (typeof loadDashboardData === 'function') {
    console.log("Chargement des données du tableau de bord...");
    loadDashboardData();
  }
  
  if (typeof loadInspectionHistory === 'function') {
    console.log("Chargement de l'historique des inspections...");
    loadInspectionHistory();
  }
  
  if (typeof window.loadTrailInspectionData === 'function') {
    console.log("Chargement des données pour trail-inspection");
    window.loadTrailInspectionData();
  }
  
  if (typeof window.loadShelterInspectionData === 'function') {
    console.log("Chargement des données pour shelter-inspection");
    window.loadShelterInspectionData();
  }
}

/**
 * Redirige vers la page de connexion
 */
function redirectToLogin(loading, mainContent) {
  const currentPage = window.location.pathname.split('/').pop();
  
  if (currentPage !== 'login.html') {
//    window.location.href = window.location.pathname.includes('/pages/') 
//      ? 'login.html' 
//      : 'pages/login.html';
	window.location.href = 'https://vvaraldi.github.io/Orford_Patrouille/pages/login.html';
  } else {
    if (loading) loading.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  }
}

/**
 * Gère la connexion d'un utilisateur
 */
function loginUser(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
    .then(async (userCredential) => {
      console.log("Connexion réussie pour:", email);
      
      const userDoc = await db.collection('inspectors').doc(userCredential.user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.status !== 'active') {
          await auth.signOut();
          throw new Error('account-disabled');
        }
        if (userData.allowInspection !== true) {
          await auth.signOut();
          throw new Error('no-inspection-access');
        }
      }
      
      return userCredential.user;
    });
}

/**
 * Déconnecte l'utilisateur actuel
 */
function logoutUser() {
  return auth.signOut()
    .then(() => {
      console.log("Déconnexion réussie");
    });
}

/**
 * Get current user data
 */
function getCurrentUser() {
  return currentUserData;
}

/**
 * Get current user ID
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
 * Get Firebase config
 */
function getFirebaseConfig() {
  return firebaseConfig;
}

/**
 * NEW: Update Infraction link visibility based on user permissions
 * @param {Object} userData - User data from inspectors collection
 */
function updateMainMenuLinkVisibility(userData) {
  const mainMenuLink = document.getElementById('main-menu-link');
  const mainMenuDivider = document.getElementById('main-menu-divider');
  const mobileMainMenuLink = document.getElementById('mobile-main-menu-link');
  
  // Afficher toujours le lien Menu principal (pas de condition d'accès)
  if (mainMenuLink) mainMenuLink.style.display = 'inline-flex';
  if (mainMenuDivider) mainMenuDivider.style.display = 'inline-block';
  if (mobileMainMenuLink) mobileMainMenuLink.style.display = 'block';
}

// Écouter le chargement du document pour vérifier l'authentification
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
});