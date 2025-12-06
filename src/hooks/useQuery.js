import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const useQuery = (fetcher, deps = []) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetcher();
            setData(result);
        } catch (error) {
            toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [fetcher, toast, ...deps]); // Include deps in useCallback dependencies

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, loading, refetch };
};

export { useQuery };