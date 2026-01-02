import { create } from 'zustand';
import api from '../lib/api';

export const useProjectStore = create((set, get) => ({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,

    fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/projects');
            set({ projects: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchProject: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get(`/projects/${projectId}`);
            set({ currentProject: response.data, isLoading: false });
            return response.data;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    createProject: async (data) => {
        const response = await api.post('/projects', data);
        set((state) => ({ projects: [response.data, ...state.projects] }));
        return response.data;
    },

    updateProject: async (projectId, data) => {
        const response = await api.put(`/projects/${projectId}`, data);
        set((state) => ({
            projects: state.projects.map((p) =>
                p.id === projectId ? response.data : p
            ),
            currentProject: response.data,
        }));
        return response.data;
    },

    deleteProject: async (projectId) => {
        await api.delete(`/projects/${projectId}`);
        set((state) => ({
            projects: state.projects.filter((p) => p.id !== projectId),
            currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
        }));
    },

    updateFloorplan: async (projectId, floorplan) => {
        return get().updateProject(projectId, { floorplan });
    },

    clearCurrentProject: () => {
        set({ currentProject: null });
    },
}));
