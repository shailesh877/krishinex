import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;

export const initSocket = async (): Promise<Socket | null> => {
    if (socket) return socket;
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    socket = io(BASE_URL, {
        auth: {
            token
        },
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        console.log('[Socket.io] Connected to server:', socket?.id);
    });

    socket.on('connect_error', (err) => {
        console.log('[Socket.io] Connect Error:', err.message);
    });

    socket.on('disconnect', () => {
        console.log('[Socket.io] Disconnected');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
