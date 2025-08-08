// Configuration Firebase (à remplacer par vos informations)
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
      // Utilisateur connecté
      console.log("Utilisateur connecté:", user.email);
      
      try {
        // Récupérer une seule fois les informations de l'utilisateur
        const inspectorDoc = await db.collection('inspectors').doc(user.uid).get();
        
        if (inspectorDoc.exists) {
          const userData = inspectorDoc.data();
          
          // Vérifier si l'utilisateur est actif
          if (userData.status !== 'active') {
            alert('Votre compte a été désactivé. Contactez l\'administrateur.');
            await auth.signOut();
            // Recharger la page pour déclencher la redirection vers login
            window.location.reload();
            return; // Important: sortir complètement de la fonction
          }
          
          // Mettre à jour le nom affiché
          const userName = document.getElementById('user-name');
          if (userName && userData.name) {
            userName.textContent = userData.name;
          }
          
          // Vérifier si l'utilisateur est admin
          if (userData.role === 'admin') {
            console.log("L'utilisateur est administrateur");
            if (adminLink) adminLink.style.display = 'inline';
            if (mobileAdminLink) mobileAdminLink.style.display = 'inline';
          }
        } else {
          console.warn("Document de l'utilisateur non trouvé dans Firestore");
          // Optionnel : créer un document minimal pour l'utilisateur
          // await createBasicUserDocument(user);
        }
        
        // Mettre à jour les liens de connexion/déconnexion
        setupLogoutLinks(loginLink, mobileLoginLink);
        
        // Afficher le contenu et charger les données
        showContentAndLoadData(loading, mainContent);
        
      } catch (error) {
        console.error("Erreur lors de la vérification de l'utilisateur:", error);
        
        // En cas d'erreur, afficher quand même le contenu mais sans les privilèges admin
        setupLogoutLinks(loginLink, mobileLoginLink);
        showContentAndLoadData(loading, mainContent);
      }
      
    } else {
      // Utilisateur non connecté
      console.log("Aucun utilisateur connecté");
      redirectToLogin(loading, mainContent);
    }
  }, function(error) {
    // Gestion des erreurs de Firebase Auth
    console.error("Erreur d'authentification:", error);
    
    // En cas d'erreur critique, afficher le contenu quand même
    if (loading) loading.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  });
}

/**
 * Configure les liens de déconnexion
 */
function setupLogoutLinks(loginLink, mobileLoginLink) {
  const logoutHandler = function(e) {
    e.preventDefault();
    auth.signOut().then(() => {
      window.location.reload();
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
  // Afficher le contenu principal et masquer l'indicateur de chargement
  if (loading) loading.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  // Charger les données selon la page
  if (typeof loadMapData === 'function') {
    loadMapData();
  }
  
  if (typeof loadDashboardData === 'function') {
    loadDashboardData();
  }
  
  if (typeof loadInspectionHistory === 'function') {
    loadInspectionHistory();
  }
}

/**
 * Redirige vers la page de connexion
 */
function redirectToLogin(loading, mainContent) {
  const currentPage = window.location.pathname.split('/').pop();
  
  if (currentPage !== 'login.html') {
    // Rediriger vers la page de connexion
    window.location.href = window.location.pathname.includes('/pages/') 
      ? 'login.html' 
      : 'pages/login.html';
  } else {
    // Si on est déjà sur la page de login, masquer le chargement
    if (loading) loading.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  }
}

/**
 * Gère la connexion d'un utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe de l'utilisateur
 * @returns {Promise} - Promesse résolue lors de la connexion réussie
 */
function loginUser(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("Connexion réussie pour:", email);
      return userCredential.user;
    });
}

/**
 * Déconnecte l'utilisateur actuel
 * @returns {Promise} - Promesse résolue lors de la déconnexion
 */
function logoutUser() {
  return auth.signOut()
    .then(() => {
      console.log("Déconnexion réussie");
    });
}

/**
 * Crée un nouvel utilisateur inspecteur
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise} - Promesse résolue lors de la création
 */
function createInspector(userData) {
  return auth.createUserWithEmailAndPassword(userData.email, userData.password)
    .then((userCredential) => {
      // Ajouter les informations supplémentaires dans Firestore
      return db.collection('inspectors').doc(userCredential.user.uid).set({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || null,
        role: userData.role || 'inspector',
        status: userData.status || 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        console.log("Inspecteur créé avec succès:", userData.email);
        return userCredential.user;
      });
    });
}

/**
 * Crée un administrateur initial (à n'utiliser qu'une seule fois)
 * @param {string} email - Email de l'administrateur
 * @param {string} password - Mot de passe de l'administrateur
 * @param {string} name - Nom de l'administrateur
 */
function createInitialAdmin(email, password, name) {
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Ajouter les informations dans Firestore avec le rôle admin
      return db.collection('inspectors').doc(userCredential.user.uid).set({
        name: name,
        email: email,
        role: 'admin',
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      console.log("Administrateur initial créé avec succès!");
      alert("Administrateur créé avec succès!");
    })
    .catch((error) => {
      console.error("Erreur lors de la création de l'administrateur:", error);
      alert("Erreur lors de la création de l'administrateur: " + error.message);
    });
}

// Écouter le chargement du document pour vérifier l'authentification
document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
  
  // Gestion du formulaire de connexion sur la page login.html
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorMessage = document.getElementById('error-message');
      
      // Masquer les messages d'erreur précédents
      if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
      }
      
      // Tenter la connexion
      loginUser(email, password)
        .then(() => {
          // Rediriger vers la page principale en cas de succès
          window.location.href = '../index.html';
        })
        .catch((error) => {
          console.error("Erreur de connexion:", error);
          
          // Afficher l'erreur
          if (errorMessage) {
            errorMessage.style.display = 'block';
            
            switch(error.code) {
              case 'auth/user-not-found':
                errorMessage.textContent = 'Aucun utilisateur ne correspond à cette adresse email.';
                break;
              case 'auth/wrong-password':
                errorMessage.textContent = 'Mot de passe incorrect.';
                break;
              case 'auth/invalid-email':
                errorMessage.textContent = 'Adresse email invalide.';
                break;
              case 'auth/too-many-requests':
                errorMessage.textContent = 'Trop de tentatives infructueuses. Veuillez réessayer plus tard.';
                break;
              default:
                errorMessage.textContent = 'Erreur de connexion: ' + error.message;
            }
          }
        });
    });
  }
  
  // Gestion du bouton de déconnexion global
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      logoutUser()
        .then(() => {
          window.location.href = window.location.pathname.includes('/pages/') 
            ? 'login.html' 
            : 'pages/login.html';
        })
        .catch(error => {
          console.error("Erreur lors de la déconnexion:", error);
        });
    });
  }
});

function checkUserActiveStatus(user) {
  return db.collection('inspectors').doc(user.uid).get()
    .then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        
        // Vérifier si l'utilisateur est actif
        if (userData.status !== 'active') {
          // Déconnecter l'utilisateur
          auth.signOut();
          
          // Afficher un message d'erreur
          alert('Votre compte a été désactivé. Contactez l'administrateur.');
          
          // Rediriger vers la page de connexion
          window.location.href = window.location.pathname.includes('/pages/') 
            ? 'login.html' 
            : 'pages/login.html';
          
          return false; // Utilisateur inactif
        }
        
        return true; // Utilisateur actif
      }
      
      return false; // Document utilisateur non trouvé
    });
}

// Décommentez la ligne suivante uniquement pour créer un admin initial, puis recommentez-la
// createInitialAdmin('admin@example.com', 'MotDePasse123', 'Administrateur');