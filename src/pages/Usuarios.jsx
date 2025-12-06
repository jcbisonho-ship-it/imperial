import React from 'react';
import UsuariosList from '@/components/usuarios/UsuariosList';

const Usuarios = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Usuários</h2>
                <p className="text-gray-600">Adicione, edite e gerencie os usuários do sistema.</p>
            </div>
            <UsuariosList />
        </div>
    );
};

export default Usuarios;