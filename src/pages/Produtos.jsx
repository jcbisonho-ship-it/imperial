import React from 'react';
import ProdutosList from '@/components/produtos/ProdutosList';

const Produtos = () => {
    return (
        <div className="w-full space-y-6 p-4 sm:p-0">
            {/* O título e a descrição foram removidos pois seriam duplicados ou gerenciados pelo layout principal. */}
            <ProdutosList />
        </div>
    );
};

export default Produtos;