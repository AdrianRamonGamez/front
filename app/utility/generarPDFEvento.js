import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Genera un código QR según el tipo de usuario
 * @param {number} eventoId - ID del evento
 * @param {string} tipoUsuario - Tipo de usuario (alumno, familia, profesor, tutor, agente, acompañante, profesor_nativo)
 * @returns {Promise<string>} - URL del QR generado como data URL
 */
const generarQRPorTipoUsuario = async (eventoId, tipoUsuario) => {
    // URLs diferentes según el tipo de usuario
    const url = {
        normal: `${process.env.NEXT_PUBLIC_ENTORNO === 'LOCAL'
            ? "http://localhost:3000"
            : "https://dev.cenathalie.com"}/auth/login#`,
        encriptado: `email=${process.env.NEXT_PUBLIC_LOGIN_EMAIL}&password=${process.env.NEXT_PUBLIC_LOGIN_PASS}&evento_id=${eventoId}`
    };
    switch (tipoUsuario.toLowerCase()) {
        case 'alumno':
            url.encriptado += `&tipo=Alumno&rol=Alumno / Tutor`;
            break;
        case 'familia acogida':
            url.encriptado += `&tipo=Familia acogida&rol=Familia Acogida`;
            break;
        case 'profesor':
            url.encriptado += `&tipo=Profesor&rol=Profesor`;
            break;
        case 'profesor nativo':
            url.encriptado += `&tipo=Profesor nativo&rol=Profesor nativo`;
            break;
        case 'tutor':
            url.encriptado += `&tipo=Tutor&rol=Alumno / Tutor`;
            break;
        case 'agente':
            url.encriptado += `&tipo=Agente&rol=Agente`;
            break;
        case 'acompanyante':
            url.encriptado += `&tipo=Acompañante&rol=Acompañante`;
            break;
        case 'centro escolar':
            url.encriptado += `&tipo=Centro escolar&rol=Centro escolar`;
            break;
    }
    const urlEncriptado = `${url.normal}${btoa(url.encriptado)}`;
    try {
        const qrDataUrl = await QRCode.toDataURL(urlEncriptado, {
            errorCorrectionLevel: 'H',
            quality: 0.95,
            margin: 1,
            scale: 4,
            color: {
                dark: "#000000",
                light: "#FFFFFF"
            }
        });
        return qrDataUrl;
    } catch (err) {
        console.error('Error generando QR Code:', err);
        return null;
    }
};

/**
 * Formatea una fecha para mostrar en el PDF
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada (DD/MM/YYYY)
 */
const formatearFecha = (fecha) => {
    if (!fecha) return 'No especificada';
    const date = new Date(fecha);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
};

/**
 * Genera un PDF con toda la información del evento
 * @param {Object} evento - Objeto del evento con toda su información
 * @param {Object} datosAdicionales - Datos adicionales del evento (programa, tipo, centro escolar, empresa, notaLegal, etc.)
 * @param {string} tipoUsuarioQR - Tipo de usuario para generar el QR (único)
 * @returns {Promise<void>}
 */
export const generarPDFEvento = async (evento, datosAdicionales = {}, tipoUsuarioQR = 'alumno') => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Configuración de colores
    const primaryColor = [219, 51, 110]; // #db336e - color del proyecto
    const secondaryColor = [100, 100, 100];
    const lightGray = [240, 240, 240];

    // Función auxiliar para añadir nueva página si es necesario
    const checkNewPage = (neededSpace = 20) => {
        if (yPos + neededSpace > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };

    // ENCABEZADO
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const nombreEmpresa = datosAdicionales.empresa?.nombre || 'NATHALIE LANGUAGE EXPERIENCES';
    doc.text(nombreEmpresa, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Información del Evento', pageWidth / 2, 25, { align: 'center' });

    yPos = 45;

    // INFORMACIÓN GENERAL DEL EVENTO
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('INFORMACIÓN GENERAL', margin, yPos);
    yPos += 8;

    // Datos principales
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');

    const infoPrincipal = [
        ['Código:', evento.codigo || 'No especificado'],
        ['Programa:', datosAdicionales.programa || 'No especificado'],
        ['Tipo de Evento:', datosAdicionales.tipoEvento || 'No especificado'],
        ['Centro Escolar:', datosAdicionales.centroEscolar || 'No especificado'],
        ['Capacidad:', evento.capacidad ? `${evento.capacidad} estudiantes` : 'No especificada'],
        ['Nivel de Idioma:', evento.nombre_nivel_idioma || 'No especificado']
    ];

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: infoPrincipal,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 2
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45 },
            1: { cellWidth: 'auto' }
        },
        didParseCell: function (data) {
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.textColor = primaryColor;
                } else {
                    data.cell.styles.textColor = secondaryColor;
                }
            }
        },
        margin: { left: margin }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // DESCRIPCIÓN
    if (evento.descripcion) {
        checkNewPage(30);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('DESCRIPCIÓN', margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...secondaryColor);
        const descripcionLineas = doc.splitTextToSize(evento.descripcion, pageWidth - 2 * margin);
        doc.text(descripcionLineas, margin, yPos);
        yPos += descripcionLineas.length * 5 + 10;
    }

    // FECHAS DEL EVENTO
    checkNewPage(40);
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('FECHAS DEL EVENTO', margin + 3, yPos);
    yPos += 10;

    const fechasEvento = [
        ['Fecha de Inicio:', formatearFecha(evento.fecha_inicio)],
        ['Fecha de Fin:', formatearFecha(evento.fecha_fin)],
        ['Inicio de Inscripción:', formatearFecha(evento.inscripcion_inicio)],
        ['Fin de Inscripción:', formatearFecha(evento.inscripcion_fin)]
    ];

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: fechasEvento,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 2
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 55 },
            1: { cellWidth: 'auto' }
        },
        didParseCell: function (data) {
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.textColor = primaryColor;
                } else {
                    data.cell.styles.textColor = secondaryColor;
                }
            }
        },
        margin: { left: margin }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // ACTIVIDADES
    if (datosAdicionales.actividades && datosAdicionales.actividades.length > 0) {
        checkNewPage(30);
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('ACTIVIDADES PLANIFICADAS', margin + 3, yPos);
        yPos += 10;

        const actividadesData = datosAdicionales.actividades
            .filter(act => act.nombre)
            .map(act => [
                act.nombre,
                formatearFecha(act.fechaInicio),
                act.horaInicio || '--',
                formatearFecha(act.fechaFin),
                act.horaFin || '--'
            ]);

        if (actividadesData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Actividad', 'Fecha Inicio', 'Hora', 'Fecha Fin', 'Hora']],
                body: actividadesData,
                theme: 'striped',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 60 },
                    1: { cellWidth: 28 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 20 }
                },
                margin: { left: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }
    }

    // AULAS
    if (datosAdicionales.aulas && datosAdicionales.aulas.length > 0) {
        checkNewPage(30);
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('AULAS', margin + 3, yPos);
        yPos += 10;

        const aulasData = datosAdicionales.aulas
            .filter(aula => aula.nombre)
            .map(aula => [
                aula.nombre,
                aula.capacidad || '--',
                aula.lugarAula || '--',
                `${formatearFecha(aula.fechaInicio)} ${aula.horaInicio || ''}`
            ]);

        if (aulasData.length > 0) {
            autoTable(doc, {
                startY: yPos,
                head: [['Aula', 'Capacidad', 'Lugar', 'Fecha/Hora Inicio']],
                body: aulasData,
                theme: 'striped',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3
                },
                margin: { left: margin }
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }
    }

    // COSTES
    checkNewPage(30);
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('INFORMACIÓN DE COSTES', margin + 3, yPos);
    yPos += 10;

    const costesInfo = [
        ['Coste de Alojamiento:', datosAdicionales.costeAlojamiento ? `${datosAdicionales.costeAlojamiento}€` : 'No especificado'],
        ['Costes de Gestión:', evento.costes_de_gestion ? `${evento.costes_de_gestion}€` : 'No especificado']
    ];

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: costesInfo,
        theme: 'plain',
        styles: {
            fontSize: 10,
            cellPadding: 2
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 'auto' }
        },
        didParseCell: function (data) {
            if (data.section === 'body') {
                if (data.column.index === 0) {
                    data.cell.styles.textColor = primaryColor;
                } else {
                    data.cell.styles.textColor = secondaryColor;
                }
            }
        },
        margin: { left: margin }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // CÓDIGO QR DE ACCESO
    checkNewPage(80);
    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CÓDIGO QR DE ACCESO', margin + 3, yPos);
    yPos += 15;

    // Generar un único QR según el tipo de usuario seleccionado
    const qrSize = 50;
    const qrDataUrl = await generarQRPorTipoUsuario(evento.id, tipoUsuarioQR);

    if (qrDataUrl) {
        // Centrar el QR en la página
        const xPos = (pageWidth - qrSize) / 2;

        // Dibujar QR
        doc.addImage(qrDataUrl, 'PNG', xPos, yPos, qrSize, qrSize);

        // Etiqueta del tipo de usuario
        doc.setFontSize(11);
        doc.setTextColor(...secondaryColor);
        doc.setFont('helvetica', 'bold');
        const tipoUsuarioLabel = `Acceso para: ${tipoUsuarioQR.toUpperCase().replace('_', ' ')}`;
        const labelWidth = doc.getTextWidth(tipoUsuarioLabel);
        doc.text(tipoUsuarioLabel, (pageWidth - labelWidth) / 2, yPos + qrSize + 8);

        yPos += qrSize + 20;
    }

    // PIE DE PÁGINA CON INFORMACIÓN DE CONTACTO
    doc.addPage();
    yPos = margin;

    doc.setFillColor(...primaryColor);
    doc.rect(0, yPos, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const razonSocial = datosAdicionales.razonSocial || 'Centro de Estudios Nathalie, S.L.';
    doc.text(razonSocial, pageWidth / 2, yPos + 10, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(nombreEmpresa, pageWidth / 2, yPos + 16, { align: 'center' });
    // const cif = datosAdicionales.cif || 'CIF B96902812';
    // const direccion = datosAdicionales.direccion || 'Carrer Nou, 6 - C.P. 46450 Benifaíó (Valencia)';
    // doc.text(`${cif} | ${direccion}`, pageWidth / 2, yPos + 21, { align: 'center' });
    // const licencia = datosAdicionales.licencia || 'Agencia Minorista CV-m1836-V';
    // doc.text(licencia, pageWidth / 2, yPos + 26, { align: 'center' });
    // const contacto = datosAdicionales.contacto || 'Email: info@cenathalie.com | Tel: +34 96 178 37 98';
    // doc.text(contacto, pageWidth / 2, yPos + 31, { align: 'center' });
    // const web = datosAdicionales.web || 'www.cenathalie.com';
    // doc.text(web, pageWidth / 2, yPos + 36, { align: 'center' });

    yPos += 50;

    // Información adicional
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    //doc.text('DATOS DE CONTACTO', margin, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    // const contactoInfo = [
    //     'MARIO MORATA y PATRICIA VILA',
    //     'Email: administracion@cenathalie.com',
    //     'Teléfono: 607 272 633 / 961 783 798',
    //     'Horario de atención: 10:00h - 14:00h / 15:30h - 18:00h'
    // ];

    // contactoInfo.forEach((info) => {
    //     doc.text(info, margin, yPos);
    //     yPos += 6;
    // });

    yPos += 10;

    // Nota legal
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    //const notaLegal = datosAdicionales.notaLegal || 'Este documento contiene información confidencial del evento. Para más información sobre condiciones generales, visite nuestra web: https://cenathalie.com/condiciones-generales/';
    //const notaLineas = doc.splitTextToSize(notaLegal, pageWidth - 2 * margin);
    //doc.text(notaLineas, margin, yPos);

    // Guardar el PDF
    const nombreArchivo = `Evento_${evento.codigo || evento.id}_${new Date().getTime()}.pdf`;
    doc.save(nombreArchivo);
};
