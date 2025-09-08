import { Conductor } from '../types';

export const defaultConductorsData = [
  { 
    name: "CARLOS CASTRO", 
    cedula: "10001001", 
    placa: "281", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "LA LAGUNITA - LOS PATRULLEROS-RICHMOND"
  },
  { 
    name: "ALBERTO ROMERO", 
    cedula: "10001002", 
    placa: "292", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "LOS MODINES-SANTA FE - RICHMOND"
  },
  { 
    name: "LINO ACOSTA", 
    cedula: "10001003", 
    placa: "348", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "CORE 3 - PICOLA -SAN JACINTO-RICHMOND"
  },
  { 
    name: "LEANDRO MARTINEZ", 
    cedula: "10001004", 
    placa: "280", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "18 OCTUBRE-RICHMOND"
  },
  { 
    name: "JOSE GARCIA", 
    cedula: "10001005", 
    placa: "278", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "TAMARE - PUNTA GORDA-CABIMAS - RICHMOND"
  },
  { 
    name: "LEOBALDO MORAN", 
    cedula: "10001006", 
    placa: "274", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "EL PINAR - LOS HATICOS - RICHMOND"
  },
  { 
    name: "JOSUE PAZ", 
    cedula: "10001007", 
    placa: "320", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "CONCEPCION - SOL AMADO - RICHMOND"
  },
  { 
    name: "RICARDO EVERON", 
    cedula: "10001008", 
    placa: "279", 
    area: "ADMINISTRATIVA RICHMOND",
    ruta: "SAN FRANCISCO - RICHMOND"
  },
  { 
    name: "CARLOS NAVEDA", 
    cedula: "10001009", 
    placa: "297", 
    area: "ADMINISTRATIVA CAMPO BOSCAN",
    ruta: "LAGUNITA-CB"
  },
  { 
    name: "HECTOR AVILA", 
    cedula: "10001010", 
    placa: "296", 
    area: "ADMINISTRATIVA CAMPO BOSCAN",
    ruta: "MCBO-CORE 3-CB"
  },
  { 
    name: "DANIEL BRICEÑO", 
    cedula: "10001011", 
    placa: "290", 
    area: "ADMINISTRATIVA CAMPO BOSCAN",
    ruta: "SAN FCO - EL PINAR- CB"
  },
  { 
    name: "JOSE MONTIEL", 
    cedula: "10001012", 
    placa: "291", 
    area: "ADMINISTRATIVA CAMPO BOSCAN",
    ruta: "SAN FCO - EL EL BAJO- CB"
  },
  { 
    name: "ARMANDO OVALLE", 
    cedula: "10001013", 
    placa: "292", 
    area: "ADMINISTRATIVA CAMPO BOSCAN",
    ruta: "DESARROLLO"
  }
];

export const generateDefaultConductors = (): Conductor[] => {
  return defaultConductorsData.map((conductorData, index) => ({
    id: (Date.now() + index).toString(),
    name: conductorData.name,
    cedula: conductorData.cedula,
    placa: conductorData.placa,
    area: conductorData.area,
    ruta: conductorData.ruta,
    createdAt: new Date().toISOString()
  }));
};