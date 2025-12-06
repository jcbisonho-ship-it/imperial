import React from 'react';
import VeiculoDialog from '@/components/veiculos/VeiculoDialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// This component now acts as a wrapper/bridge to maintain compatibility
// with components that were using the old path.
const LegacyVehicleDialogWrapper = ({ isOpen, onClose, onSaveSuccess, customer, vehicle }) => {
    const { user } = useAuth();

    // The old VehicleDialog didn't receive a `customers` prop, so we pass an empty array
    // if the new dialog is called from an old component.
    // The new dialog logic handles selecting a customer if `customer` prop is not provided.
    return (
        <VeiculoDialog
            isOpen={isOpen}
            onClose={onClose}
            onSaveSuccess={onSaveSuccess}
            vehicle={vehicle}
            customer={customer}
            customers={[]} 
            user={user}
        />
    );
};

export default LegacyVehicleDialogWrapper;