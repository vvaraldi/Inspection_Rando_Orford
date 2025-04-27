// mobile-menu.js
// Gestion du menu mobile pour toutes les pages de l'application SkiTrack

/**
 * Initialise le menu mobile pour l'application
 * Cette fonction devrait être appelée une fois que le DOM est chargé
 */
function initMobileMenu() {
  // Récupérer les éléments du DOM
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavClose = document.getElementById('mobile-nav-close');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const loginLink = document.getElementById('login-link');
  const mobileAdminLink = document.getElementById('mobile-admin-link');
  const adminLink = document.getElementById('admin-link');
  
  // Vérifier si les éléments nécessaires existent
  if (!mobileNav || !mobileMenuBtn) {
    console.warn("Éléments du menu mobile manquants. Vérifiez la structure HTML.");
    return;
  }
  
  // Ouvrir le menu mobile
  mobileMenuBtn.addEventListener('click', function() {
    mobileNav.classList.add('open');
  });
  
  // Fermer le menu mobile
  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', function() {
      mobileNav.classList.remove('open');
    });
  }
  
  // Synchroniser les liens de login
  if (mobileLoginLink && loginLink) {
    mobileLoginLink.textContent = loginLink.textContent;
    mobileLoginLink.href = loginLink.href;
    mobileLoginLink.onclick = function(e) {
      e.preventDefault();
      if (loginLink.onclick) {
        loginLink.onclick(e);
      }
      mobileNav.classList.remove('open');  // Fermer le menu après clic
    };
  }
  
  // Synchroniser la visibilité du lien d'administration
  if (mobileAdminLink && adminLink) {
    mobileAdminLink.style.display = adminLink.style.display;
  }
  
  // Fermer le menu mobile quand on clique sur un lien
  const mobileLinks = document.querySelectorAll('.mobile-nav-links a');
  if (mobileLinks.length > 0) {
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileNav.classList.remove('open');
      });
    });
  }
  
  // Fermer le menu mobile quand on clique en dehors
  document.addEventListener('click', function(e) {
    if (mobileNav.classList.contains('open') && 
        !mobileNav.contains(e.target) && 
        e.target !== mobileMenuBtn) {
      mobileNav.classList.remove('open');
    }
  });
  
  console.log('Menu mobile initialisé');
}

// Initialiser le menu mobile quand le DOM est chargé
document.addEventListener('DOMContentLoaded', initMobileMenu);