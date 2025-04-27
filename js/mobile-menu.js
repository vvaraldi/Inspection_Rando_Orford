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
  
  // Vérifier si les éléments essentiels du menu mobile existent
  if (!mobileNav) {
    console.debug("Menu mobile non trouvé dans cette page.");
    return; // Sortir silencieusement si le menu n'est pas présent
  }
  
  // Ouvrir le menu mobile (si le bouton existe)
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      mobileNav.classList.add('open');
    });
  } else {
    console.debug("Bouton du menu mobile non trouvé.");
  }
  
  // Fermer le menu mobile (si le bouton existe)
  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', function() {
      mobileNav.classList.remove('open');
    });
  }
  
  // Synchroniser les liens de login (si les deux existent)
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
  
  // Synchroniser la visibilité du lien d'administration (si les deux existent)
  if (mobileAdminLink && adminLink) {
    mobileAdminLink.style.display = adminLink.style.display;
  }
  
  // Fermer le menu mobile quand on clique sur un lien
  const mobileLinks = document.querySelectorAll('.mobile-nav-links a');
  if (mobileLinks && mobileLinks.length > 0) {
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
        (!mobileMenuBtn || e.target !== mobileMenuBtn)) {
      mobileNav.classList.remove('open');
    }
  });
  
  console.debug('Menu mobile initialisé');
}

// Initialiser le menu mobile quand le DOM est chargé
document.addEventListener('DOMContentLoaded', initMobileMenu);