import { Passenger } from '../types';

export const defaultPassengersData = [
  { name: "LISBETH CELINA PIÑA MARIN", cedula: "13878642", gerencia: "AIT" },
  { name: "RAMIRO SEGUNDO MONTERO DIAZ", cedula: "13002493", gerencia: "AIT" },
  { name: "RICHARD ALEXANDER GALIZ RIVERO", cedula: "11479380", gerencia: "AIT" },
  { name: "MERVIN RICARDO GONZALEZ GONZALEZ", cedula: "16017790", gerencia: "AIT" },
  { name: "DULCE MARIA OSORIO MUÑOZ", cedula: "20750117", gerencia: "OPERACIONES DE PRODUCCION" },
  { name: "PEDRO JOSE GARCIA LOPEZ", cedula: "15748724", gerencia: "OPERACIONES DE PRODUCCION" },
  { name: "BRUNO BARTOLO DIAZ BARRETO", cedula: "9728324", gerencia: "OPERACIONES DE PRODUCCION" },
  { name: "NORIS BEATRIZ PEÑA AVENDAÑO", cedula: "19285320", gerencia: "OPERACIONES DE PRODUCCION" },
  { name: "MINORLYS DE LOS ANGELES ORTEGA VILLALOBOS", cedula: "17414583", gerencia: "MANTENIMIENTO" },
  { name: "REVILLA GIOVANNI", cedula: "7886902", gerencia: "MANTENIMIENTO" },
  { name: "EDUARDO ERNESTO SANTRICH URQUIJO", cedula: "9722931", gerencia: "MANTENIMIENTO" },
  { name: "JUNIOR MANUEL PACHECO FINOL", cedula: "15720360", gerencia: "MANTENIMIENTO" },
  { name: "INGRID COROMOTO ESPINOZA MORENO", cedula: "16986555", gerencia: "SERVICIOS GENERALES" },
  { name: "NELLY JULIO MERCADO", cedula: "11913305", gerencia: "SERVICIOS GENERALES" },
  { name: "MILYMAR DEL VALLE GARCIA BORREGO", cedula: "15523660", gerencia: "SEGURIDAD E HIGIENE OCUPACIONAL - AMBIENTE" },
  { name: "MARYCRUZ RAMOS DE VILCHEZ", cedula: "12714510", gerencia: "RECURSOS HUMANOS" },
  { name: "NORBERTO RAMON VILLALOBOS INCIARTE", cedula: "7785176", gerencia: "FACILIDADES" },
  { name: "JENNY CHIQUINQUIRA MORALES VILLALOBOS", cedula: "14833824", gerencia: "INGENIERIA DE PETROLEO" },
  { name: "HILARION RAUL PARIS AZUAJE", cedula: "14562124", gerencia: "PLANIFICACION" },
  { name: "ROMMEL ANTONIO WHILCHY MORALES", cedula: "6338873", gerencia: "ESTUDIOS INTEGRADOS" },
  { name: "LEAR ACOSTA DAVID RAMON", cedula: "17187391", gerencia: "POZOS" },
  { name: "MELISSA CAROLINA MEDINA", cedula: "14117940", gerencia: "FACILIDADES" },
  { name: "OSCAR ALBERTO VALBUENA PERDOMO", cedula: "9748877", gerencia: "OPERACIONES DE PRODUCCION" },
  { name: "ANGELA MARIA HERNANDEZ LUZARDO", cedula: "18063392", gerencia: "RECURSOS HUMANOS" },
  { name: "LUIS JOSE VARGAS PEÑA", cedula: "15305967", gerencia: "INGENIERIA DE PETROLEO" },
  { name: "FIDEL JOSE MONTILLA LEON", cedula: "23554147", gerencia: "INGENIERIA DE PETROLEO" },
  { name: "ZULIMA PATRICIA CAICEDO DE ALVAREZ", cedula: "23554148", gerencia: "SALUD" }, // Cambié la cédula duplicada
  { name: "ERENICE MAITHE POLANCO VARELA", cedula: "17834145", gerencia: "FINANZAS" },
  { name: "ANGEL MIGUEL SOTO BOHORQUEZ", cedula: "20508321", gerencia: "RECURSOS HUMANOS" },
  { name: "MAINERY NAVA", cedula: "23876264", gerencia: "CONTRATACION" },
  { name: "EUDIS ALEJANDRO QUERO CHOURIO", cedula: "19341251", gerencia: "MANTENIMIENTO" },
  { name: "ONEIDA JANETH LEON MONTES DE OCA", cedula: "10806897", gerencia: "ESTUDIOS INTEGRADOS" },
  { name: "GIL MARIA ELENA", cedula: "17393371", gerencia: "PLANIFICACION" }
];

export const generateDefaultPassengers = async (): Promise<Passenger[]> => {
  const { generateQRCode, QRData } = await import('./qr');
  const passengers: Passenger[] = [];
  
  for (let i = 0; i < defaultPassengersData.length; i++) {
    const passengerData = defaultPassengersData[i];
    
    try {
      const qrData: QRData = {
        cedula: passengerData.cedula,
        name: passengerData.name,
        gerencia: passengerData.gerencia,
        timestamp: new Date().toISOString()
      };
      
      const qrCode = await generateQRCode(qrData);
      
      const passenger: Passenger = {
        id: (Date.now() + i).toString(),
        name: passengerData.name,
        cedula: passengerData.cedula,
        gerencia: passengerData.gerencia,
        qrCode,
        createdAt: new Date().toISOString()
      };
      
      passengers.push(passenger);
    } catch (error) {
      console.error(`Error generando QR para ${passengerData.name}:`, error);
    }
  }
  
  return passengers;
};