import { User, Passenger, Conductor, Trip, Signature, ConductorCredential } from '../types';
import { generateDefaultPassengers } from './defaultPassengers';
import { generateDefaultConductors } from './defaultConductors';
import { indexedDBService } from '../database/indexeddb';

const STORAGE_KEYS = {
  USERS: 'transport_users',
  PASSENGERS: 'transport_passengers',
  CONDUCTORS: 'transport_conductors',
  TRIPS: 'transport_trips',
  CURRENT_USER: 'transport_current_user',
  SIGNATURES: 'transport_signatures',
  CONDUCTOR_CREDENTIALS: 'transport_conductor_credentials'
};

const initializeDefaultData = async () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: User[] = [
      {
        id: '1',
        name: 'Administrador',
        cedula: '12345678',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.PASSENGERS)) {
    try {
      const defaultPassengers = await generateDefaultPassengers();
      localStorage.setItem(STORAGE_KEYS.PASSENGERS, JSON.stringify(defaultPassengers));
    } catch (error) {
      console.error('Error generando pasajeros por defecto:', error);
    }
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.CONDUCTORS)) {
    const defaultConductors = generateDefaultConductors();
    localStorage.setItem(STORAGE_KEYS.CONDUCTORS, JSON.stringify(defaultConductors));
  }
};

initializeDefaultData().catch(console.error);

// Función para forzar la migración de datos de localStorage a IndexedDB
const forceDataMigration = async () => {
  try {
    console.log('Iniciando migración forzada de datos a IndexedDB...');
    
    // Migrar pasajeros
    const passengersData = localStorage.getItem(STORAGE_KEYS.PASSENGERS);
    if (passengersData) {
      const passengers = JSON.parse(passengersData);
      await indexedDBService.savePassengers(passengers);
      console.log(`Migrados ${passengers.length} pasajeros a IndexedDB`);
    }
    
    // Migrar otros datos importantes
    const tripsData = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (tripsData) {
      const trips = JSON.parse(tripsData);
      await indexedDBService.saveTrips(trips);
      console.log(`Migrados ${trips.length} viajes a IndexedDB`);
    }
    
    // Limpiar localStorage para liberar espacio
    localStorage.removeItem(STORAGE_KEYS.PASSENGERS);
    console.log('Datos de pasajeros eliminados de localStorage para liberar espacio');
    
    console.log('Migración forzada completada');
    return true;
  } catch (error) {
    console.error('Error durante la migración forzada:', error);
    return false;
  }
};

export const storage = {
  getUsers: (): User[] => {
    // Try IndexedDB first, fallback to localStorage
    indexedDBService.getUsers().then(users => {
      if (users.length > 0) {
        // Update localStorage as backup
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    }).catch(() => {
      // Fallback to localStorage if IndexedDB fails
    });
    
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  
  saveUsers: async (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    try {
      await indexedDBService.saveUsers(users);
    } catch (error) {
      console.error('Failed to save users to IndexedDB:', error);
    }
  },

  getPassengers: async (): Promise<Passenger[]> => {
    try {
      // Intentar obtener de IndexedDB primero
      const passengersFromDB = await indexedDBService.getPassengers();
      if (passengersFromDB.length > 0) {
        return passengersFromDB;
      }
      
      // Si no hay datos en IndexedDB, intentar obtener de localStorage
      const data = localStorage.getItem(STORAGE_KEYS.PASSENGERS);
      const passengersFromLS = data ? JSON.parse(data) : [];
      
      // Si hay datos en localStorage pero no en IndexedDB, migrarlos a IndexedDB
      if (passengersFromLS.length > 0) {
        console.log('Migrando pasajeros de localStorage a IndexedDB...');
        await indexedDBService.savePassengers(passengersFromLS);
      }
      
      return passengersFromLS;
    } catch (error) {
      console.error('Error al obtener pasajeros:', error);
      // Último recurso: intentar obtener de localStorage
      const data = localStorage.getItem(STORAGE_KEYS.PASSENGERS);
      return data ? JSON.parse(data) : [];
    }
  },
  
  savePassengers: async (passengers: Passenger[]) => {
    try {
      // Siempre guardar en IndexedDB primero
      await indexedDBService.savePassengers(passengers);
      
      // Intentar guardar en localStorage solo como respaldo (puede fallar por cuota)
      try {
        localStorage.setItem(STORAGE_KEYS.PASSENGERS, JSON.stringify(passengers));
      } catch (error) {
        console.warn('No se pudo guardar en localStorage (cuota excedida). Usando solo IndexedDB.');
        // Si localStorage está lleno, no es un error crítico, continuamos usando IndexedDB
      }
    } catch (error) {
      console.error('Error al guardar pasajeros:', error);
      throw new Error('No se pudieron guardar los pasajeros. Hay un problema con la base de datos.');
    }
  },

  getConductors: (): Conductor[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONDUCTORS);
    return data ? JSON.parse(data) : [];
  },
  
  saveConductors: (conductors: Conductor[]) => {
    localStorage.setItem(STORAGE_KEYS.CONDUCTORS, JSON.stringify(conductors));
  },

  getTrips: (): Trip[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
    return data ? JSON.parse(data) : [];
  },
  
  saveTrips: (trips: Trip[]) => {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },
  
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getSignatures: (): Signature[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SIGNATURES);
    return data ? JSON.parse(data) : [];
  },
  
  saveSignatures: (signatures: Signature[]) => {
    localStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(signatures));
  },

  getConductorCredentials: (): ConductorCredential[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONDUCTOR_CREDENTIALS);
    return data ? JSON.parse(data) : [];
  },
  
  saveConductorCredentials: (credentials: ConductorCredential[]) => {
    localStorage.setItem(STORAGE_KEYS.CONDUCTOR_CREDENTIALS, JSON.stringify(credentials));
  },
  
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },
  
  // Función para forzar la migración de datos y liberar espacio
  forceDataMigration: async () => {
    return await forceDataMigration();
  }
};