import { create } from 'zustand';
import api from '../lib/api';

export const useSimulationStore = create((set, get) => ({
    jobs: [],
    currentJob: null,
    currentResult: null,
    isLoading: false,
    isPolling: false,
    error: null,

    fetchProjectJobs: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get(`/simulations/project/${projectId}`);
            set({ jobs: response.data, isLoading: false });
        } catch (error) {
            set({ error: error.message, isLoading: false });
        }
    },

    createJob: async (projectId, config) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/simulations', {
                project_id: projectId,
                config,
            });
            set((state) => ({
                jobs: [response.data, ...state.jobs],
                currentJob: response.data,
                isLoading: false,
            }));
            return response.data;
        } catch (error) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    fetchJob: async (jobId) => {
        const response = await api.get(`/simulations/${jobId}`);
        set({ currentJob: response.data });
        return response.data;
    },

    fetchResult: async (jobId) => {
        const response = await api.get(`/simulations/${jobId}/result`);
        set({ currentResult: response.data });
        return response.data;
    },

    pollJobStatus: async (jobId, onComplete, onError) => {
        set({ isPolling: true });

        const poll = async () => {
            try {
                const job = await get().fetchJob(jobId);

                if (job.status === 'COMPLETED') {
                    const result = await get().fetchResult(jobId);
                    set({ isPolling: false });
                    onComplete?.(result);
                    return;
                }

                if (job.status === 'FAILED') {
                    set({ isPolling: false });
                    onError?.(job.error_message || 'Simulation failed');
                    return;
                }

                // Continue polling
                setTimeout(poll, 2000);
            } catch (error) {
                set({ isPolling: false });
                onError?.(error.message);
            }
        };

        poll();
    },

    stopPolling: () => {
        set({ isPolling: false });
    },

    getReportUrl: async (jobId) => {
        const response = await api.get(`/simulations/${jobId}/report-url`);
        return response.data.download_url;
    },

    clearCurrent: () => {
        set({ currentJob: null, currentResult: null });
    },
}));
