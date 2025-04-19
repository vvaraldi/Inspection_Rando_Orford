// Configuration Firebase (à remplacer par vos informations)
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_ID",
  appId: "VOTRE_APP_ID"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

// Fonctions d'authentification
function checkAuthStatus() {
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  const loginLink = document.getElementById('login-link');
  const adminLink = document.getElementById('admin-link');
  
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // L'utilisateur est connecté
      console.log("Utilisateur connecté:", user.email);
      
      // Mettre à jour l'interface
      loginLink.textContent = 'Déconnexion';
      loginLink.onclick = function(e) {
        e.preventDefault();
        firebase.auth().signOut().then(() => {
          window.location.reload();
        });
      };
      
      // Vérifier si l'utilisateur est admin
      firebase.firestore().collection('inspectors').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists && doc.data().role === 'admin') {
            // Afficher le lien d'administration
            adminLink.style.display = 'inline';
          }
          
          // Afficher le contenu principal
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
          
          // Charger les données du tableau de bord
          loadDashboardData();
        })
        .catch((error) => {
          console.error("Erreur lors de la vérification des droits:", error);
          
          // Afficher quand même le contenu principal en cas d'erreur
          if (loading) loading.style.display = 'none';
          if (mainContent) mainContent.style.display = 'block';
        });
    } else {
      // L'utilisateur n'est pas connecté, rediriger vers la page de connexion
      console.log("Aucun utilisateur connecté");
      window.location.href = 'pages/login.html';
    }
  });
}

// Appeler cette fonction après l'initialisation
document.addEventListener('DOMContentLoaded', function() {
  checkAdminRights();
});

// Appel de la fonction au chargement
document.addEventListener('DOMContentLoaded', checkAuthStatus);


function createInitialAdmin(email, password, name) {
  // Créer l'utilisateur
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Ajouter les informations dans Firestore avec le rôle admin
      return firebase.firestore().collection('inspectors').doc(userCredential.user.uid).set({
        name: name,
        email: email,
        role: 'admin',
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      console.log("Administrateur initial créé avec succès!");
    })
    .catch((error) => {
      console.error("Erreur lors de la création de l'administrateur:", error);
    });
}

// À NE PAS METTRE DANS LE CODE FINAL
// Décommentez et exécutez une seule fois, puis recommentez
createInitialAdmin('vvaraldi@hotmail.com', 'Test1978', 'Administrateur');
