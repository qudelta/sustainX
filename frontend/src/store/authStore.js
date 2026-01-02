import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    initialize: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            set({ isLoading: false, isAuthenticated: false });
            return;
        }

        try {
            const response = await api.get('/auth/me');
            set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch (error) {
            localStorage.removeItem('token');
            set({ isLoading: false, isAuthenticated: false });
        }
    },

    requestMagicLink: async (email) => {
        const response = await api.post('/auth/login', { email });
        return response.data;
    },

    verifyToken: async (token) => {
        const response = await api.post('/auth/verify', { token });
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);

        // Fetch user info
        const userResponse = await api.get('/auth/me');
        set({ user: userResponse.data, isAuthenticated: true });

        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false });
    },
}));

// Initialize on load
useAuthStore.getState().initialize();
