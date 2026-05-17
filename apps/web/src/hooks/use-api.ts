import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Site } from '@/lib/api-client';

export function useSites() {
	return useQuery({
		queryKey: ['sites'],
		queryFn: ({ signal }) => api.getSites(signal).then((r) => r.data),
	});
}

export function useCreateSite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { name: string; baseUrl: string; scraperType: string }) =>
			api.createSite(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
	});
}

export function useUpdateSite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & Partial<Site>) => api.updateSite(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
	});
}

export function useDeleteSite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.deleteSite(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
	});
}

export function useTriggerScrape() {
	return useMutation({
		mutationFn: ({
			id,
			...data
		}: {
			id: string;
			query?: string;
			location?: string;
			maxPages?: number;
		}) => api.triggerScrape(id, data),
	});
}

export function useJobs(params: Record<string, string>) {
	return useQuery({
		queryKey: ['jobs', params],
		queryFn: ({ signal }) => api.getJobs(params, signal).then((r) => r),
	});
}

export function useUpdateJobStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, status }: { id: string; status: string }) => api.updateJobStatus(id, status),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
	});
}

export function useSettings() {
	return useQuery({
		queryKey: ['settings'],
		queryFn: () => api.getSettings().then((r) => r.data),
	});
}

export function useUpdateSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => api.updateSettings(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
	});
}

export function useTestAI() {
	return useMutation({
		mutationFn: (data: { provider: string; apiKey: string; model?: string }) => api.testAI(data),
	});
}
