// Configuration de l'API selon l'environnement
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // URL relative pour Netlify Functions
  : 'http://localhost:5000';

// Debug pour voir quelle URL est utilisée
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🔧 API_BASE_URL:', API_BASE_URL);

// 2. Configuration des constantes
export const APP_CONFIG = {
  // API
  API_TIMEOUT: 10000, // 10 secondes
  RETRY_ATTEMPTS: 3,
  
  // UI
  TOAST_DURATION: 4000,
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  
  // Map
  MAX_ZOOM: 3,
  MIN_ZOOM: 0.5,
  DEFAULT_ZOOM: 1,
  
  // Validation
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['.csv', '.xlsx', '.xls'],
  
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100
};

// 3. Messages d'erreur utilisateur-friendly
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Connexion impossible. Vérifiez votre connexion internet.',
  AUTH_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter.',
  AUTH_FAILED: 'Identifiants incorrects. Veuillez réessayer.',
  ACCESS_DENIED: 'Vous n\'avez pas les droits pour cette action.',
  DATA_NOT_FOUND: 'Données introuvables.',
  VALIDATION_ERROR: 'Données invalides. Vérifiez votre saisie.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
  FILE_TOO_LARGE: 'Fichier trop volumineux (max 10MB).',
  INVALID_FORMAT: 'Format de fichier non supporté.',
  SAVE_ERROR: 'Erreur lors de la sauvegarde.',
  DELETE_ERROR: 'Erreur lors de la suppression.'
};

// 4. Utilitaires de validation
export const VALIDATORS = {
  // Coordonnées
  isValidCoordinate: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  },
  
  // PK (Point Kilométrique)
  isValidPK: (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 9999;
  },
  
  // Email
  isValidEmail: (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  // Nom de fichier
  isValidFileName: (filename) => {
    return /^[a-zA-Z0-9._-]+$/.test(filename);
  },
  
  // Ligne ferroviaire
  isValidLine: (line) => {
    return /^\d{6}$/.test(line); // Format 6 chiffres
  },
  
  // Voie
  isValidTrack: (track) => {
    return /^[12V]$/.test(track); // 1, 2, ou V
  }
};

// 5. Helper pour gestion d'erreurs API
export const handleApiError = (error, showToast) => {
  console.error('API Error:', error);
  
  if (!navigator.onLine) {
    showToast(ERROR_MESSAGES.NETWORK_ERROR, 'error');
    return;
  }
  
  if (error.status === 401) {
    showToast(ERROR_MESSAGES.AUTH_EXPIRED, 'warning');
    localStorage.removeItem('token');
    window.location.reload();
    return;
  }
  
  if (error.status === 403) {
    showToast(ERROR_MESSAGES.ACCESS_DENIED, 'error');
    return;
  }
  
  if (error.status === 404) {
    showToast(ERROR_MESSAGES.DATA_NOT_FOUND, 'warning');
    return;
  }
  
  if (error.status >= 500) {
    showToast(ERROR_MESSAGES.SERVER_ERROR, 'error');
    return;
  }
  
  showToast(error.message || ERROR_MESSAGES.VALIDATION_ERROR, 'error');
};

// 6. Debounce pour optimiser les performances
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// 7. Format des données pour l'affichage
export const formatters = {
  // Coordonnées avec 2 décimales
  coordinate: (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  },
  
  // PK avec 3 décimales
  pk: (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? '0.000' : num.toFixed(3);
  },
  
  // Date française
  date: (date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  },
  
  // Heure française
  time: (date) => {
    return new Date(date).toLocaleTimeString('fr-FR');
  }
};

// 8. Constants pour les couches
export const LAYER_TYPES = {
  IMAGE: 'image',
  POINTS: 'points',
  ZONES: 'zones'
};

export const POINT_TYPES = {
  BTS_GSMR: 'BTS GSM-R',
  POSTES_EXISTANTS: 'Postes existants',
  CENTRE_N2_HPMV: 'Centre N2 HPMV'
};

export const POINT_STATES = {
  ETUDE: 'Etude',
  REALISATION: 'Réalisation',
  EN_SERVICE: 'Mis en service'
};

// 9. Couleurs cohérentes
export const COLORS = {
  PRIMARY: '#1A237E',
  SECONDARY: '#3F51B5',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  INFO: '#2196F3',
  
  // États des points
  ETUDE: '#FF9800',
  REALISATION: '#FF5722',
  EN_SERVICE: '#2196F3',
  
  // Types de points
  BTS_GSMR: '#1976D2',
  POSTES: '#8BC34A',
  CENTRE_N2: '#9C27B0'
};

// 10. Configuration de performance
export const PERFORMANCE_CONFIG = {
  // Mise en cache
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100, // 100 entrées max
  
  // Pagination
  VIRTUAL_SCROLLING_THRESHOLD: 100,
  LAZY_LOADING_OFFSET: 200,
  
  // Images
  IMAGE_QUALITY: 0.8,
  MAX_IMAGE_WIDTH: 2000,
  MAX_IMAGE_HEIGHT: 2000
};
