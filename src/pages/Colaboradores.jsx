import React from 'react';
import ColaboradoresList from '@/components/colaboradores/ColaboradoresList'; // Import the correct listing component

const Colaboradores = () => {
    return (
        <div className="p-4 sm:p-6 lg:p-8"> {/* Added padding for consistent page layout */}
            <ColaboradoresList />
        </div>
    );
};

export default Colaboradores;