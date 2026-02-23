
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co";

export interface CustomFilter {
    id: string;
    name: string;
    icon: string;
    color: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
}

// Fetch all active custom filters (for public use: NearbyScreen, AdminPanel)
export const useCustomFilters = () => {
    return useQuery({
        queryKey: ['custom-filters'],
        queryFn: async (): Promise<CustomFilter[]> => {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_filters' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.filters || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

// Fetch ALL custom filters including inactive (for super admin)
export const useAllCustomFilters = () => {
    return useQuery({
        queryKey: ['custom-filters-all'],
        queryFn: async (): Promise<CustomFilter[]> => {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_all_filters' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.filters || [];
        },
        staleTime: 0,
    });
};

// Fetch filter IDs for a specific location
export const useLocationFilters = (locationId: string | undefined) => {
    return useQuery({
        queryKey: ['location-filters', locationId],
        queryFn: async (): Promise<string[]> => {
            if (!locationId) return [];
            const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_location_filters', location_id: locationId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.filter_ids || [];
        },
        enabled: !!locationId,
        staleTime: 1000 * 60 * 2,
    });
};

// Fetch ALL location-filter mappings (for NearbyScreen bulk filtering)
export const useAllLocationFilters = () => {
    return useQuery({
        queryKey: ['all-location-filters'],
        queryFn: async (): Promise<{ location_id: string; filter_id: string }[]> => {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_all_location_filters' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data.mappings || [];
        },
        staleTime: 1000 * 60 * 2,
    });
};

// Mutation: set location filters (admin)
export const useSetLocationFilters = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            locationId,
            filterIds,
            username,
            password,
        }: {
            locationId: string;
            filterIds: string[];
            username: string;
            password: string;
        }) => {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_location_filters',
                    username,
                    password,
                    location_id: locationId,
                    data: { filter_ids: filterIds },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['location-filters', vars.locationId] });
            queryClient.invalidateQueries({ queryKey: ['all-location-filters'] });
        },
    });
};

// Mutation: super admin manage filter (create/update/delete)
export const useManageFilter = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            subAction,
            filterId,
            filterData,
        }: {
            subAction: 'create' | 'update' | 'delete';
            filterId?: string;
            filterData?: Partial<CustomFilter>;
        }) => {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'super_manage_filter',
                    data: {
                        sub_action: subAction,
                        filter_id: filterId,
                        filter_data: filterData,
                    },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['custom-filters'] });
            queryClient.invalidateQueries({ queryKey: ['custom-filters-all'] });
        },
    });
};
