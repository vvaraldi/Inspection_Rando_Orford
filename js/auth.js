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
  const mobileLoginLink = document.getElementById('mobile-login-link'); // Ajout du lien mobile
  const adminLink = document.getElementById('admin-link');
  const mobileAdminLink = document.getElementById('mobile-admin-link'); // Ajout du lien mobile admin
  
  auth.onAuthStateChanged(function(user) {
    if (user) {
      // Utilisateur connecté
      console.log("Utilisateur connecté:", user.email);
      
//      // Mettre à jour le lien de connexion pour afficher "Déconnexion"
//	  if (loginLink) {
//		loginLink.textContent = 'Déconnexion';
//		loginLink.onclick = function(e) {
//		  e.preventDefault();
//		  auth.signOut().then(() => {
//			window.location.reload();
//		  }).catch(error => {
//			console.error("Erreur lors de la déconnexion:", error);
//		  });
//		};
//	  }
	  
	  if (loginLink) {
		loginLink.style.display = 'none'; // Cacher le lien au lieu de changer son texte
	  }	  
	  

	  // Mettre à jour l'affichage du nom d'utilisateur dans le menu déroulant
	  const userNameDisplay = document.getElementById('user-name-display');
	  const userDropdown = document.getElementById('user-dropdown');
	  
	  if (userNameDisplay && userDropdown) {
		userDropdown.style.display = 'block';
		
		db.collection('inspectors').doc(user.uid).get()
		  .then((doc) => {
			if (doc.exists && doc.data().name) {
			  userNameDisplay.textContent = doc.data().name;
			} else {
			  userNameDisplay.textContent = user.email;
			}
		  })
		  .catch((error) => {
			console.error("Erreur lors de la récupération du nom d'utilisateur:", error);
			userNameDisplay.textContent = user.email;
		  });
		  // Configurer le lien de déconnexion
		  setupUserDropdown();
	  }
      
	  
	  
	  
	  
      // Faire de même pour le lien mobile
//      if (mobileLoginLink) {
//        mobileLoginLink.textContent = 'Déconnexion';
//        mobileLoginLink.onclick = function(e) {
//          e.preventDefault();
//          auth.signOut().then(() => {
//            window.location.reload();
//          }).catch(error => {
//            console.error("Erreur lors de la déconnexion:", error);
//          });
//        };
//      }
		if (mobileLoginLink) {
		  mobileLoginLink.style.display = 'none';
		}      
      
		// Afficher et configurer le lien de déconnexion mobile
		if (mobileLogoutLink) {
		mobileLogoutLink.style.display = 'block';
		mobileLogoutLink.onclick = function(e) {
		  e.preventDefault();
		  auth.signOut().then(() => {
			window.location.reload();
		  }).catch(error => {
			console.error("Erreur lors de la déconnexion:", error);
		  });
		};
		}

      // Mettre à jour l'affichage du menu utilisateur dropdown
      const userDropdown = document.getElementById('user-dropdown');
      if (userDropdown) {
        userDropdown.style.display = 'block';
        setupUserDropdown(); // Configurer les événements du dropdown
      }
      
      // Reste du code pour l'utilisateur connecté...
    } else {
      // Utilisateur non connecté
      console.log("Aucun utilisateur connecté");
      
      // Afficher le lien de connexion standard
      if (loginLink) {
        loginLink.style.display = 'inline-block';
      }
      
      // Afficher le lien de connexion mobile et cacher le lien de déconnexion
      if (mobileLoginLink) {
        mobileLoginLink.style.display = 'block';
      }
      
      if (mobileLogoutLink) {
        mobileLogoutLink.style.display = 'none';
      }
      
      // Cacher le menu dropdown
      const userDropdown = document.getElementById('user-dropdown');
      if (userDropdown) {
        userDropdown.style.display = 'none';
      }









      // Vérifier si l'utilisateur est admin
      db.collection('inspectors').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists) {
            // Mettre à jour le nom affiché si disponible
            const userName = document.getElementById('user-name');
            if (userName && doc.data().name) {
              userName.textContent = doc.data().name;
            }
            
            // Vérifier si l'utilisateur est admin
            if (doc.data().role === 'admin') {
              console.log("L'utilisateur est administrateur");
              // Afficher le lien d'administration desktop
              if (adminLink) {
                adminLink.style.display = 'inline';
              }
              // Afficher le lien d'administration mobile
              if (mobileAdminLink) {
                mobileAdminLink.style.display = 'inline';
              }
            }
          } else {
            console.warn("Document de l'utilisateur non trouvé dans Firestore");
          }
          
          // IMPORTANT: Toujours exécuter cette partie, même en cas d'erreur de récupération des droits
          // Afficher le contenu principal et masquer l'indicateur de chargement
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
          
          // Charger les données du tableau de bord
          if (typeof loadMapData === 'function') {
            loadMapData();
          }
          
          // Si une fonction de chargement du tableau de bord existe, l'appeler
          if (typeof loadDashboardData === 'function') {
            loadDashboardData();
          }
          
          // Si une fonction de chargement de l'historique existe, l'appeler
          if (typeof loadInspectionHistory === 'function') {
            loadInspectionHistory();
          }
        })
        .catch((error) => {
          console.error("Erreur lors de la vérification des droits d'admin:", error);
          
          // IMPORTANT: Toujours exécuter cette partie, même en cas d'erreur
          // Afficher le contenu principal en cas d'erreur
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
          
          // Charger les données quand même
          if (typeof loadMapData === 'function') {
            loadMapData();
          }
          
          // Si une fonction de chargement du tableau de bord existe, l'appeler
          if (typeof loadDashboardData === 'function') {
            loadDashboardData();
          }
          
          // Si une fonction de chargement de l'historique existe, l'appeler
          if (typeof loadInspectionHistory === 'function') {
            loadInspectionHistory();
          }
        });
    } else {
      // Utilisateur non connecté
      console.log("Aucun utilisateur connecté");
      
      // Rediriger vers la page de connexion
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage !== 'login.html') {
        window.location.href = window.location.pathname.includes('/pages/') 
          ? 'login.html' 
          : 'pages/login.html';
      } else {
        // Si on est déjà sur la page de login, on peut masquer le chargement
        if (loading) loading.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
      }
    }
  }, function(error) {
    // Gestion des erreurs de Firebase Auth
    console.error("Erreur d'authentification:", error);
    
    // En cas d'erreur, afficher le contenu quand même
    if (loading) loading.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
  });
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

// Setup le menu de dropdown
function setupUserDropdown() {
  const logoutLink = document.getElementById('logout-link');
  
  if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Déconnecter l'utilisateur
      firebase.auth().signOut()
        .then(() => {
          console.log("Déconnexion réussie");
          // Rediriger vers la page de connexion
          window.location.href = window.location.pathname.includes('/pages/') 
            ? 'login.html' 
            : 'pages/login.html';
        })
        .catch(error => {
          console.error("Erreur lors de la déconnexion:", error);
        });
    });
  }
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

// Décommentez la ligne suivante uniquement pour créer un admin initial, puis recommentez-la
// createInitialAdmin('admin@example.com', 'MotDePasse123', 'Administrateur');