import React from 'react';
import { Helmet } from 'react-helmet';

const RelatorioServicos = () => {
  return (
    <>
      <Helmet>
        <title>Relatório de Serviços - Horizontes</title>
        <meta name="description" content="Relatório de serviços prestados pela oficina." />
      </Helmet>
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">Relatório de Serviços</h2>
        <p className="text-gray-600 mt-2">Esta página está vazia. Você pode solicitar a implementação do conteúdo em um próximo prompt. 🚀</p>
      </div>
    </>
  );
};

export default RelatorioServicos;