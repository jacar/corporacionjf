import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { Passenger } from '../types';
import { storage } from './storage';
import { generateQRCode, QRData } from './qr';

/**
 * Procesa los datos de pasajeros importados desde un archivo CSV/Excel
 */
export const processPassengersFromImport = async (data: any[]): Promise<Passenger[]> => {
  const existingPassengers = await storage.getPassengers();
  const existingCedulas = new Set(existingPassengers.map(p => p.cedula));
  const newPassengers: Passenger[] = [];
  
  // Procesar cada fila de datos
  for (const row of data) {
    // Extraer datos de las columnas (ajustar según el formato esperado)
    const name = row['Nombres y Apellidos'] || row['Nombre'] || row['nombre'] || row['NOMBRE'] || row['Name'] || row['name'] || '';
    const cedula = row['Cedula'] || row['cedula'] || row['CEDULA'] || row['ID'] || row['id'] || '';
    const gerencia = row['Gerencia'] || row['gerencia'] || row['GERENCIA'] || row['Department'] || row['department'] || '';
    
    // Validar datos mínimos requeridos
    if (!name || !cedula) {
      continue; // Saltar filas sin datos esenciales
    }
    
    // Evitar duplicados por cédula
    if (existingCedulas.has(cedula)) {
      continue;
    }
    
    // Generar QR para el pasajero
    const qrData: QRData = {
      cedula,
      name,
      gerencia,
      timestamp: new Date().toISOString()
    };
    
    try {
      const qrCode = await generateQRCode(qrData);
      
      // Crear nuevo pasajero
      const newPassenger: Passenger = {
        id: uuidv4(),
        name,
        cedula,
        gerencia,
        qrCode,
        createdAt: new Date().toISOString()
      };
      
      newPassengers.push(newPassenger);
      existingCedulas.add(cedula); // Evitar duplicados en el mismo archivo
    } catch (error) {
      console.error('Error generando QR para pasajero:', error);
      // Continuar con el siguiente pasajero
    }
  }
  
  return newPassengers;
};

/**
 * Guarda los pasajeros importados en el almacenamiento
 */
export const saveImportedPassengers = async (newPassengers: Passenger[]): Promise<number> => {
  if (newPassengers.length === 0) return 0;
  
  const existingPassengers = await storage.getPassengers();
  const updatedPassengers = [...existingPassengers, ...newPassengers];
  
  try {
    await storage.savePassengers(updatedPassengers);
    return newPassengers.length;
  } catch (error) {
    console.error('Error al guardar pasajeros importados:', error);
    throw new Error('No se pudieron guardar los pasajeros importados. El almacenamiento está lleno o hay un problema con la base de datos.');
  }
};

/**
 * Importa pasajeros desde un archivo CSV o Excel
 */
export const importPassengersFromFile = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }
        
        // Parsear el archivo con XLSX
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          reject(new Error('El archivo no contiene datos'));
          return;
        }
        
        // Verificar que el archivo tenga las columnas necesarias
        const firstRow = jsonData[0];
        const hasRequiredColumns = (
          // Verificar si existe alguna de las variantes para la columna de nombre
          (firstRow.hasOwnProperty('Nombres y Apellidos') || 
           firstRow.hasOwnProperty('Nombre') || 
           firstRow.hasOwnProperty('nombre') || 
           firstRow.hasOwnProperty('NOMBRE') || 
           firstRow.hasOwnProperty('Name') || 
           firstRow.hasOwnProperty('name')) &&
          // Verificar si existe alguna de las variantes para la columna de cédula
          (firstRow.hasOwnProperty('Cedula') || 
           firstRow.hasOwnProperty('cedula') || 
           firstRow.hasOwnProperty('CEDULA') || 
           firstRow.hasOwnProperty('ID') || 
           firstRow.hasOwnProperty('id'))
        );
        
        if (!hasRequiredColumns) {
          reject(new Error('El formato del archivo no es válido. Debe contener columnas para "Cedula" y "Nombres y Apellidos".'));
          return;
        }
        
        // Procesar los datos
        const newPassengers = await processPassengersFromImport(jsonData);
        
        if (newPassengers.length === 0) {
          reject(new Error('No se pudieron procesar pasajeros del archivo. Verifique que los datos sean válidos y no estén duplicados.'));
          return;
        }
        
        try {
          // Guardar los pasajeros (ahora es asíncrono)
          const savedCount = await saveImportedPassengers(newPassengers);
          resolve(savedCount);
        } catch (storageError) {
          // Capturar errores específicos de almacenamiento
          reject(storageError);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsBinaryString(file);
  });
};