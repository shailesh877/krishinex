// constants/api.ts

// export const BASE_URL = 'https://demo.ranx24.com';
export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'http://127.0.0.1:5500';
export const IMAGE_BASE_URL = process.env.EXPO_PUBLIC_IMAGE_URL || BASE_URL;

export const BASE_API_URL = `${BASE_URL}/api`;
export const AUTH_API_URL = `${BASE_API_URL}/auth`;
export const MACHINES_API_URL = `${BASE_API_URL}/machines`;
export const API_URL = AUTH_API_URL; // Keep for backward compatibility of auth routes
