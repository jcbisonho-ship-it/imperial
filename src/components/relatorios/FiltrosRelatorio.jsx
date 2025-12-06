import React, { useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

const FiltrosRelatorio = ({ filters, setFilters }) => {
    const [collaborators, setCollaborators] = useState([]);
    const workOrderStatuses = ['pending', 'in_progress', 'awaiting_payment', 'completed', 'canceled'];

    useEffect(() => {
        const fetchCollaborators = async () => {
            const { data } = await supabase.from('collaborators').select('id, name').order('name');
            setCollaborators(data || []);
        };
        fetchCollaborators();
    }, []);

    const handleDateChange = (date) => {
        setFilters(prev => ({ ...prev, dateRange: date }));
    };

    const handleCollaboratorChange = (value) => {
        setFilters(prev => ({ ...prev, collaboratorId: value === 'all' ? null : value }));
    };

    const handleStatusChange = (value) => {
        setFilters(prev => ({ ...prev, status: value === 'all' ? null : value }));
    };
    
    const clearFilters = () => {
        setFilters(prev => ({
            ...prev,
            collaboratorId: null,
            status: null,
        }));
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-lg flex flex-wrap items-center gap-4">
            <DateRangePicker date={filters.dateRange} setDate={handleDateChange} />
            <div className="w-full sm:w-auto min-w-[200px]">
                <Select onValueChange={handleCollaboratorChange} value={filters.collaboratorId || 'all'}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtrar por mecânico..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Mecânicos</SelectItem>
                        {collaborators.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="w-full sm:w-auto min-w-[200px]">
                <Select onValueChange={handleStatusChange} value={filters.status || 'all'}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtrar por status da OS..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        {workOrderStatuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button variant="ghost" onClick={clearFilters} className="text-gray-600">
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
            </Button>
        </div>
    );
};

export default FiltrosRelatorio;