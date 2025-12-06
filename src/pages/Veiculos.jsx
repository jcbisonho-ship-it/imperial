import React from 'react';
import VeiculosList from '@/components/veiculos/VeiculosList';

const Veiculos = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* The VeiculosList component will now handle the "Novo Veículo" button and its dialog internally. */}
      <VeiculosList />
    </div>
  );
};

export default Veiculos;