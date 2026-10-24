import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = process.env.EXPO_PUBLIC_BASE_URL || 'https://demo.ranx24.com';

let socket: Socket | null = null;

export const initSocket = async (): Promise<Socket | null> => {
    if (socket && socket.connected) return socket;

    try {
        const token = await AsyncStorage.getItem('userToken');

        socket = io(SERVER_URL, {
            auth: {
                token: token || ''
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000
        });

        socket.on('connect', () => {
            console.log('⚡ [Farmer App Socket.io] Connected:', socket?.id);
        });

        socket.on('connect_error', (err) => {
            console.log('⚡ [Farmer App Socket.io] Connect Error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('⚡ [Farmer App Socket.io] Disconnected:', reason);
        });

        return socket;
    } catch (err: any) {
        console.warn('⚡ [Farmer App Socket.io] Init failed:', err?.message);
        return null;
    }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
