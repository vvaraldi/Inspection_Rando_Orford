/**
 * Login Functionality
 * Handles user authentication and login form management
 */

class LoginManager {
  constructor() {
    this.form = null;
    this.emailInput = null;
    this.passwordInput = null;
    this.loginBtn = null;
    this.errorMessage = null;
    
    this.initializeElements();
    this.bindEvents();
    this.checkAuthState();
  }

  initializeElements() {
    this.form = document.getElementById('login-form');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.loginBtn = document.getElementById('login-btn');
    this.errorMessage = document.getElementById('error-message');

    if (!this.form || !this.emailInput || !this.passwordInput || !this.loginBtn) {
      console.error('Required login form elements not found');
      return false;
    }

    return true;
  }

  bindEvents() {
    if (!this.form) return;

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Click to dismiss error message
    if (this.errorMessage) {
      this.errorMessage.addEventListener('click', () => this.hideError());
    }

    // Clear error on input
    if (this.emailInput) {
      this.emailInput.addEventListener('input', () => this.clearError());
    }

    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', () => this.clearError());
    }

    // Enter key handling
    this.emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.passwordInput.focus();
      }
    });

    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.form.dispatchEvent(new Event('submit'));
      }
    });
  }

  checkAuthState() {
    // Check if user is already logged in
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          // Redirect to dashboard if already logged in
          console.log('User already logged in, redirecting to dashboard');
          window.location.href = '../index.html';
        }
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!this.validateInputs(email, password)) {
      return;
    }

    await this.attemptLogin(email, password);
  }

  validateInputs(email, password) {
    if (!email) {
      this.showError('Veuillez entrer votre adresse email.');
      this.emailInput.focus();
      return false;
    }

    if (!this.validateEmail(email)) {
      this.showError('Veuillez entrer une adresse email valide.');
      this.emailInput.focus();
      return false;
    }

    if (!password) {
      this.showError('Veuillez entrer votre mot de passe.');
      this.passwordInput.focus();
      return false;
    }

    return true;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async attemptLogin(email, password) {
    this.setLoading(true);
    this.clearError();

    try {
      // Check if Firebase Auth is available
      if (typeof firebase === 'undefined' || !firebase.auth) {
        throw new Error('Firebase Auth not available');
      }

      // Attempt to sign in
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      console.log('Login successful for:', email);

      // Check user status in Firestore if available
      if (typeof db !== 'undefined') {
        await this.checkUserStatus(userCredential.user.uid);
      }

      // Redirect to dashboard on successful login
      window.location.href = '../index.html';

    } catch (error) {
      console.error('Login error:', error);
      this.handleLoginError(error);
    } finally {
      this.setLoading(false);
    }
  }

  async checkUserStatus(userId) {
    try {
      const userDoc = await db.collection('inspectors').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.status !== 'active') {
          // Sign out immediately if account is inactive
          await firebase.auth().signOut();
          throw new Error('account-disabled');
        }
      }
    } catch (error) {
      if (error.message === 'account-disabled') {
        throw error;
      }
      // Log but don't throw other errors - allow login to proceed
      console.warn('Could not check user status:', error);
    }
  }

  handleLoginError(error) {
    let errorMessage = '';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Aucun utilisateur ne correspond à cette adresse email.';
        this.emailInput.focus();
        break;
      case 'auth/wrong-password':
        errorMessage = 'Mot de passe incorrect.';
        this.passwordInput.focus();
        break;
      case 'auth/invalid-email':
        errorMessage = 'L\'adresse email n\'est pas valide.';
        this.emailInput.focus();
        break;
      case 'auth/user-disabled':
      case 'account-disabled':
        errorMessage = 'Votre compte a été désactivé. Contactez l\'administrateur.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Trop de tentatives de connexion. Veuillez réessayer plus tard.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Identifiants invalides. Vérifiez votre email et mot de passe.';
        break;
      default:
        errorMessage = 'Erreur de connexion: ' + (error.message || 'Erreur inconnue');
    }

    this.showError(errorMessage);
  }

  setLoading(isLoading) {
    if (!this.loginBtn) return;

    if (isLoading) {
      this.loginBtn.disabled = true;
      this.loginBtn.classList.add('loading');
      this.loginBtn.textContent = 'Connexion...';
      
      // Disable form inputs
      this.emailInput.disabled = true;
      this.passwordInput.disabled = true;
    } else {
      this.loginBtn.disabled = false;
      this.loginBtn.classList.remove('loading');
      this.loginBtn.textContent = 'Se connecter';
      
      // Re-enable form inputs
      this.emailInput.disabled = false;
      this.passwordInput.disabled = false;
    }
  }

  showError(message) {
    if (!this.errorMessage) {
      // Fallback to alert if error element not found
      alert(message);
      return;
    }

    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
    this.errorMessage.classList.add('alert-clickable');

    // Auto-hide after 8 seconds
    setTimeout(() => {
      this.hideError();
    }, 8000);

    // Scroll error into view if needed
    this.errorMessage.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest' 
    });
  }

  hideError() {
    if (this.errorMessage) {
      this.errorMessage.style.display = 'none';
      this.errorMessage.classList.remove('alert-clickable');
    }
  }

  clearError() {
    this.hideError();
  }

  // Utility method to focus on first input
  focusFirstInput() {
    if (this.emailInput) {
      this.emailInput.focus();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the login page
  if (!document.getElementById('login-form')) {
    return;
  }

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return;
  }

  // Initialize the login manager
  const loginManager = new LoginManager();
  
  // Focus on email input after a short delay
  setTimeout(() => {
    loginManager.focusFirstInput();
  }, 100);
});