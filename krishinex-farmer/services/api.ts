import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback to production if env variables are not set
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://demo.ranx24.com/api';
export const IMAGE_BASE_URL = process.env.EXPO_PUBLIC_IMAGE_URL || 'https://demo.ranx24.com';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export let onUnauthorized: (() => void) | null = null;
export const setOnUnauthorized = (cb: () => void) => {
    onUnauthorized = cb;
};

// Interceptor to add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor to handle 401 and 404 (user deleted)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 401 || 
            (error.response?.status === 404 && error.response?.data?.error === 'User not found')
        ) {
            if (onUnauthorized) onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
    verifyOtp: (phone: string, otp: string, role: string = 'farmer', widget_verified: boolean = false) =>
        api.post('/auth/verify-otp', { phone, otp, role, widget_verified }),
    register: async (data: any) => {
        const isFormData = data instanceof FormData;
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            body: isFormData ? data : JSON.stringify(data),
            headers: isFormData ? {
                'Accept': 'application/json',
            } : {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            if (response.status === 401 && onUnauthorized) onUnauthorized();
            const errorData = await response.json();
            throw Object.assign(new Error(errorData.error || 'Registration failed'), { response: { data: errorData } });
        }
        return { status: response.status, data: await response.json() };
    },
    getItems: (category?: string, lat?: number, lng?: number, page: number = 1, limit: number = 20, signal?: AbortSignal) => api.get('/shop/items', { params: { category, lat, lng, page, limit }, signal }),
    getProfile: (signal?: AbortSignal) => api.get('/user/profile', { signal }),

    // Agri Doctor Chat APIs
    initDoctorChat: () => api.post('/user/doctor-chats/init'),
    getDoctorMessages: (chatId: string) => api.get(`/user/doctor-chats/${chatId}/messages`),
    sendDoctorMessage: (chatId: string, data: { text?: string; mediaUrl?: string; mediaType?: string; audioDuration?: number }) =>
        api.post(`/user/doctor-chats/${chatId}/messages`, data),
    uploadChatMedia: async (formData: FormData) => {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${BASE_URL}/user/upload-chat-media`, {
            method: 'POST',
            body: formData,
            headers: {
                // Do not explicitly set Content-Type here; fetch will auto-generate the boundary for FormData.
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) {
            if (response.status === 401 && onUnauthorized) onUnauthorized();
            throw new Error('Media upload failed');
        }
        return await response.json(); // { url: '...' }
    },

    // Soil Testing APIs
    getSoilLabs: (config?: any) => api.get('/user/soil-labs', config),
    getStates: (config?: any) => api.get('/locations/states', config),
    getDistricts: (state: string, config?: any) => api.get(`/locations/districts/${state}`, config),
    createSoilRequest: (data: { 
        labId?: string; 
        state: string; 
        district: string; 
        village: string; 
        cropName: string; 
        sampleType: string; 
        visitType: string; 
        testType?: string;
        paymentMethod?: 'cash' | 'wallet'
    }) => api.post('/user/soil-requests', data),
    getMySoilRequests: () => api.get('/user/soil-requests'),

    // Mandi Bhav APIs
    getMandis: (config?: any) => api.get('/mandi', config),
    getMandiPrices: (mandiId: string, cropName: string, config?: any) =>
        api.get(`/mandi/prices?mandiId=${mandiId}&cropName=${cropName}`, config),
    getCrops: async (config?: any) => {
        const res = await api.get('/mandi/crops', config);
        if (res.data && Array.isArray(res.data)) {
            res.data = res.data.map((c: any) => {
                if (c.name && c.name.toLowerCase() === 'makka') {
                    return { ...c, name: 'Maize' };
                }
                return c;
            });
        }
        return res;
    },

    // Sell Request APIs
    submitSellRequest: (data: any) => api.post('/sell/submit', data),
    getMySellRequests: () => api.get('/sell/my-requests'),
    uploadSellImages: async (formData: FormData) => {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${BASE_URL}/sell/upload-images`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) {
            if (response.status === 401 && onUnauthorized) onUnauthorized();
            throw new Error('Images upload failed');
        }
        return await response.json(); // { imageUrls: ['...'] }
    },

    // Order APIs
    getAssignedOrders: () => api.get('/orders/assigned'),
    updateOrderStatus: (id: string, status: string, reason?: string) =>
        api.patch(`/orders/${id}/assigned-status`, { assignedStatus: status, cancelReason: reason }),

    // Booking APIs
    getMachines: (params?: { search?: string; maxDistance?: number; category?: string; page?: number; limit?: number; userLat?: number; userLng?: number }, signal?: AbortSignal) =>
        api.get('/machines/public', { params, signal }),
    getMachineById: (id: string) => api.get(`/machines/${id}`),
    getLabours: (params?: { search?: string; maxDistance?: number; category?: string; userLat?: number; userLng?: number; page?: number; limit?: number }, signal?: AbortSignal) =>
        api.get('/labour/public', { params, signal }),
    getLabourById: (id: string) => api.get(`/labour/${id}`),
    bookMachine: (data: { machineId: string; fromDate: string; toDate: string; priceType: string; amount: number; hours?: number; days?: number; kattha?: number; purpose?: string; paymentMethod?: string; paymentMode?: string; selectedSubMachinery?: any[] }) =>
        api.post('/rentals/book', data),
    bookLabour: (data: { labourId: string; workType: string; amount: number; fromDate?: string; toDate?: string; priceType?: string; hours?: number; days?: number; kattha?: number; purpose?: string; paymentMethod?: string }) =>
        api.post('/labour/book', data),

    getShopWalletConfig: () => api.get('/shop/wallet-config'),

    checkMachineAvailability: (machineId: string, fromDate: string, toDate: string, priceType?: string) =>
        api.get('/rentals/check-availability', { params: { machineId, fromDate, toDate, priceType } }),
    checkLabourAvailability: (labourId: string, fromDate: string, toDate: string) =>
        api.get('/labour/check-availability', { params: { labourId, fromDate, toDate } }),

    // Profile Management
    updateProfile: (data: any) => api.put('/user/profile', data),
    updateBankDetails: (data: any) => api.put('/user/bank-details', data),
    uploadProfilePhoto: async (formData: FormData) => {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${BASE_URL}/user/upload-photo`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) {
            if (response.status === 401 && onUnauthorized) onUnauthorized();
            throw new Error('Photo upload failed');
        }
        return await response.json();
    },
    uploadAadhaarDoc: async (formData: FormData, side: 'front' | 'back' = 'front') => {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${BASE_URL}/user/upload-aadhaar?side=${side}`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) {
            if (response.status === 401 && onUnauthorized) onUnauthorized();
            throw new Error('Aadhaar upload failed');
        }
        return await response.json();
    },
    submitLoanLead: (data: any) => api.post('/leads', data),
    getMyLoanLeads: () => api.get('/leads/my-leads'),
    getMyMachineBookings: () => api.get('/rentals/my-bookings'),
    getMyLabourBookings: () => api.get('/labour/my-bookings'),
    getWalletData: () => api.get('/user/wallet'),
    updateWalletNumber: (walletNumber: string) => api.put('/user/wallet/number', { walletNumber }),
    checkout: (data: any) => api.post('/shop/checkout', data),
    getMyShopOrders: () => api.get('/shop/my-orders'),
    getItemById: (id: string) => api.get(`/shop/items/${id}`),
    getBanners: (signal?: AbortSignal) => api.get('/shop/banners', { signal }),
    getShopOrderById: (id: string) => api.get(`/shop/orders/${id}`),
    getLatestSuggestion: () => api.get('/suggestions/latest'),
    getAllSuggestions: () => api.get('/suggestions/all'),
    submitConsultation: async (formData: FormData) => {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${BASE_URL}/doctor/consult`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        if (!response.ok) {
            if (response.status === 401 && onUnauthorized) onUnauthorized();
            throw new Error('Failed to submit consultation');
        }
        return await response.json();
    },
    getMyConsultations: () => api.get('/doctor/my-consultations'),
    getWalletConfig: () => api.get('/shop/wallet-config'),
    getWeather: (lat: number, lon: number) => api.get('/weather', { params: { lat, lon } }),
    getCreditData: () => api.get('/user/credit-data'),
};

export default api;
