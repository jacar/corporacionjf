import React, { useState, useEffect } from 'react';
import { applySEO } from '../utils/seo';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Conductor } from '../types';
import { storage } from '../utils/storage';

const Conductors: React.FC = () => {
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [filteredConductors, setFilteredConductors] = useState<Conductor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConductor, setEditingConductor] = useState<Conductor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    placa: '',
    area: '',
    ruta: ''
  });

  useEffect(() => {
    applySEO({
      title: 'Conductores | Sistema de Reportes JF',
      description: 'Administre conductores, placas, áreas y rutas en el Sistema de Reportes JF.',
      keywords: 'conductores, placas, rutas, transporte, gestión de conductores',
      canonicalPath: '/conductors',
    });
    loadConductors();
  }, []);

  useEffect(() => {
    filterConductors();
  }, [conductors, searchTerm]);

  const loadConductors = () => {
    const data = storage.getConductors();
    setConductors(data);
  };

  const filterConductors = () => {
    if (!searchTerm) {
      setFilteredConductors(conductors);
    } else {
      const filtered = conductors.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cedula.includes(searchTerm) ||
        c.placa.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConductors(filtered);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si ya existe un conductor con la misma cédula
    const existingConductor = conductors.find(c => c.cedula === formData.cedula && (!editingConductor || c.id !== editingConductor.id));
    if (existingConductor) {
      alert('Ya existe un conductor con esta cédula');
      return;
    }
    
    if (editingConductor) {
      // Update existing conductor
      const updatedConductors = conductors.map(c => 
        c.id === editingConductor.id 
          ? { ...c, ...formData }
          : c
      );
      storage.saveConductors(updatedConductors);
      setConductors(updatedConductors);
    } else {
      // Create new conductor
      const newConductor: Conductor = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      
      const updatedConductors = [...conductors, newConductor];
      storage.saveConductors(updatedConductors);
      setConductors(updatedConductors);
    }
    
    resetForm();
  };

  const handleEdit = (conductor: Conductor) => {
    setEditingConductor(conductor);
    setFormData({
      name: conductor.name,
      cedula: conductor.cedula,
      placa: conductor.placa,
      area: conductor.area || '',
      ruta: conductor.ruta || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este conductor?')) {
      const updatedConductors = conductors.filter(c => c.id !== id);
      storage.saveConductors(updatedConductors);
      setConductors(updatedConductors);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', cedula: '', placa: '', area: '', ruta: '' });
    setEditingConductor(null);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Conductores</h1>
          <p className="text-gray-600">Administre los conductores del sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Conductor</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto md:overflow-visible">
          <table className="w-full table-auto md:table-fixed">
            <thead className="bg-gray-50 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conductor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Área
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 block md:table-row-group">
              {filteredConductors.map((conductor) => (
                <tr key={conductor.id} className="hover:bg-gray-50 block md:table-row">
                  <td className="px-6 py-4 block md:table-cell">
                    <div className="font-medium text-gray-900">{conductor.name}</div>
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {conductor.cedula}
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {conductor.placa}
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {conductor.area || 'N/A'}
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    <div className="max-w-xs truncate" title={conductor.ruta}>
                      {conductor.ruta || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {new Date(conductor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2 block md:table-cell">
                    <button
                      onClick={() => handleEdit(conductor)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(conductor.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingConductor ? 'Editar Conductor' : 'Nuevo Conductor'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa del Vehículo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: ADMINISTRATIVA RICHMOND"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruta Asignada
                </label>
                <textarea
                  value={formData.ruta}
                  onChange={(e) => setFormData({ ...formData, ruta: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: LA LAGUNITA - LOS PATRULLEROS-RICHMOND"
                  rows={2}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingConductor ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conductors;