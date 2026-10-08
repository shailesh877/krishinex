// constants/api.ts

// Production Base URL
export const BASE_URL = 'https://demo.ranx24.com';

export const FILES_BASE_URL = process.env.EXPO_PUBLIC_FILES_URL || BASE_URL;

export const BASE_API_URL = `${BASE_URL}/api`;
export const AUTH_API_URL = `${BASE_API_URL}/auth`;
export const MACHINES_API_URL = `${BASE_API_URL}/machines`;
export const API_URL = AUTH_API_URL; // Keep for backward compatibility of auth routes

// MSG91 Widget credentials with safe production fallbacks
export const MSG91_WIDGET_ID = process.env.EXPO_PUBLIC_MSG91_WIDGET_ID || '366361727571383132303632';
export const MSG91_AUTH_KEY = process.env.EXPO_PUBLIC_MSG91_AUTH_KEY || '497379TbOp9la7qwjr69a483dbP1';

