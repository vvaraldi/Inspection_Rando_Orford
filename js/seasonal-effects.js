// js/visual-effects.js

// Exécuter après le chargement du contenu principal
document.addEventListener('DOMContentLoaded', function() {
  // Vérifier si les animations doivent être réduites
  if (shouldReduceMotion()) {
    document.body.classList.add('reduce-motion');
  } else {
    // Vérifier la saison actuelle et charger les effets appropriés
    checkSeasonAndLoadEffects();
  }
});

// Chargement différé des effets visuels après que la page soit complètement chargée
window.addEventListener('load', function() {
  // Attendre 1 seconde après le chargement complet pour ajouter des effets visuels non-essentiels
  setTimeout(function() {
    if (!shouldReduceMotion()) {
      loadNonEssentialEffects();
    }
  }, 1000);
});

// Détermine si on doit réduire les animations
function shouldReduceMotion() {
  // Vérifier la préférence de l'utilisateur pour les animations réduites
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Vérifier si c'est un appareil mobile avec une connexion potentiellement lente
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.deviceMemory && navigator.deviceMemory < 4;
  
  return prefersReducedMotion || (isMobile && isLowEnd);
}

// Vérifier la saison et charger les effets appropriés
function checkSeasonAndLoadEffects() {
  const currentDate = new Date();
  const month = currentDate.getMonth(); // 0 = Janvier, 11 = Décembre
  
  // Hiver dans l'hémisphère nord (novembre à mars)
  if (month >= 10 || month <= 4) {
    enableWinterEffects();
  } 
  // Automne (septembre-octobre)
  else if (month >= 8 && month <= 9) {
    enableAutumnEffects();
  }
  // On pourrait ajouter d'autres saisons si nécessaire
}

// Activer les effets d'hiver
function enableWinterEffects() {
  document.body.classList.add('winter-mode');
  
  // Ajouter des flocons de neige en animation légère (essentiel)
  createSnowflakes(10); // Nombre réduit pour les performances
}

// Effets d'automne (plus subtils)
function enableAutumnEffects() {
  document.body.classList.add('autumn-mode');
  // Autres effets d'automne si nécessaire
}

// Effets non essentiels à charger en différé
function loadNonEssentialEffects() {
  if (document.body.classList.contains('winter-mode')) {
    // Ajouter plus de flocons en différé
    createSnowflakes(20, true);
  }
  
  // Activer les animations d'entrée pour certains éléments
  enableEntranceAnimations();
}

// Création des flocons de neige
function createSnowflakes(count, isDelayed = false) {
  // Vérifier si le conteneur existe déjà
  let container = document.getElementById('snowflakes-container');
  
  // Créer le conteneur s'il n'existe pas
  if (!container) {
    container = document.createElement('div');
    container.id = 'snowflakes-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
  }
  
  // Créer les flocons
  for (let i = 0; i < count; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.textContent = '❄';
    
    // Position et styles aléatoires
    const startPositionX = Math.random() * window.innerWidth;
    const opacity = Math.random() * 0.6 + 0.2;
    const size = Math.random() * 15 + 10;
    const animationDuration = 5 + Math.random() * 15;
    const animationDelay = isDelayed ? (Math.random() * 5) : 0;
    
    // Appliquer les styles
    snowflake.style.position = 'absolute';
    snowflake.style.color = 'white';
    snowflake.style.fontSize = size + 'px';
    snowflake.style.left = startPositionX + 'px';
    snowflake.style.top = '-20px';
    snowflake.style.opacity = opacity;
    snowflake.style.animation = `snowfall ${animationDuration}s linear ${animationDelay}s infinite`;
    
    container.appendChild(snowflake);
  }
  
  // Ajouter l'animation si elle n'existe pas déjà
  if (!document.getElementById('snowfall-animation')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'snowfall-animation';
    styleSheet.textContent = `
      @keyframes snowfall {
        0% {
          transform: translateY(-20px) rotate(0deg);
        }
        100% {
          transform: translateY(calc(100vh + 20px)) rotate(360deg);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

// Activer des animations d'entrée pour certains conteneurs principaux
function enableEntranceAnimations() {
  const elements = document.querySelectorAll('.card, .info-panel, .map-view');
  
  elements.forEach((element, index) => {
    // Animation différée séquentielle
    setTimeout(() => {
      element.classList.add('animate-entrance');
    }, index * 100);
  });
}