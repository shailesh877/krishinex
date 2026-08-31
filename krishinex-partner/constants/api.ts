// constants/api.ts

export const BASE_URL = 'https://demo.ranx24.com';
// export const BASE_URL = 'http://localhost:5500';

export const BASE_API_URL = `${BASE_URL}/api`;
export const AUTH_API_URL = `${BASE_API_URL}/auth`;
export const MACHINES_API_URL = `${BASE_API_URL}/machines`;
export const API_URL = AUTH_API_URL; // Keep for backward compatibility of auth routes
