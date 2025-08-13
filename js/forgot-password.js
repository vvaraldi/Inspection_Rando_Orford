/**
 * Forgot Password Functionality
 * Handles password reset email sending and UI feedback
 */

class ForgotPasswordManager {
  constructor() {
    this.form = null;
    this.emailInput = null;
    this.submitBtn = null;
    this.successMessage = null;
    this.errorMessage = null;
    
    this.initializeElements();
    this.bindEvents();
    this.checkAuthState();
  }

  initializeElements() {
    this.form = document.getElementById('forgot-password-form');
    this.emailInput = document.getElementById('email');
    this.submitBtn = document.getElementById('submit-btn');
    this.successMessage = document.getElementById('success-message');
    this.errorMessage = document.getElementById('error-message');

    if (!this.form || !this.emailInput || !this.submitBtn) {
      console.error('Required form elements not found');
      return false;
    }

    return true;
  }

  bindEvents() {
    if (!this.form) return;

    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Click to dismiss messages
    if (this.successMessage) {
      this.successMessage.addEventListener('click', () => this.hideMessage(this.successMessage));
    }

    if (this.errorMessage) {
      this.errorMessage.addEventListener('click', () => this.hideMessage(this.errorMessage));
    }

    // Email input validation
    if (this.emailInput) {
      this.emailInput.addEventListener('input', () => this.clearMessages());
    }
  }

  checkAuthState() {
    // Check if user is already logged in
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          // Redirect to dashboard if already logged in
          window.location.href = '../index.html';
        }
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const email = this.emailInput.value.trim();

    if (!this.validateEmail(email)) {
      this.showError('Veuillez entrer une adresse email valide.');
      return;
    }

    await this.sendPasswordResetEmail(email);
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendPasswordResetEmail(email) {
    this.setLoading(true);
    this.clearMessages();

    try {
      // Check if Firebase Auth is available
      if (typeof firebase === 'undefined' || !firebase.auth) {
        throw new Error('Firebase Auth not available');
      }

      await firebase.auth().sendPasswordResetEmail(email, {
        url: window.location.origin + '/pages/login.html',
        handleCodeInApp: false
      });

      this.showSuccess(
        `Un email de réinitialisation a été envoyé à ${email}. ` +
        'Vérifiez votre boîte de réception ET VOS SPAMS.'
      );

      // Reset form
      this.form.reset();

      // Redirect to login page after 5 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 5000);

    } catch (error) {
      console.error('Error sending password reset email:', error);
      this.handleError(error);
    } finally {
      this.setLoading(false);
    }
  }

  handleError(error) {
    let errorMessage = '';

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'Aucun compte n\'est associé à cette adresse email.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'L\'adresse email n\'est pas valide.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
        break;
      default:
        errorMessage = 'Une erreur s\'est produite: ' + (error.message || 'Erreur inconnue');
    }

    this.showError(errorMessage);
  }

  setLoading(isLoading) {
    if (!this.submitBtn) return;

    if (isLoading) {
      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('loading');
      this.submitBtn.textContent = 'Envoi en cours...';
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.classList.remove('loading');
      this.submitBtn.textContent = 'Envoyer le lien de réinitialisation';
    }
  }

  showSuccess(message) {
    if (!this.successMessage) return;

    this.successMessage.textContent = message;
    this.successMessage.style.display = 'block';
    this.successMessage.classList.add('alert-clickable');

    // Hide error message if visible
    this.hideMessage(this.errorMessage);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideMessage(this.successMessage);
    }, 10000);
  }

  showError(message) {
    if (!this.errorMessage) return;

    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
    this.errorMessage.classList.add('alert-clickable');

    // Hide success message if visible
    this.hideMessage(this.successMessage);

    // Auto-hide after 8 seconds
    setTimeout(() => {
      this.hideMessage(this.errorMessage);
    }, 8000);
  }

  hideMessage(messageElement) {
    if (messageElement) {
      messageElement.style.display = 'none';
      messageElement.classList.remove('alert-clickable');
    }
  }

  clearMessages() {
    this.hideMessage(this.successMessage);
    this.hideMessage(this.errorMessage);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the forgot password page
  if (!document.getElementById('forgot-password-form')) {
    return;
  }

  // Wait for Firebase to be ready
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return;
  }

  // Initialize the forgot password manager
  new ForgotPasswordManager();
});