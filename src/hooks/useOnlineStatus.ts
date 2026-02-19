import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(() => {
        const saved = localStorage.getItem('lastOnlineAt');
        return saved ? parseInt(saved) : null;
    });
    const queryClient = useQueryClient();

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        setLastOnlineAt(Date.now());
        localStorage.setItem('lastOnlineAt', Date.now().toString());
        // Auto-sync: refetch all queries when back online
        queryClient.invalidateQueries();
    }, [queryClient]);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
    }, []);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    const lastSyncedText = lastOnlineAt
        ? new Date(lastOnlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    return { isOnline, lastSyncedText };
};
