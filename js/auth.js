/**
 * auth.js
 * Firebase Authentication for Inspection system
 * Uses shared inspectors collection from Ski-Track
 * SUPER DEFENSIVE VERSION - checks if Firebase is loaded
 */

console.log('auth.js loading...');

// Check if Firebase is available
if (typeof firebase === 'undefined') {
  console.error('CRITICAL: Firebase is not loaded! Check your script tags.');
  alert('Erreur: Firebase n\'est pas chargé. Veuillez recharger la page.');
}

// Firebase configuration (same as Ski-Track project)
const firebaseConfig = {
  apiKey: "AIzaSyDcBZrwGTskM7QUvanzLTACEJ_T-55j-DA",
  authDomain: "trail-inspection.firebaseapp.com",
  projectId: "trail-inspection",
  storageBucket: "trail-inspection.firebasestorage.app",
  messagingSenderId: "415995272058",
  appId: "1:415995272058:web:dc476de8ffee052e2ad4c3",
  measurementId: "G-EBLYWBM9YB"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Firebase services - with error checking
let auth, db, storage;

try {
  auth = firebase.auth();
  console.log('Auth initialized:', typeof auth);
} catch (error) {
  console.error('Error initializing auth:', error);
}

try {
  db = firebase.firestore();
  console.log('Firestore initialized:', typeof db);
} catch (error) {
  console.error('Error initializing firestore:', error);
}

try {
  storage = firebase.storage();
  console.log('Storage initialized:', typeof storage);
} catch (error) {
  console.error('Error initializing storage:', error);
}

// Current user data
let currentUser = null;
let currentUserData = null;

/**
 * Check authentication status and handle redirects
 * UPDATED: Now checks for allowInfraction access
 */
function checkAuthStatus() {
  console.log('checkAuthStatus called, auth is:', typeof auth);
  
  if (!auth) {
    console.error('Auth is not initialized!');
    return;
  }
  
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  const loginLink = document.getElementById('login-link');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const adminLink = document.getElementById('admin-link');
  const mobileAdminLink = document.getElementById('mobile-admin-link');
  
  auth.onAuthStateChanged(async function(user) {
    if (user) {
      currentUser = user;
      console.log('User logged in:', user.email);
      
      try {
        // Get user data from inspectors collection
        const inspectorDoc = await db.collection('inspectors').doc(user.uid).get();
        
        if (inspectorDoc.exists) {
          currentUserData = inspectorDoc.data();
          currentUserData.uid = user.uid;
          console.log('User data loaded:', currentUserData);
          
          // Check if user is active
          if (currentUserData.status !== 'active') {
            console.log('User account is not active');
            showAccessDenied('Votre compte a été désactivé. Contactez l\'administrateur.');
            await auth.signOut();
            return;
          }
          
          // Check if user has inspection access
          if (currentUserData.allowInspection !== true) {
            console.log('User does not have inspection access');
            showAccessDenied('Vous n\'avez pas accès au système d\'inspection. Contactez l\'administrateur.');
            await auth.signOut();
            return;
          }
          
          console.log('User authorized, showing content');
          
          // User is authorized - show content
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
          
          // Update UI based on role
          updateUIForRole(currentUserData.role);
          
          // Dispatch authenticated event
          document.dispatchEvent(new CustomEvent('userAuthenticated', {
            detail: currentUserData
          }));
          
        } else {
          // User not found in inspectors collection
          console.log('User document not found in Firestore');
          showAccessDenied('Utilisateur non trouvé. Contactez l\'administrateur.');
          await auth.signOut();
        }
        
      } catch (error) {
        console.error('Error checking auth status:', error);
        showAccessDenied('Erreur lors de la vérification des accès.');
        await auth.signOut();
      }
      
    } else {
      // Not logged in
      console.log('No user logged in');
      currentUser = null;
      currentUserData = null;
      
      // Check if we're already on the login page
      if (!window.location.pathname.includes('login.html')) {
        console.log('Redirecting to login');
        redirectToLogin();
      }
    }
  });
}

/**
 * Update UI elements based on user role
 */
function updateUIForRole(role) {
  const adminLink = document.getElementById('admin-link');
  const mobileAdminLink = document.getElementById('mobile-admin-link');
  const loginLink = document.getElementById('login-link');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  
  // Show admin link for admins
  if (role === 'admin') {
    if (adminLink) adminLink.style.display = 'block';
    if (mobileAdminLink) mobileAdminLink.style.display = 'block';
  }
  
  // Update login links to logout
  if (loginLink) {
    loginLink.textContent = 'Déconnexion';
    loginLink.href = '#';
    loginLink.onclick = handleLogout;
  }
  
  if (mobileLoginLink) {
    mobileLoginLink.textContent = 'Déconnexion';
    mobileLoginLink.href = '#';
    mobileLoginLink.onclick = handleLogout;
  }
}

/**
 * Display access denied message and redirect
 */
function showAccessDenied(message) {
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  
  // Hide loading and main content
  if (loading) loading.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';
  
  // Show alert
  alert(message);
  
  // Redirect to login
  redirectToLogin();
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  const isInPages = window.location.pathname.includes('/pages/');
  const loginUrl = isInPages ? 'login.html' : 'pages/login.html';
  console.log('Redirecting to:', loginUrl);
  window.location.href = loginUrl;
}

/**
 * Redirect to main page
 */
function redirectToMain() {
  const isInPages = window.location.pathname.includes('/pages/');
  const mainUrl = isInPages ? '../index.html' : 'index.html';
  window.location.href = mainUrl;
}

/**
 * Handle user login
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Login result
 */
async function loginUser(email, password) {
  console.log('Attempting login for:', email);
  
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    console.log('Firebase login successful');
    
    // Check if user exists in inspectors collection
    const inspectorDoc = await db.collection('inspectors').doc(userCredential.user.uid).get();
    
    if (!inspectorDoc.exists) {
      console.log('User not found in inspectors collection');
      await auth.signOut();
      throw new Error('account-not-found');
    }
    
    const userData = inspectorDoc.data();
    console.log('User data:', userData);
    
    // Check if user is active
    if (userData.status !== 'active') {
      console.log('User account is inactive');
      await auth.signOut();
      throw new Error('account-disabled');
    }
    
    // Check if user has inspection access
    if (userData.allowInspection !== true) {
      console.log('User does not have inspection access');
      await auth.signOut();
      throw new Error('no-inspection-access');
    }
    
    console.log('Login successful, all checks passed');
    return userCredential.user;
    
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Handle user logout
 */
async function handleLogout(e) {
  if (e) e.preventDefault();
  
  try {
    await auth.signOut();
    redirectToLogin();
  } catch (error) {
    console.error('Logout error:', error);
    alert('Erreur lors de la déconnexion.');
  }
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
 * @returns {boolean} True if admin
 */
function isAdmin() {
  return currentUserData && currentUserData.role === 'admin';
}

/**
 * Get Firebase config for secondary app instances
 * @returns {Object} Firebase config
 */
function getFirebaseConfig() {
  return firebaseConfig;
}

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking auth status...');
  console.log('Firebase available:', typeof firebase);
  console.log('Auth available:', typeof auth);
  checkAuthStatus();
});

console.log('auth.js loaded successfully');