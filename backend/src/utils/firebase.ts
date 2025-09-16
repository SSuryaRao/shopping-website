import admin from 'firebase-admin';

// Export functions that dynamically check if Firebase is initialized
export const getAuth = () => {
  try {
    return admin.apps.length > 0 ? admin.auth() : null;
  } catch (error) {
    console.error('Error getting Firebase Auth:', error);
    return null;
  }
};

export const getStorage = () => {
  try {
    return admin.apps.length > 0 ? admin.storage() : null;
  } catch (error) {
    console.error('Error getting Firebase Storage:', error);
    return null;
  }
};

export default admin;