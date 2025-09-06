// js/common.js
class ThemeManager {
  constructor() {
    this.initializeTheme();
    this.createThemeSwitcher();
  }

  initializeTheme() {
    // Load saved theme preference or default to 'alpine'
    const savedTheme = localStorage.getItem('preferred-theme') || 'alpine';
    document.body.setAttribute('data-theme', savedTheme);
  }

// alpine
// dark
// summer
// autumn


  switchTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('preferred-theme', themeName);
  }

  createThemeSwitcher() {
    // You can add a theme switcher UI here if needed
    // For example, add it to the header navigation
  }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});


document.addEventListener('DOMContentLoaded', function() {
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      if (confirm('Êtes-vous sûr de vouloir annuler? Toutes les données saisies seront perdues.')) {
        window.location.href = '../index.html';
      }
    });
  }
});