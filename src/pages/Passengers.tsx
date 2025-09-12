import React, { useState, useEffect } from 'react';
import { applySEO } from '../utils/seo';
import { Plus, Search, QrCode, Download, Edit, Trash2, Upload, Database } from 'lucide-react';
import { Passenger } from '../types';
import { storage } from '../utils/storage';
import { generateQRCode, QRData } from '../utils/qr';
import QRViewer from '../components/QRViewer/QRViewer';
import PassengerCSVImport from '../components/ExcelImport/PassengerCSVImport';

const Passengers: React.FC = () => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [filteredPassengers, setFilteredPassengers] = useState<Passenger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQRViewer, setShowQRViewer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    gerencia: ''
  });

  useEffect(() => {
    applySEO({
      title: 'Pasajeros | Sistema de Reportes JF',
      description: 'Gestione y busque pasajeros con cédula y genere códigos QR en el Sistema de Reportes JF.',
      keywords: 'pasajeros, cédula, QR, transporte, gestión de pasajeros',
      canonicalPath: '/passengers',
    });
    loadPassengers();
  }, []);

  useEffect(() => {
    filterPassengers();
  }, [passengers, searchTerm]);

  const loadPassengers = async () => {
    try {
      const data = await storage.getPassengers();
      setPassengers(data);
    } catch (error) {
      console.error('Error al cargar pasajeros:', error);
      alert('Hubo un problema al cargar los pasajeros. Intente nuevamente.');
    }
  };

  const filterPassengers = () => {
    if (!searchTerm) {
      setFilteredPassengers(passengers);
    } else {
      const filtered = passengers.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm) ||
        p.gerencia.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPassengers(filtered);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si ya existe un pasajero con la misma cédula
    const existingPassenger = passengers.find(p => p.cedula === formData.cedula && (!editingPassenger || p.id !== editingPassenger.id));
    if (existingPassenger) {
      alert('Ya existe un pasajero con esta cédula');
      return;
    }
    
    if (editingPassenger) {
      // Update existing passenger
      const updatedPassengers = passengers.map(p => 
        p.id === editingPassenger.id 
          ? { ...p, ...formData }
          : p
      );
      storage.savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    } else {
      // Create new passenger
      const qrData: QRData = {
        cedula: formData.cedula,
        name: formData.name,
        gerencia: formData.gerencia,
        timestamp: new Date().toISOString()
      };
      
      const qrCode = await generateQRCode(qrData);
      
      const newPassenger: Passenger = {
        id: Date.now().toString(),
        ...formData,
        qrCode,
        createdAt: new Date().toISOString()
      };
      
      const updatedPassengers = [...passengers, newPassenger];
      storage.savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    }
    
    resetForm();
  };

  const regenerateQR = async (passenger: Passenger) => {
    try {
      const qrData: QRData = {
        cedula: passenger.cedula,
        name: passenger.name,
        gerencia: passenger.gerencia,
        timestamp: new Date().toISOString()
      };
      
      const newQrCode = await generateQRCode(qrData);
      
      const updatedPassengers = passengers.map(p => 
        p.id === passenger.id 
          ? { ...p, qrCode: newQrCode }
          : p
      );
      
      await storage.savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    } catch (error) {
      console.error('Error al regenerar QR:', error);
      alert('Error regenerando código QR. La aplicación utilizará la base de datos interna.');
    }
  };

  const handleEdit = (passenger: Passenger) => {
    setEditingPassenger(passenger);
    setFormData({
      name: passenger.name,
      cedula: passenger.cedula,
      gerencia: passenger.gerencia
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este pasajero?')) {
      const updatedPassengers = passengers.filter(p => p.id !== id);
      storage.savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    }
  };

  const downloadQR = (passenger: Passenger) => {
    const link = document.createElement('a');
    link.download = `QR_${passenger.name}_${passenger.cedula}.png`;
    link.href = passenger.qrCode;
    link.click();
  };
  
  const viewQR = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setShowQRViewer(true);
  };

  const resetForm = () => {
    setFormData({ name: '', cedula: '', gerencia: '' });
    setEditingPassenger(null);
    setShowModal(false);
  };
  
  const handleImportSuccess = (count: number) => {
    // Recargar los datos después de una importación exitosa
    loadPassengers();
    // Mostrar mensaje de éxito si es necesario
    alert(`Se importaron ${count} pasajeros correctamente.`);
  };
  
  const handleImportError = (error: string) => {
    // Mostrar mensaje de error si es necesario
    console.error('Error al importar:', error);
  };
  
  // Función para forzar la migración de datos cuando hay problemas de almacenamiento
  const handleForceMigration = async () => {
    if (window.confirm('¿Está seguro de migrar los datos a la base de datos interna? Esto puede ayudar a solucionar problemas de almacenamiento.')) {
      setIsMigrating(true);
      try {
        const success = await storage.forceDataMigration();
        if (success) {
          alert('Migración completada. Los datos han sido transferidos a la base de datos interna y se ha liberado espacio.');
          // Recargar los pasajeros después de la migración
          await loadPassengers();
        } else {
          alert('Hubo un problema durante la migración. Intente nuevamente.');
        }
      } catch (error) {
        console.error('Error durante la migración:', error);
        alert('Error durante la migración. Intente nuevamente.');
      } finally {
        setIsMigrating(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pasajeros</h1>
          <p className="text-gray-600">Administre los pasajeros del sistema</p>
          <p className="text-gray-600 mt-1">Total de pasajeros: <span className="font-semibold">{passengers.length}</span></p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="h-5 w-5" />
            <span>Importar CSV</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Pasajero</span>
          </button>
          <button
            onClick={handleForceMigration}
            disabled={isMigrating}
            className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400"
            title="Migrar datos a la base de datos interna para solucionar problemas de almacenamiento"
          >
            <Database className="h-5 w-5" />
            <span>{isMigrating ? 'Migrando...' : 'Liberar Espacio'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o gerencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto md:overflow-visible">
          <div className="px-6 py-2 text-sm text-gray-600">
            Mostrando <span className="font-semibold">{filteredPassengers.length}</span> de <span className="font-semibold">{passengers.length}</span> pasajeros
          </div>
          <table className="w-full table-auto md:table-fixed">
            <thead className="bg-gray-50 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pasajero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gerencia
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
              {filteredPassengers.map((passenger) => (
                <tr key={passenger.id} className="hover:bg-gray-50 block md:table-row">
                  <td className="px-6 py-4 block md:table-cell">
                    <div className="font-medium text-gray-900">{passenger.name}</div>
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {passenger.cedula}
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {passenger.gerencia}
                  </td>
                  <td className="px-6 py-4 block md:table-cell text-gray-600">
                    {new Date(passenger.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2 block md:table-cell">
                    <button
                      onClick={() => viewQR(passenger)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Ver QR"
                    >
                      <QrCode className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => downloadQR(passenger)}
                      className="text-purple-600 hover:text-purple-800 transition-colors"
                      title="Descargar QR"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(passenger)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(passenger.id)}
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
              {editingPassenger ? 'Editar Pasajero' : 'Nuevo Pasajero'}
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
                  className="w-full md:max-w-xs md:mx-auto border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gerencia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.gerencia}
                  onChange={(e) => setFormData({ ...formData, gerencia: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  {editingPassenger ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* QR Viewer */}
      {showQRViewer && selectedPassenger && (
        <QRViewer
          passenger={selectedPassenger}
          onClose={() => {
            setShowQRViewer(false);
            setSelectedPassenger(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Importar Pasajeros desde CSV/Excel</h2>
            <PassengerCSVImport
              onSuccess={handleImportSuccess}
              onError={handleImportError}
              onClose={() => setShowImportModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Passengers;