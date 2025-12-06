import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import EmployeeDialog from '@/components/dialogs/EmployeeDialog';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    const stored = localStorage.getItem('imperial_employees');
    if (stored) {
      setEmployees(JSON.parse(stored));
    }
  };

  const saveEmployees = (updatedEmployees) => {
    localStorage.setItem('imperial_employees', JSON.stringify(updatedEmployees));
    setEmployees(updatedEmployees);
  };

  const handleAddEmployee = (employeeData) => {
    const newEmployee = {
      ...employeeData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    const updated = [...employees, newEmployee];
    saveEmployees(updated);
    toast({
      title: "Funcionário adicionado!",
      description: `${employeeData.name} foi cadastrado com sucesso.`
    });
  };

  const handleEditEmployee = (employeeData) => {
    const updated = employees.map(emp => 
      emp.id === editingEmployee.id ? { ...employeeData, id: emp.id, createdAt: emp.createdAt } : emp
    );
    saveEmployees(updated);
    toast({
      title: "Funcionário atualizado!",
      description: `${employeeData.name} foi atualizado com sucesso.`
    });
  };

  const handleDeleteEmployee = (id) => {
    const updated = employees.filter(emp => emp.id !== id);
    saveEmployees(updated);
    toast({
      title: "Funcionário removido!",
      description: "O funcionário foi removido do sistema."
    });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestão de Funcionários</h2>
          <p className="text-gray-600">Gerencie sua equipe de trabalho</p>
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setIsDialogOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum funcionário cadastrado</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Funcionário" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{employee.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{employee.role}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => {
                        setEditingEmployee(employee);
                        setIsDialogOpen(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Telefone:</span> {employee.phone}</p>
                  <p><span className="font-medium">Email:</span> {employee.email}</p>
                  <p><span className="font-medium">Comissão:</span> {employee.commission}%</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <EmployeeDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingEmployee(null);
        }}
        onSave={editingEmployee ? handleEditEmployee : handleAddEmployee}
        employee={editingEmployee}
      />
    </div>
  );
};

export default EmployeeManagement;