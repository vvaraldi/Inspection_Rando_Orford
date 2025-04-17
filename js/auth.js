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
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // L'utilisateur est connecté
      console.log("Utilisateur connecté:", user.email);
      // Mise à jour de l'interface pour un utilisateur connecté
      document.getElementById('login-link').textContent = 'Déconnexion';
    } else {
      // L'utilisateur n'est pas connecté
      console.log("Aucun utilisateur connecté");
      // Redirection vers la page de connexion si nécessaire
      // Si vous n'êtes pas sur la page de connexion
      if (!window.location.href.includes('login.html')) {
        // Vous pouvez décommenter cette ligne pour rediriger automatiquement
        // window.location.href = 'pages/login.html';
      }
    }
  });
}

// Appel de la fonction au chargement
document.addEventListener('DOMContentLoaded', checkAuthStatus);