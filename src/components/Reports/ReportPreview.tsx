import React, { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, Camera } from 'lucide-react';
import { Trip, Passenger, Conductor, Signature } from '../../types';
import { storage } from '../../utils/storage';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportPreviewProps {
  trips: Trip[];
  passengers: Passenger[];
  conductors: Conductor[];
  dateRange: string;
  onClose: () => void;
  mode?: 'pdf' | 'screenshot' | 'preview';
  defaultConductorId?: string;
  defaultDateISO?: string;
  isSingleConductorReport?: boolean;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ 
  trips, 
  passengers, 
  conductors, 
  dateRange, 
  onClose,
  mode = 'pdf',
  defaultConductorId,
  defaultDateISO,
  isSingleConductorReport = false
}) => {
  console.log("ReportPreview props:", { trips: trips.length, passengers: passengers.length, conductors: conductors.length, dateRange, mode, defaultConductorId, defaultDateISO });
  console.log("ReportPreview props:", { trips: trips.length, passengers: passengers.length, conductors: conductors.length, dateRange, mode, defaultConductorId, defaultDateISO });
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState({
    conductor: '',
    unidad: '',
    dia: '',
    mes: '',
    año: '',
    hora: '',
    ampm: { am: false, pm: false },
    passengerRows: []
  });

  useEffect(() => {
    setSignatures(storage.getSignatures());
    
    // Pre-llenar algunos datos si hay viajes
    if (trips.length > 0) {
      const firstTrip = trips[0];
      const conductor = conductors.find(c => c.id === firstTrip.conductorId);
      const tripDate = new Date(firstTrip.startTime);
      
      setReportData({
        conductor: conductor?.name || '',
        unidad: conductor?.placa || '',
        dia: format(tripDate, 'd'),
        mes: format(tripDate, 'M'),
        año: format(tripDate, 'yyyy'),
        hora: format(tripDate, 'HH:mm'),
        ampm: { 
          am: tripDate.getHours() < 12, 
          pm: tripDate.getHours() >= 12 
        }
      });
    } else {
      // Si no hay viajes, usar el conductor por defecto y la fecha actual (o provista)
      const now = defaultDateISO ? new Date(defaultDateISO) : new Date();
      const conductor = defaultConductorId
        ? conductors.find(c => c.id === defaultConductorId)
        : undefined;
      setReportData({
        conductor: conductor?.name || '',
        unidad: conductor?.placa || '',
        dia: format(now, 'd'),
        mes: format(now, 'M'),
        año: format(now, 'yyyy'),
        hora: format(now, 'HH:mm'),
        ampm: { am: now.getHours() < 12, pm: now.getHours() >= 12 }
      });
    }
    console.log("ReportPreview: reportData calculated:", reportData);
  }, [trips, conductors, defaultConductorId, defaultDateISO]);

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'am' || field === 'pm') {
      setReportData(prev => ({
        ...prev,
        ampm: { ...prev.ampm, [field]: value }
      }));
    } else {
      setReportData(prev => ({ ...prev, [field]: value }));
    }
  };

  const shareViaWhatsApp = async () => {
    setIsSharing(true);
    try {
      const pdfBlob = await downloadPDFStructured(true); // Generate PDF as blob
      if (pdfBlob && navigator.share) {
        const pdfFile = new File([pdfBlob], `reporte-viaje.pdf`, { type: 'application/pdf' });
        await navigator.share({
          files: [pdfFile],
          title: 'Reporte de Viaje',
          text: `Reporte de viaje para ${reportData.conductor}`,
        });
      } else {
        alert('La función de compartir no está disponible en este navegador o el PDF no pudo ser generado.');
      }
    } catch (error) {
      console.error("Error al compartir por WhatsApp:", error);
      alert('Hubo un error al intentar compartir el reporte.');
    } finally {
      setIsSharing(false);
    }
  };

  const downloadPDFFromHTML = async () => {
    // Deprecated in favor of programmatic PDF to avoid blank renders
    return downloadPDFStructured();
  };
    
  const downloadPDFStructured = async (returnAsBlob = false) => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let y = margin;

      const loadImageAsDataUrl = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              resolve(dataUrl);
            } catch {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      // Intentar primero local; si falla, fallback remoto (evita CORS en local)
      const leftLogoUrl = (await fetch('/left.png').then(r => r.ok ? '/left.png' : Promise.reject()).catch(() => 'https://www.webcincodev.com/blog/wp-content/uploads/2025/08/Captura-de-pantalla-2025-08-20-191158.png')) as string;
      const rightLogoUrl = (await fetch('/right.png').then(r => r.ok ? '/right.png' : Promise.reject()).catch(() => 'https://www.webcincodev.com/blog/wp-content/uploads/2025/08/Diseno-sin-titulo-27.png')) as string;
      const [leftLogo, rightLogo] = await Promise.all([
        loadImageAsDataUrl(leftLogoUrl),
        loadImageAsDataUrl(rightLogoUrl)
      ]);

      // Draw outer border like the sample
      doc.setDrawColor(0);
      doc.setLineWidth(0.4);
      doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

      // Header helper matching the sample
      const drawHeader = (withMeta: boolean) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        const headerHeight = 16; // slightly taller to avoid touching lines
        const leftLogoHeight = 15;
        const leftLogoWidth = 50;
        const rightLogoHeight = 15;
        const rightLogoWidth = 20;
        if (leftLogo) {
          doc.addImage(leftLogo, 'PNG', margin + 2, y + 2, leftLogoWidth, leftLogoHeight);
        }
        if (rightLogo) {
          doc.addImage(rightLogo, 'PNG', pageWidth - margin - rightLogoWidth - 2, y + 2, rightLogoWidth, rightLogoHeight);
        }
        // Title perfectly centered between logos
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('REPORTE DE VIAJES DIARIOS', pageWidth / 2, y + 9, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setFontSize(7);
        doc.text('RIF: J-50014920-4', pageWidth - margin - rightLogoWidth - 2 + rightLogoWidth / 2, y + rightLogoHeight + 3, { align: 'center' });
        // AREA box under title (left)
        const areaY = y + headerHeight;
        const areaW = 55;
        doc.setFont('helvetica', 'bold');
        doc.rect(margin + 2, areaY + 2, areaW, 6.5);
        doc.text('AREA', margin + 2 + areaW / 2, areaY + 6.3, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.rect(margin + 2, areaY + 8, areaW, 6.5);
        doc.text('Bajo Grande', margin + 2 + areaW / 2, areaY + 12.4, { align: 'center' });
        doc.setFontSize(10);
        y = areaY + 14;
        if (withMeta) {
          // Conductor / Unidad row
          const metaLeft = margin + 2;
          const metaRight = pageWidth - margin - 2;
          const rowH = 7; // more height to avoid line overlap
          doc.setFont('helvetica', 'bold');
          const rowY1 = y;
          const leftW = (metaRight - metaLeft) * 0.7;
          const rightW = (metaRight - metaLeft) * 0.3;
          doc.rect(metaLeft, rowY1, leftW, rowH);
          doc.text('CONDUCTOR:', metaLeft + 2, rowY1 + 4.6);
          doc.rect(metaLeft + leftW, rowY1, rightW, rowH);
          doc.text('UNIDAD:', metaLeft + leftW + 2, rowY1 + 4.6);
          // Values
          doc.setFont('helvetica', 'normal');
          // place values with safe padding from borders
          doc.text(String(reportData.conductor || ''), metaLeft + 28, rowY1 + 4.6);
          doc.text(String(reportData.unidad || ''), metaLeft + leftW + 22, rowY1 + 4.6);
          y += rowH;
          // DIA MES AÑO HORA AM PM row - widen cells and increase height for clarity
          const diaW = 16, mesW = 16, anoW = 18, horaW = 30, ampmW = 30;
          const rowY2 = y;
          const rowH2 = rowH + 2;
          // Labels
          doc.setFontSize(9);
          doc.rect(metaLeft, rowY2, diaW, rowH2); doc.text('DIA', metaLeft + diaW / 2, rowY2 + 4.6, { align: 'center' });
          doc.rect(metaLeft + diaW, rowY2, mesW, rowH2); doc.text('MES', metaLeft + diaW + mesW / 2, rowY2 + 4.6, { align: 'center' });
          doc.rect(metaLeft + diaW + mesW, rowY2, anoW, rowH2); doc.text('AÑO', metaLeft + diaW + mesW + anoW / 2, rowY2 + 4.6, { align: 'center' });
          doc.rect(metaLeft + diaW + mesW + anoW, rowY2, horaW, rowH2); doc.text('HORA', metaLeft + diaW + mesW + anoW + horaW / 2, rowY2 + 4.6, { align: 'center' });
          doc.rect(metaLeft + diaW + mesW + anoW + horaW, rowY2, ampmW, rowH2); doc.text('AM', metaLeft + diaW + mesW + anoW + horaW + ampmW / 2, rowY2 + 4.6, { align: 'center' });
          doc.rect(metaLeft + diaW + mesW + anoW + horaW + ampmW, rowY2, ampmW, rowH2); doc.text('PM', metaLeft + diaW + mesW + anoW + horaW + ampmW + ampmW / 2, rowY2 + 4.6, { align: 'center' });
          // Values centered and lowered a bit more (smaller numbers to avoid touching lines)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.6);
          const valY = rowY2 + 7.0;
          doc.text(String(reportData.dia || ''), metaLeft + diaW / 2, valY, { align: 'center' });
          doc.text(String(reportData.mes || ''), metaLeft + diaW + mesW / 2, valY, { align: 'center' });
          doc.text(String(reportData.año || ''), metaLeft + diaW + mesW + anoW / 2, valY, { align: 'center' });
          doc.text(String(reportData.hora || ''), metaLeft + diaW + mesW + anoW + horaW / 2, valY, { align: 'center' });
          if (reportData.ampm.am) doc.text('X', metaLeft + diaW + mesW + anoW + horaW + ampmW / 2, valY, { align: 'center' });
          if (reportData.ampm.pm) doc.text('X', metaLeft + diaW + mesW + anoW + horaW + ampmW + ampmW / 2, valY, { align: 'center' });
          y += rowH2 + 2;
        }
      };
      // First page header with meta
      drawHeader(true);

      // Add route to the PDF, with text wrapping
      if (trips.length > 0 && trips[0].ruta) {
        const trip = trips[0];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const routeText = `Ruta: ${trip.ruta}`;
        const availableWidth = pageWidth - margin * 2 - 4;
        const splitText = doc.splitTextToSize(routeText, availableWidth);
        
        y += 2; // Lower the text a bit
        doc.text(splitText, margin + 2, y);
        const textHeight = splitText.length * 4; // 4mm per line
        y += textHeight;
        y += 4; // Margin after text
      }


      // Table header (match image columns, total 190mm)
      const columns = [
        { key: 'num', title: 'N°', width: 10 },
        { key: 'nombre', title: 'NOMBRE Y APELLIDO', width: 78 },
        { key: 'cedula', title: 'NRO DE CEDULA', width: 35 },
        { key: 'gerencia', title: 'GERENCIA', width: 32 },
        { key: 'hora', title: 'HORA', width: 20 },
        { key: 'firma', title: 'FIRMA', width: 15 },
      ];
      const totalWidth = columns.reduce((s, c) => s + c.width, 0); // 190
      const startX = (pageWidth - totalWidth) / 2;

      // Header row helper
      const drawTableHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8); // slightly smaller to avoid touching borders
        let x = startX;
        const tableHeaderHeight = 7.5; // a bit taller for breathing room
        columns.forEach((c) => {
          doc.rect(x, y, c.width, tableHeaderHeight);
        // place text slightly lower and inset from left border
          doc.text(c.title, x + 1.2, y + 5.2);
          x += c.width;
        });
        y += tableHeaderHeight;
      };
      drawTableHeader();

      // Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const minRows = 20;
      const rows = Array.from({ length: Math.max(trips.length, minRows) }, (_, idx) => {
        const trip = trips[idx];
        if (!trip) {
          return {
            num: String(idx + 1),
            nombre: '',
            cedula: '',
            gerencia: '',
            hora: '',
            firma: '',
          };
        }
        const passenger = passengers.find(p => p.id === trip.passengerId);
        return {
          num: String(idx + 1),
          nombre: passenger?.name || trip.passengerName || '',
          cedula: passenger?.cedula || trip.passengerCedula || '',
          gerencia: passenger?.gerencia || '',
          hora: format(new Date(trip.startTime), 'HH:mm', { locale: es }),
          firma: '',
        };
      });

      const lineHeight = 4.5; // mm per line for ~9pt font

      const drawRow = (r: Record<string, string>) => {
        // Prepare wrapped text per column
        const wrappedPerColumn = columns.map(c => {
          const content = String(r[c.key as keyof typeof r] || '');
          return doc.splitTextToSize(content, c.width - 2);
        });
        const linesPerColumn = wrappedPerColumn.map(lines => Math.max(lines.length, 1));
        const rowHeight = Math.max(...linesPerColumn) * lineHeight + 3; // more padding

        // Reserve space for signatures on a page only if it's the last page
        const limit = pageHeight - margin - 10;

        // Page break if needed
        if (y + rowHeight > limit) {
          doc.addPage();
          y = margin;
          drawHeader(false);
          drawTableHeader();
          doc.setFont('helvetica', 'normal');
        }
        // Draw cells and text
        let cx = startX;
        columns.forEach((c, idxCol) => {
          doc.rect(cx, y, c.width, rowHeight);
          const lines = wrappedPerColumn[idxCol];
          let ty = y + 5.6; // lower text a bit to avoid borders
          lines.forEach(line => {
            doc.text(line, cx + 1.2, ty, { maxWidth: c.width - 2.4 });
            ty += lineHeight;
          });
          cx += c.width;
        });
        y += rowHeight;
      };

      const rowsPerPage = 20;
      let counter = 0;
      for (let i = 0; i < rows.length; i++) {
        drawRow(rows[i]);
        counter++;
        if (counter === rowsPerPage && i < rows.length - 1) {
          // New page after 26 rows, continue table
          doc.addPage();
          y = margin;
          drawHeader(false);
          drawTableHeader();
          doc.setFont('helvetica', 'normal');
          counter = 0;
        }
      }

      // Signatures: always placed at end of the CURRENT (last) page.
      if (y > pageHeight - 50) {
        doc.addPage();
        y = margin;
        drawHeader(false);
      }
      y = Math.max(y + 6, pageHeight - 50);
      const sigWidth = (pageWidth - margin * 2 - 10) / 2;
      const sigHeight = 28;
      const contratista = signatures.find(s => s.type === 'contratista');
      const corporacion = signatures.find(s => s.type === 'corporacion');

      // Contratista box
      doc.rect(margin, y, sigWidth, sigHeight);
      doc.setFont('helvetica', 'bold');
      doc.text('Verificado por: Contratista', margin + 2, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre: ${contratista?.name || 'LEOBALDO MORAN'}`, margin + 2, y + 12);
      doc.text(`CI: ${contratista?.ci || '12.380.111'}`, margin + 2, y + 18);
      doc.text(`Cargo: ${contratista?.cargo || 'SUPERVISOR DE OPERACIONES'}`, margin + 2, y + 24);

      // Corporación box
      const rightX = margin + sigWidth + 10;
      doc.rect(rightX, y, sigWidth, sigHeight);
      doc.setFont('helvetica', 'bold');
      doc.text('Verificado por: PETROBOSCAN S.A', rightX + 2, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nombre: ${corporacion?.name || 'ANGEL GONZALEZ'}`, rightX + 2, y + 12);
      doc.text(`CI: ${corporacion?.ci || '7.894.569'}`, rightX + 2, y + 18);
      doc.text(`Cargo: ${corporacion?.cargo || 'ANALISTA DE TRANSPORTE'}`, rightX + 2, y + 24);

      const pdfBlob = doc.output('blob');

      if (returnAsBlob) {
        return pdfBlob;
      }

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const fileName = `reporte_${reportData.conductor}_${reportData.dia}-${reportData.mes}-${reportData.año}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const captureScreenshot = async () => {
    setIsCapturingScreenshot(true);
    try {
      if (!reportRef.current) {
        alert('No se pudo capturar la pantalla');
        return;
      }

      // Crear un contenedor temporal para clonar el reporte
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = reportRef.current.offsetWidth + 'px';
      tempContainer.style.backgroundColor = 'white';
      document.body.appendChild(tempContainer);

      // Clonar el elemento del reporte
      const clonedElement = reportRef.current.cloneNode(true) as HTMLElement;
      
      // Copiar todos los estilos computados
      const computedStyles = window.getComputedStyle(reportRef.current);
      Array.from(computedStyles).forEach(prop => {
        clonedElement.style.setProperty(prop, computedStyles.getPropertyValue(prop), computedStyles.getPropertyPriority(prop));
      });

      // Aplicar estilos específicos para la captura
      clonedElement.style.setProperty('font-family', 'Arial, sans-serif', 'important');
      clonedElement.style.setProperty('color', '#000', 'important');
      clonedElement.style.setProperty('background-color', 'white', 'important');
      clonedElement.style.setProperty('border', '1px solid #000', 'important');
      clonedElement.style.setProperty('padding', '20px', 'important');
      clonedElement.style.setProperty('box-sizing', 'border-box', 'important');

      tempContainer.appendChild(clonedElement);

      // Esperar a que las imágenes se carguen
      const images = clonedElement.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            // Timeout de seguridad
            setTimeout(() => resolve(), 3000);
          }
        });
      }));

      // Capturar con html2canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        foreignObjectRendering: true,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          // Aplicar estilos al documento clonado
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * { 
              font-family: Arial, sans-serif !important; 
              color: #000 !important; 
              background-color: white !important;
            }
            .reporte-content { 
              font-family: Arial, sans-serif !important; 
              color: #111 !important; 
              font-size: 13px !important;
              line-height: 1.4 !important;
            }
            .reporte-table th, .reporte-table td { 
              border: 1px solid #000 !important; 
              padding: 6px !important; 
              font-size: 13px !important; 
              vertical-align: top !important;
            }
            .reporte-input, .reporte-textarea { 
              border: 1px solid #000 !important; 
              font-family: inherit !important; 
              font-size: 13px !important; 
              padding: 4px !important; 
              box-sizing: border-box !important;
              background: white !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      // Verificar que el canvas no esté vacío
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas vacío');
      }

      // Convertir a imagen y descargar
      const link = document.createElement('a');
      link.download = `Captura_Reporte_${format(new Date(), 'ddMMyyyy_HHmm')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Limpiar
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error capturando pantalla:', error);
      alert('No se pudo capturar la pantalla del reporte');
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const contratistaSignature = signatures.find(s => s.type === 'contratista');
  const corporacionSignature = signatures.find(s => s.type === 'corporacion');

  // Preparar datos de pasajeros para mostrar en la tabla
  const passengerRows = Array.from({ length: 20 }, (_, index) => {
    const trip = trips[index];
    if (trip) {
      const passenger = passengers.find(p => p.id === trip.passengerId);
      return {
        nombre: passenger?.name || trip.passengerName || '',
        cedula: passenger?.cedula || trip.passengerCedula || '',
        gerencia: passenger?.gerencia || '',
        ruta: trip.ruta || '',
        horaSalida: format(new Date(trip.startTime), 'HH:mm', { locale: es }),
        horaLlegada: trip.endTime ? format(new Date(trip.endTime), 'HH:mm', { locale: es }) : ''
      };
    }
    return { nombre: '', cedula: '', gerencia: '', horaSalida: '', horaLlegada: '' };
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col modal-container">
        {/* Header del modal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Vista Previa del Reporte</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Contenido del reporte */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-6 min-h-[400px]" ref={reportRef}>
            <style dangerouslySetInnerHTML={{
              __html: `
                .reporte-content { 
                  font-family: Arial, sans-serif; 
                  color: #111; 
                  font-size: 13px;
                  line-height: 1.4;
                }
                .reporte-header { 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  margin-bottom: 20px; 
                }
                .reporte-header img { 
                  object-fit: contain;
                }
                .logo-left img {
                  width: auto;
                  height: auto;
                  max-width: 200px;
                  max-height: 80px;
                }
                .logo-right img {
                  width: auto;
                  height: auto;
                  max-width: 100px;
                  max-height: 80px;
                }
                .logo-left, .logo-right {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  min-width: 100px;
                }
                .rif-text {
                  font-size: 7px;
                  font-weight: bold;
                  margin-top: 2px;
                  text-align: center;
                  line-height: 1.0;
                  max-width: 60px;
                  word-wrap: break-word;
                  overflow: hidden;
                  white-space: nowrap;
                  text-overflow: ellipsis;
                }
                .reporte-header .title { 
                  text-align: center; 
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                }
                .reporte-header h1 { 
                  font-size: 22px; 
                  margin: 0; 
                  font-weight: bold;
                }
                .reporte-header .meta { 
                  margin-top: 6px; 
                  font-size: 14px; 
                }
                .reporte-table { 
                  border-collapse: collapse; 
                  width: 100%; 
                  margin: 15px 0; 
                  font-size: 13px;
                }
                .reporte-table th, .reporte-table td { 
                  border: 1px solid #000; 
                  padding: 6px; 
                  font-size: 13px; 
                  vertical-align: top;
                }
                .reporte-table th { 
                  background: #f0f0f0; 
                  text-align: center; 
                  font-weight: bold;
                }
        .reporte-input, .reporte-textarea { 
          width: 100%; 
          border: 1px solid #000; 
          font-family: inherit; 
          font-size: 13px; 
          padding: 4px; 
          box-sizing: border-box;
          background: white;
          border-radius: 2px;
        }
                .reporte-input:focus, .reporte-textarea:focus { 
                  outline: 2px solid #4a90e2; 
                  background: #eef6ff; 
                }
                .signatures { 
                  display: flex; 
                  gap: 20px; 
                  margin-top: 20px; 
                }
                .sig { 
                  flex: 1; 
                  border: 1px solid #ccc; 
                  padding: 10px; 
                  border-radius: 6px; 
                }
                .sig strong { 
                  display: inline-block; 
                  width: 90px; 
                }
                .checkboxes { 
                  display: flex; 
                  gap: 12px; 
                  align-items: center; 
                }
                .checkboxes label { 
                  display: flex; 
                  align-items: center; 
                  gap: 4px; 
                }
                .checkboxes input[type="checkbox"] {
                  width: 16px;
                  height: 16px;
                }
                @media print {
                  .reporte-input, .reporte-textarea { 
                    border: 1px solid #000; 
                    background: white; 
                  }
                  .checkboxes input { 
                    transform: scale(1.2); 
                  }
                }
              `
            }} />
            
            <div className="reporte-content">
              <div className="mb-3 text-xs text-gray-600">
                Vista previa generada • Viajes en período: {trips.length}
              </div>
              <div className="reporte-header">
                <div className="logo-left">
                  <img
                    src="/left.png"
                    alt="Logo Izquierdo"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://www.webcincodev.com/blog/wp-content/uploads/2025/08/Captura-de-pantalla-2025-08-20-191158.png';
                    }}
                  />
                </div>
                <div className="title">
                  <h1>REPORTE DE VIAJES DIARIOS</h1>
                  <div className="meta">Área: Bajo Grande</div>
                </div>
                <div className="logo-right">
                  <img
                    src="/right.png"
                    alt="Logo Derecho"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://www.webcincodev.com/blog/wp-content/uploads/2025/08/Diseno-sin-titulo-27.png';
                    }}
                  />
                  <div className="rif-text">RIF: J-50014920-4</div>
                </div>
              </div>

              <table className="reporte-table">
                <tbody>
                  <tr>
                    <th style={{width:'18%'}}>Conductor</th>
                    <td>
                      <input 
                        type="text" 
                        className="reporte-input"
                        value={reportData.conductor}
                        onChange={(e) => handleInputChange('conductor', e.target.value)}
                        placeholder="Nombre del conductor"
                      />
                    </td>
                    <th style={{width:'12%'}}>Unidad</th>
                    <td>
                      <input 
                        type="text" 
                        className="reporte-input"
                        value={reportData.unidad}
                        onChange={(e) => handleInputChange('unidad', e.target.value)}
                        placeholder="Unidad"
                      />
                    </td>
                  </tr>
                  {trips.length > 0 && trips[0].ruta && (
                    <tr>
                      <th>Ruta</th>
                      <td colSpan={3}>
                        <input
                          type="text"
                          className="reporte-input"
                          value={trips[0].ruta}
                          readOnly
                        />
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th>Día</th>
                    <td>
                      <input 
                        type="number" 
                        className="reporte-input"
                        min="1" 
                        max="31"
                        value={reportData.dia}
                        onChange={(e) => handleInputChange('dia', e.target.value)}
                      />
                    </td>
                    <th>Mes</th>
                    <td>
                      <input 
                        type="number" 
                        className="reporte-input"
                        min="1" 
                        max="12"
                        value={reportData.mes}
                        onChange={(e) => handleInputChange('mes', e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>Año</th>
                    <td>
                      <input 
                        type="number" 
                        className="reporte-input"
                        min="2000" 
                        max="2100"
                        value={reportData.año}
                        onChange={(e) => handleInputChange('año', e.target.value)}
                      />
                    </td>
                    <th>Hora</th>
                    <td>
                      <input 
                        type="time" 
                        className="reporte-input"
                        value={reportData.hora}
                        onChange={(e) => handleInputChange('hora', e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>AM/PM</th>
                    <td colSpan={3}>
                      <div className="checkboxes">
                        <label>
                          <input 
                            type="checkbox" 
                            checked={reportData.ampm.am}
                            onChange={(e) => handleInputChange('am', e.target.checked)}
                          /> AM
                        </label>
                        <label>
                          <input 
                            type="checkbox" 
                            checked={reportData.ampm.pm}
                            onChange={(e) => handleInputChange('pm', e.target.checked)}
                          /> PM
                        </label>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="reporte-table-alt">
                <thead>
                  <tr>
                    <th style={{width: '25%'}}>Pasajero</th>
                    <th style={{width: '15%'}}>Cédula</th>
                    <th style={{width: '20%'}}>Gerencia</th>
                    <th style={{width: '20%'}}>Ruta</th>
                    <th style={{width: '10%'}}>H. Salida</th>
                    <th style={{width: '10%'}}>H. Llegada</th>
                  </tr>
                </thead>
                <tbody>
                  {passengerRows && passengerRows.map((row, index) => (
                    <tr key={index}>
                      <td><input type="text" className="reporte-input" value={row.name} onChange={(e) => handlePassengerRowChange(index, 'name', e.target.value)} /></td>
                      <td><input type="text" className="reporte-input" value={row.cedula} onChange={(e) => handlePassengerRowChange(index, 'cedula', e.target.value)} /></td>
                      <td><input type="text" className="reporte-input" value={row.gerencia} onChange={(e) => handlePassengerRowChange(index, 'gerencia', e.target.value)} /></td>
                      <td><input type="text" className="reporte-input" value={row.ruta} onChange={(e) => handlePassengerRowChange(index, 'ruta', e.target.value)} /></td>
                      <td><input type="text" className="reporte-input" value={row.horaSalida} onChange={(e) => handlePassengerRowChange(index, 'horaSalida', e.target.value)} /></td>
                      <td><input type="text" className="reporte-input" value={row.horaLlegada} onChange={(e) => handlePassengerRowChange(index, 'horaLlegada', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="signatures">
                <div className="sig">
                  <div><strong>Verificado por:</strong> Contratista</div>
                  <div><strong>Nombre:</strong> {contratistaSignature?.name || 'LEOBALDO MORAN'}</div>
                  <div><strong>CI:</strong> {contratistaSignature?.ci || '12.380.111'}</div>
                  <div><strong>Cargo:</strong> {contratistaSignature?.cargo || 'SUPERVISOR DE OPERACIONES'}</div>
                  <div><strong>Firma:</strong> ___________________________</div>
                </div>

                <div className="sig">
                  <div><strong>Verificado por:</strong> PETROBOSCAN S.A</div>
                  <div><strong>Nombre:</strong> {corporacionSignature?.name || 'ANGEL GONZALEZ'}</div>
                  <div><strong>CI:</strong> {corporacionSignature?.ci || '7.894.569'}</div>
                  <div><strong>Cargo:</strong> {corporacionSignature?.cargo || 'ANALISTA DE TRANSPORTE'}</div>
                  <div><strong>Firma:</strong> ___________________________</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="border-t border-gray-200 p-2 sm:p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-gray-600">
              <p>Vista previa del reporte de viajes diarios</p>
              <p className="text-xs">Los campos son editables para personalizar el reporte</p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
              >
                Cerrar
              </button>
              
              {mode === 'preview' && (
                <>
                  {isSingleConductorReport ? (
                    <button
                      onClick={shareViaWhatsApp}
                      disabled={isSharing}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{isSharing ? 'Compartiendo...' : 'Compartir por WhatsApp'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={captureScreenshot}
                      disabled={isCapturingScreenshot}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{isCapturingScreenshot ? 'Capturando...' : 'Capturar Pantalla'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => downloadPDFStructured(false)}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">{isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
                  </button>
                </>
              )}
              
              {mode === 'pdf' && (
              <button
                onClick={downloadPDFFromHTML}
                disabled={isGeneratingPDF}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">{isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}</span>
              </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;