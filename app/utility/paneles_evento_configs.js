// Archivo de configuraciones para diferentes paneles de eventos
import { getEventos, getVistaEventosRelaciones, getVistaEventosRelacionesCount } from "@/app/api-endpoints/evento";
import { getEventoAlumnoOtros, getEventoAlumnoOtrosCount } from "@/app/api-endpoints/evento_alumno_otros";
import { getEventoProfesor, getEventoProfesorCount } from "@/app/api-endpoints/evento_profesor";
import { getEventoAcompanyante, getEventoAcompanyanteCount } from "@/app/api-endpoints/evento_acompanyante";
import { getEventoTutor, getEventoTutorCount } from "@/app/api-endpoints/evento_tutor";

import { getAlumnos } from "@/app/api-endpoints/alumno";
import { getAlumnoExamenes } from "@/app/api-endpoints/alumno_examen";
import { getProfesores } from "@/app/api-endpoints/profesor";
import { getAcompanyantes } from "@/app/api-endpoints/acompanyante";
import { getTutores } from "@/app/api-endpoints/tutor";
import { getAgentes } from "@/app/api-endpoints/agente";
import { getFamiliasAcogida } from "@/app/api-endpoints/familia_acogida";
import { getUsuarios, getVistaAlumno } from "@/app/api-endpoints/usuario";
import { getExamenes } from "@/app/api-endpoints/examen";
import { getTiposProfesores } from "@/app/api-endpoints/tipo_profesor";
import EditarUsuario from "../(main)/usuarios/editar";

/**
 * Configuración para el panel de Alumnos en Eventos
 * Sistema limpio: alumno + evento_alumno_otros + nivel_idioma
 */
export const configAlumnos = {
  headerKey: "Alumnos",
  getRegistros: async (filtro, cambiosPendientes = null) => {

    // Parsear el filtro
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    // Extraer filtro de ids para casos de filtrado desde tutor (alumnos de un tutor específico)
    let id = where.id;
    if (!id && where.and && where.and.id) {
      id = where.and.id;
    }

    const empresaId = Number(localStorage.getItem('empresa'));

    try {
      //Obtener relaciones del evento con filtro de rol y estado
      const filtroRelaciones = {
        where: {
          eventoId: eventoId,
        }
      };

      // Agregar filtro de estado
      if (activoSn) {
        filtroRelaciones.where.activoSn = activoSn;
      }

      // Agregar filtro de ids
      if (id) {
        filtroRelaciones.where.alumnoId = id;
      }

      const relaciones = await getEventoAlumnoOtros(JSON.stringify(filtroRelaciones));

      if (relaciones.length === 0 && cambiosPendientes?.alumnos?.altas?.length === 0
        && cambiosPendientes?.alumnos?.bajas?.length === 0) return [];

      //Obtener datos de los alumnos
      const alumnoIds = relaciones.map(rel => rel.alumnoId);

      const filtroAlumnos = {
        where: {
          id: { inq: alumnoIds },
          empresaId: empresaId
        }
      };


      const alumnos = await getAlumnos(JSON.stringify(filtroAlumnos));


      //Combinar datos (solo los que tienen relación en el evento)
      const eventoIdNum = Number(eventoId);
      const resultado = alumnos
        .filter(alumno => relaciones.some(rel => rel.alumnoId === alumno.id))
        .map(alumno => {
          const relacion = relaciones.find(rel => rel.alumnoId === alumno.id);
          return {
            ...alumno,
            relacionId: relacion.id,
            usuario_id: alumno.usuario_id,
            evento_id: eventoId,
            eventoId: Number.isFinite(eventoIdNum) ? eventoIdNum : null,
            activo_sn: relacion.activoSn,
            nivel_idioma_id: relacion.nivelIdiomaId,
            companero_id: relacion.companeroId,
            examenId: null,
          };
        });

      let resultadoConNota = resultado;
      let examenIdEvento = null;
      // Obtener las notas de la prueba de nivel por evento para cada alumno
      try {
        const eventos = await getEventos(JSON.stringify({
          where: { id: Number(eventoId) },
          limit: 1
        }));
        const evento = eventos?.[0] || null;
        examenIdEvento = Number(evento?.examenId ?? evento?.examen_id);
        const nombreExamenEvento = String(
          evento?.nombreNivelIdioma ?? evento?.nombre_nivel_idioma ?? ""
        ).trim();
        const empresaEventoId = Number(localStorage.getItem("empresa"));

        if ((!Number.isFinite(examenIdEvento) || examenIdEvento <= 0) &&
          nombreExamenEvento.length > 0 &&
          Number.isFinite(empresaEventoId) &&
          empresaEventoId > 0) {
          const examenes = await getExamenes(JSON.stringify({
            where: {
              empresaId: empresaEventoId,
              nombre: nombreExamenEvento
            },
            limit: 1
          }));
          examenIdEvento = Number(examenes?.[0]?.id);
        }

        if (
          Number.isFinite(examenIdEvento) &&
          examenIdEvento > 0 &&
          alumnoIds.length > 0
        ) {
          const whereExamenesAlumno = {
            examenId: examenIdEvento,
            alumnoId: { inq: alumnoIds }
          };
          if (Number.isFinite(eventoIdNum) && eventoIdNum > 0) {
            whereExamenesAlumno.eventoId = eventoIdNum;
          }

          const examenesAlumno = await getAlumnoExamenes(JSON.stringify({
            where: whereExamenesAlumno,
            order: "id DESC"
          }));

          const notaPorAlumnoId = {};
          for (const examenAlumno of examenesAlumno || []) {
            const alumnoIdExamen = Number(examenAlumno?.alumnoId);
            if (!Number.isFinite(alumnoIdExamen)) continue;
            if (notaPorAlumnoId[alumnoIdExamen] !== undefined) continue;
            const puntuacionFinal = examenAlumno?.puntuacionFinal;
            notaPorAlumnoId[alumnoIdExamen] =
              puntuacionFinal == null ? "" : puntuacionFinal;
          }

          resultadoConNota = resultado.map((alumno) => {
            const notaAlumno = notaPorAlumnoId[Number(alumno.id)];
            return {
              ...alumno,
              examenId: examenIdEvento,
              nota_prueba_nivel: notaAlumno == null ? "" : notaAlumno
            };
          });
        } else {
          resultadoConNota = resultado.map((alumno) => ({
            ...alumno,
            examenId: Number.isFinite(examenIdEvento) && examenIdEvento > 0 ? examenIdEvento : null,
          }));
        }
      } catch (error) {
        // No bloqueamos la tabla si falla la lectura de notas de examen.
      }

      // Combinar con cambios pendientes si existen
      let resultadoFinal = [...resultadoConNota];

      if (cambiosPendientes?.alumnos) {
        // Procesar altas pendientes
        for (const alta of cambiosPendientes.alumnos.altas || []) {
          if (alta.esReadmision && alta.relacionId) {
            // Es una readmisión: actualizar registro existente o agregarlo si no está
            const indice = resultadoFinal.findIndex(r => r.relacionId === alta.relacionId);
            if (indice >= 0) {
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'S',
                pendiente_alta: true,
                companero_id: alta.companyeroId || resultadoFinal[indice].companero_id,
                nivel_idioma_id: alta.nivelIdiomaId || resultadoFinal[indice].nivel_idioma_id
              };
            } else {
              // El registro no está en resultadoFinal (estamos en pestaña de Activos), consultar y agregar
              try {
                const filtroAlumno = JSON.stringify({
                  where: {
                    and: { id: alta.alumnoId }
                  }
                });
                const alumnosReadmision = await getAlumnos(filtroAlumno);
                if (alumnosReadmision.length > 0) {
                  const alumno = alumnosReadmision[0];
                  resultadoFinal.push({
                    ...alumno,
                    relacionId: alta.relacionId,
                    usuario_id: alumno.usuario_id,
                    evento_id: eventoId,
                    eventoId: Number.isFinite(eventoIdNum) ? eventoIdNum : null,
                    activo_sn: 'S',
                    nivel_idioma_id: alta.nivelIdiomaId || null,
                    companero_id: alta.companyeroId || null,
                    examenId: Number.isFinite(examenIdEvento) && examenIdEvento > 0 ? examenIdEvento : null,
                    nota_prueba_nivel: "",
                    pendiente_alta: true
                  });
                }
              } catch (error) {
                console.error('Error al obtener alumno para readmisión:', error);
              }
            }
          } else {
            // Es una nueva alta: agregar registro si no existe
            const yaExiste = resultadoFinal.some(r => r.id === alta.alumnoId);
            if (!yaExiste) {
              try {
                const filtroAlumno = JSON.stringify({
                  where: {
                    and: { id: alta.alumnoId }
                  }
                });
                const alumnosNuevos = await getAlumnos(filtroAlumno);
                if (alumnosNuevos.length > 0) {
                  const alumno = alumnosNuevos[0];
                  resultadoFinal.push({
                    ...alumno,
                    relacionId: null,
                    usuario_id: alumno.usuario_id,
                    evento_id: eventoId,
                    eventoId: Number.isFinite(eventoIdNum) ? eventoIdNum : null,
                    activo_sn: 'S',
                    nivel_idioma_id: alta.nivelIdiomaId || null,
                    companero_id: alta.companyeroId || null,
                    examenId: Number.isFinite(examenIdEvento) && examenIdEvento > 0 ? examenIdEvento : null,
                    nota_prueba_nivel: "",
                    pendiente_alta: true
                  });
                }
              } catch (error) {
                console.error('Error al obtener alumno pendiente:', error);
              }
            }
          }
        }

        // Procesar bajas pendientes
        for (const baja of cambiosPendientes.alumnos.bajas || []) {
          const indice = resultadoFinal.findIndex(r => r.relacionId === baja.relacionId);
          if (indice >= 0) {
            // Si es un alta pendiente que se da de baja, eliminarla completamente
            if (resultadoFinal[indice].pendiente_alta) {
              resultadoFinal.splice(indice, 1);
            } else {
              // Si ya existía, marcarlo como baja pendiente
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'N',
                pendiente_baja: true
              };
            }
          } else {
            // El registro no está en resultadoFinal (probablemente porque estamos en pestaña Bajas)
            // Necesitamos consultar los datos y agregarlo
            try {
              const filtroAlumno = JSON.stringify({
                where: {
                  and: { id: baja.alumnoId }
                }
              });
              const alumnosBaja = await getAlumnos(filtroAlumno);
              if (alumnosBaja.length > 0) {
                const alumno = alumnosBaja[0];
                resultadoFinal.push({
                  ...alumno,
                  relacionId: baja.relacionId,
                  usuario_id: alumno.usuario_id,
                  evento_id: eventoId,
                  eventoId: Number.isFinite(eventoIdNum) ? eventoIdNum : null,
                  activo_sn: 'N',
                  nivel_idioma_id: null,
                  companero_id: null,
                  examenId: Number.isFinite(examenIdEvento) && examenIdEvento > 0 ? examenIdEvento : null,
                  nota_prueba_nivel: "",
                  pendiente_baja: true
                });
              }
            } catch (error) {
              console.error('Error al obtener alumno para baja pendiente:', error);
            }
          }
        }
      }

      // Filtrar según activo_sn si se especificó en el filtro
      if (activoSn) {
        resultadoFinal = resultadoFinal.filter(r => r.activo_sn === activoSn);
      }

      return resultadoFinal;

    } catch (error) {
      return [];
    }
  },
  getRegistrosCount: async (filtro) => {
    const where = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    // Extraer filtro de ids para casos de filtrado desde tutor (alumnos de un tutor específico)
    let id = where.id;
    if (!id && where.and && where.and.id) {
      id = where.and.id;
    }

    if (!eventoId) return { count: 0 };

    const filtroRelaciones = {
      eventoId: eventoId
    };

    if (activoSn) {
      filtroRelaciones.activoSn = activoSn;
    }
    // Agregar filtro de ids
    if (id) {
      filtroRelaciones.alumnoId = id;
    }

    const result = await getEventoAlumnoOtrosCount(JSON.stringify(filtroRelaciones));
    return result;
  },
  controlador: "Eventos",
  seccion: "Usuarios",
  parametrosEliminar: ["usuario_id"],
  botones: [],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Alumno",
    rol: "Alumno / Tutor",
    crudDerivado: true
  },
  getIdEditar: (registro) => registro.usuario_id || registro.id,
  tipoUsuario: "Alumno",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "apellido1", headerKey: "Primer apellido", tipo: "string" },
    { campo: "apellido2", headerKey: "Segundo apellido", tipo: "string" },
    { campo: "nota_prueba_nivel", headerKey: "Nota prueba de nivel", tipo: "string" },
    {
      campo: "activo_sn",
      headerKey: "Dado de alta",
      tipo: "booleano"
    },
  ],
  mostrarTabs: true,
  campoEstado: "activo_sn"
};

/**
 * Configuración para el panel de Familias de Acogida
 * Usa la vista vista_evento_familias_acogida que ya tiene todos los datos unidos
 */
export const configFamiliasAcogida = {
  headerKey: "Familias de acogida",
  getRegistros: async (vista, filtro, cambiosPendientes = null) => {
    const registros = await getVistaEventosRelaciones(vista, filtro);

    // Extraer eventoId y activoSn para nuevas altas y filtrado
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles
    let activoSn = where.evento_familia_acogida_activo_sn;
    if (!activoSn && where.and && where.and.evento_familia_acogida_activo_sn) {
      activoSn = where.and.evento_familia_acogida_activo_sn;
    }

    const parsearFechaValida = (valorFecha) => {
      if (!valorFecha) return null;
      const fecha = new Date(valorFecha);
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    };

    const obtenerFechaMasReciente = (fechaAlta, fechaBaja) => {
      const fechaAltaParseada = parsearFechaValida(fechaAlta);
      const fechaBajaParseada = parsearFechaValida(fechaBaja);

      if (fechaAltaParseada && fechaBajaParseada) {
        return fechaAltaParseada >= fechaBajaParseada ? fechaAlta : fechaBaja;
      }
      return fechaAlta || fechaBaja || null;
    };

    let resultado = (registros || []).map((registro) => {
      const estadoRelacionSN = registro.evento_familia_acogida_activo_sn;
      const seleccionIaSN = registro.evento_familia_acogida_seleccionIA_sn;
      const fechaAlta = registro.evento_familia_acogida_fecha_acepta_evento;
      const fechaBaja = registro.evento_familia_acogida_fecha_rechaza_evento;

      let estadoFamilia = "";
      if (estadoRelacionSN === "S") {
        estadoFamilia = "Alta";
      } else if (estadoRelacionSN === "N") {
        estadoFamilia = "Baja";
      } else if (seleccionIaSN === "S") {
        estadoFamilia = "AltaIA";
      }

      let fechaCambioEstadoFamilia = null;
      if (estadoFamilia === "Alta" || estadoFamilia === "AltaIA") {
        fechaCambioEstadoFamilia = fechaAlta;
      } else if (estadoFamilia === "Baja") {
        fechaCambioEstadoFamilia = fechaBaja;
      }

      const fechaAltaBajaMasReciente = obtenerFechaMasReciente(fechaAlta, fechaBaja);

      return {
        ...registro,
        estado_familia: estadoFamilia,
        fecha_estado_familia: fechaCambioEstadoFamilia,
        fecha_alta_familia: fechaAlta,
        fecha_baja_familia: fechaBaja,
        fecha_alta_baja_familia: fechaAltaBajaMasReciente
      };
    });

    // Combinar con cambios pendientes si existen
    if (cambiosPendientes?.familias) {
      // Procesar altas pendientes
      for (const alta of cambiosPendientes.familias.altas || []) {
        if (alta.esReadmision || alta.relacionId) {
          // Es una readmisión: actualizar registro existente o agregarlo si no está
          const indice = resultado.findIndex(r => r.evento_familia_acogida_id === alta.relacionId);
          if (indice >= 0) {
            const fechaAhoraIso = new Date().toISOString();
            const nuevoEstado = alta.esModoAltaIa ? "AltaIA" : "Alta";
            resultado[indice] = {
              ...resultado[indice],
              evento_familia_acogida_activo_sn: alta.esModoAltaIa ? null : 'S',
              evento_familia_acogida_seleccionIA_sn: 'S',
              evento_familia_acogida_fecha_acepta_evento: fechaAhoraIso,
              evento_familia_acogida_fecha_rechaza_evento: null,
              estado_familia: nuevoEstado,
              fecha_estado_familia: fechaAhoraIso,
              fecha_alta_familia: fechaAhoraIso,
              fecha_baja_familia: null,
              fecha_alta_baja_familia: fechaAhoraIso,
              pendiente_alta: true
            };
          } else {
            // El registro no está en resultado (estamos en pestaña de Activos), consultar y agregar
            try {
              const familiasReadmision = await getFamiliasAcogida(JSON.stringify({
                where: { and: { id: alta.familiaId } }
              }));
              if (familiasReadmision.length > 0) {
                const familia = familiasReadmision[0];
                const usuarioIdFamilia = familia.usuarioId || familia.usuario_id;
                const nombrePendiente = String(alta?.nombre || "").trim();

                let nombreFamilia = nombrePendiente || `Familia ${familia.id}`;
                if (!nombrePendiente && usuarioIdFamilia) {
                  try {
                    const usuariosFamilia = await getUsuarios(JSON.stringify({
                      where: { id: usuarioIdFamilia }
                    }));
                    if (usuariosFamilia.length > 0) {
                      nombreFamilia = usuariosFamilia[0].nombre || nombreFamilia;
                    }
                  } catch (error) {
                    console.error('Error al obtener usuario de familia:', error);
                  }
                }

                const fechaAhoraIso = new Date().toISOString();
                const nuevoEstado = alta.esModoAltaIa ? "AltaIA" : "Alta";

                resultado.push({
                  familia_acogida_id: familia.id,
                  usuario_id: usuarioIdFamilia,
                  nombre: nombreFamilia,
                  evento_id: eventoId,
                  evento_familia_acogida_id: alta.relacionId,
                  evento_familia_acogida_activo_sn: alta.esModoAltaIa ? null : 'S',
                  evento_familia_acogida_seleccionIA_sn: 'S',
                  evento_familia_acogida_fecha_acepta_evento: fechaAhoraIso,
                  evento_familia_acogida_fecha_rechaza_evento: null,
                  estado_familia: nuevoEstado,
                  fecha_estado_familia: fechaAhoraIso,
                  fecha_alta_familia: fechaAhoraIso,
                  fecha_baja_familia: null,
                  fecha_alta_baja_familia: fechaAhoraIso,
                  pendiente_alta: true
                });
              }
            } catch (error) {
              console.error('Error al obtener familia para readmisión:', error);
            }
          }
        } else {
          // Es una nueva alta: consultar datos de la familia y agregarla
          const yaExiste = resultado.some(r => r.familia_acogida_id === alta.familiaId);
          if (!yaExiste) {
            try {
              const familiasNuevas = await getFamiliasAcogida(JSON.stringify({
                where: { and: { id: alta.familiaId } }
              }));

              if (familiasNuevas.length > 0) {
                const familia = familiasNuevas[0];
                const usuarioIdFamilia = familia.usuarioId || familia.usuario_id;
                const nombrePendiente = String(alta?.nombre || "").trim();

                // Obtener el nombre del usuario
                let nombreFamilia = nombrePendiente || `Familia ${familia.id}`;
                if (!nombrePendiente && usuarioIdFamilia) {
                  try {
                    const usuariosFamilia = await getUsuarios(JSON.stringify({
                      where: { id: usuarioIdFamilia }
                    }));
                    if (usuariosFamilia.length > 0) {
                      nombreFamilia = usuariosFamilia[0].nombre || nombreFamilia;
                    }
                  } catch (error) {
                    console.error('Error al obtener usuario de familia:', error);
                  }
                }

                const fechaAhoraIso = new Date().toISOString();
                const nuevoEstado = alta.esModoAltaIa ? "AltaIA" : "Alta";

                resultado.push({
                  familia_acogida_id: familia.id,
                  usuario_id: usuarioIdFamilia,
                  nombre: nombreFamilia,
                  evento_id: eventoId,
                  evento_familia_acogida_id: null,
                  evento_familia_acogida_activo_sn: alta.esModoAltaIa ? null : 'S',
                  evento_familia_acogida_seleccionIA_sn: 'S',
                  evento_familia_acogida_fecha_acepta_evento: fechaAhoraIso,
                  evento_familia_acogida_fecha_rechaza_evento: null,
                  estado_familia: nuevoEstado,
                  fecha_estado_familia: fechaAhoraIso,
                  fecha_alta_familia: fechaAhoraIso,
                  fecha_baja_familia: null,
                  fecha_alta_baja_familia: fechaAhoraIso,
                  pendiente_alta: true
                });
              }
            } catch (error) {
              console.error('Error al obtener familia pendiente:', error);
            }
          }
        }
      }

      // Procesar bajas pendientes
      for (const baja of cambiosPendientes.familias.bajas || []) {
        const indice = resultado.findIndex(r => r.evento_familia_acogida_id === baja.relacionId);
        if (indice >= 0) {
          // Si es un alta pendiente que se da de baja, eliminarla completamente
          if (resultado[indice].pendiente_alta) {
            resultado.splice(indice, 1);
          } else {
            // Si ya existía, marcarlo como baja pendiente
            const fechaAhoraIso = new Date().toISOString();
            resultado[indice] = {
              ...resultado[indice],
              evento_familia_acogida_activo_sn: 'N',
              evento_familia_acogida_fecha_rechaza_evento: fechaAhoraIso,
              estado_familia: 'Baja',
              fecha_estado_familia: fechaAhoraIso,
              fecha_baja_familia: fechaAhoraIso,
              fecha_alta_baja_familia: fechaAhoraIso,
              pendiente_baja: true
            };
          }
        } else {
          // El registro no está en resultado, consultar datos y agregarlo
          try {
            const familiasBaja = await getFamiliasAcogida(JSON.stringify({
              where: { and: { id: baja.familiaId } }
            }));
            if (familiasBaja.length > 0) {
              const familia = familiasBaja[0];
              const usuarioIdFamilia = familia.usuarioId || familia.usuario_id;

              let nombreFamilia = `Familia ${familia.id}`;
              if (usuarioIdFamilia) {
                try {
                  const usuariosFamilia = await getUsuarios(JSON.stringify({
                    where: { id: usuarioIdFamilia }
                  }));
                  if (usuariosFamilia.length > 0) {
                    nombreFamilia = usuariosFamilia[0].nombre || nombreFamilia;
                  }
                } catch (error) {
                  console.error('Error al obtener usuario de familia:', error);
                }
              }

              const fechaAhoraIso = new Date().toISOString();
              resultado.push({
                familia_acogida_id: familia.id,
                usuario_id: usuarioIdFamilia,
                nombre: nombreFamilia,
                evento_id: eventoId,
                evento_familia_acogida_id: baja.relacionId,
                evento_familia_acogida_activo_sn: 'N',
                evento_familia_acogida_seleccionIA_sn: null,
                evento_familia_acogida_fecha_acepta_evento: null,
                evento_familia_acogida_fecha_rechaza_evento: fechaAhoraIso,
                estado_familia: 'Baja',
                fecha_estado_familia: fechaAhoraIso,
                fecha_alta_familia: null,
                fecha_baja_familia: fechaAhoraIso,
                fecha_alta_baja_familia: fechaAhoraIso,
                pendiente_baja: true
              });
            }
          } catch (error) {
            console.error('Error al obtener familia para baja pendiente:', error);
          }
        }
      }
    }

    // Filtrar según activo_sn si se especificó en el filtro
    if (activoSn) {
      if (activoSn === 'S') {
        // Mostrar solo familias activas confirmadas.
        // Las altas IA (seleccionIA='S' y activo_sn null) se visualizan en "Todas".
        resultado = resultado.filter(r => r.evento_familia_acogida_activo_sn === 'S');
      } else if (activoSn === 'N') {
        // Mostrar solo familias de baja
        resultado = resultado.filter(r => r.evento_familia_acogida_activo_sn === 'N');
      }
    }

    return resultado;
  },
  getRegistrosCount: getVistaEventosRelacionesCount,
  controlador: "Eventos",
  seccion: "Usuarios",
  botones: ["email"],
  parametrosEliminar: ["usuario_id"],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Familia acogida",
    rol: "Familia Acogida",
    crudDerivado: true
  },
  getIdEditar: (registro) => registro.usuario_id || registro.id,
  tipoUsuario: "Familia acogida",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "estado_familia", headerKey: "Estado", tipo: "estado_familia" },
    {
      campo: "fecha_alta_baja_familia",
      headerKey: "Fecha Alta/baja",
      tipo: "fecha"
    },
  ],
  columnasPorTab: (tabIndex) => {
    const columnasBase = [
      { campo: "nombre", headerKey: "Nombre", tipo: "string" },
      { campo: "estado_familia", headerKey: "Estado", tipo: "estado_familia" }
    ];

    if (tabIndex === 0) {
      return [
        ...columnasBase,
        { campo: "fecha_alta_familia", headerKey: "Fecha alta", tipo: "fecha" }
      ];
    }

    if (tabIndex === 1) {
      return [
        ...columnasBase,
        { campo: "fecha_baja_familia", headerKey: "Fecha baja", tipo: "fecha" }
      ];
    }

    return [
      ...columnasBase,
      { campo: "fecha_alta_baja_familia", headerKey: "Fecha Alta/baja", tipo: "fecha" }
    ];
  },
  vista: "vista_evento_familias_acogida",
  mostrarTabs: true,
  campoEstado: "evento_familia_acogida_activo_sn"
};

/**
 * Configuración para el panel de Profesores
 */
export const configProfesores = {
  headerKey: "Profesores",
  getRegistros: async (filtro, cambiosPendientes = null) => {
    // Parsear el filtro
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    const empresaId = Number(localStorage.getItem('empresa'));

    try {
      // Obtener relaciones del evento con filtro de estado
      const filtroRelaciones = {
        where: {
          eventoId: eventoId
        }
      };

      // Agregar filtro de estado si existe
      if (activoSn) {
        filtroRelaciones.where.activoSn = activoSn;
      }

      const relaciones = await getEventoProfesor(JSON.stringify(filtroRelaciones));

      if (relaciones.length === 0 && cambiosPendientes?.profesores?.altas?.length === 0
        && cambiosPendientes?.profesores?.bajas?.length === 0) return [];

      // Obtener datos de los profesores
      const profesorIds = relaciones.map(rel => rel.profesorId);

      const filtroProfesores = {
        where: {
          id: { inq: profesorIds },
          empresa_id: empresaId
        }
      };

      const profesores = await getProfesores(JSON.stringify(filtroProfesores));

      // Obtener todos los tipos de profesores
      const tiposProfesores = await getTiposProfesores(JSON.stringify({
        where: {
          empresaId: empresaId
        }
      }));

      // Filtrar solo los tipos de profesores que NO sean nativos
      const tiposProfesoresNoNativosIds = tiposProfesores
        .filter(tipo => tipo.codigo !== 'nativo')
        .map(tipo => tipo.id);

      // Combinar datos y filtrar solo profesores no nativos
      const resultado = profesores
        .filter(profesor =>
          relaciones.some(rel => rel.profesorId === profesor.id) &&
          tiposProfesoresNoNativosIds.includes(profesor.tipo_profesor_id)
        )
        .map(profesor => {
          const relacion = relaciones.find(rel => rel.profesorId === profesor.id);
          return {
            ...profesor,
            relacionId: relacion.id,
            usuario_id: profesor.usuario_id,
            evento_id: eventoId,
            activo_sn: relacion.activoSn
          };
        });

      // Combinar con cambios pendientes si existen
      let resultadoFinal = [...resultado];

      if (cambiosPendientes?.profesores) {
        // Procesar altas pendientes
        for (const alta of cambiosPendientes.profesores.altas || []) {
          if (alta.esReadmision && alta.relacionId) {
            // Es una readmisión: actualizar registro existente o agregarlo si no está
            const indice = resultadoFinal.findIndex(r => r.relacionId === alta.relacionId);
            if (indice >= 0) {
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'S',
                pendiente_alta: true
              };
            } else {
              // El registro no está en resultadoFinal (estamos en pestaña de Activos), consultar y agregar
              try {
                const profesoresReadmision = await getProfesores(JSON.stringify({
                  where: { id: alta.profesorId }
                }));
                if (profesoresReadmision.length > 0) {
                  const profesor = profesoresReadmision[0];
                  // Verificar que sea NO nativo
                  if (tiposProfesoresNoNativosIds.includes(profesor.tipo_profesor_id)) {
                    resultadoFinal.push({
                      ...profesor,
                      relacionId: alta.relacionId,
                      usuario_id: profesor.usuario_id,
                      evento_id: eventoId,
                      activo_sn: 'S',
                      pendiente_alta: true
                    });
                  }
                }
              } catch (error) {
                console.error('Error al obtener profesor para readmisión:', error);
              }
            }
          } else {
            // Es una nueva alta: agregar registro si no existe
            const yaExiste = resultadoFinal.some(r => r.id === alta.profesorId);
            if (!yaExiste) {
              try {
                const profesoresNuevos = await getProfesores(JSON.stringify({
                  where: { and: { id: alta.profesorId } }
                }));
                if (profesoresNuevos.length > 0) {
                  const profesor = profesoresNuevos[0];
                  // Verificar que sea NO nativo
                  if (tiposProfesoresNoNativosIds.includes(profesor.tipo_profesor_id)) {
                    resultadoFinal.push({
                      ...profesor,
                      relacionId: null,
                      usuario_id: profesor.usuario_id,
                      evento_id: eventoId,
                      activo_sn: 'S',
                      pendiente_alta: true
                    });
                  }
                }
              } catch (error) {
                console.error('Error al obtener profesor pendiente:', error);
              }
            }
          }
        }

        // Procesar bajas pendientes
        for (const baja of cambiosPendientes.profesores.bajas || []) {
          const indice = resultadoFinal.findIndex(r => r.relacionId === baja.relacionId);
          if (indice >= 0) {
            // Si es un alta pendiente que se da de baja, eliminarla completamente
            if (resultadoFinal[indice].pendiente_alta) {
              resultadoFinal.splice(indice, 1);
            } else {
              // Si ya existía, marcarlo como baja pendiente
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'N',
                pendiente_baja: true
              };
            }
          } else {
            // El registro no está en resultadoFinal, consultar datos y agregarlo
            try {
              const profesoresBaja = await getProfesores(JSON.stringify({
                where: { and: { id: baja.profesorId } }
              }));
              if (profesoresBaja.length > 0) {
                const profesor = profesoresBaja[0];
                // Verificar que sea NO nativo
                if (tiposProfesoresNoNativosIds.includes(profesor.tipo_profesor_id)) {
                  resultadoFinal.push({
                    ...profesor,
                    relacionId: baja.relacionId,
                    usuario_id: profesor.usuario_id,
                    evento_id: eventoId,
                    activo_sn: 'N',
                    pendiente_baja: true
                  });
                }
              }
            } catch (error) {
              console.error('Error al obtener profesor para baja pendiente:', error);
            }
          }
        }
      }

      // Filtrar según activo_sn si se especificó en el filtro
      if (activoSn) {
        resultadoFinal = resultadoFinal.filter(r => r.activo_sn === activoSn);
      }

      return resultadoFinal;

    } catch (error) {
      console.error('Error en configProfesores.getRegistros:', error);
      return [];
    }
  },
  getRegistrosCount: async (filtro) => {
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;

    // Extraer eventoId y activoSn de la estructura correcta
    let eventoId = null;
    let activoSn = null;

    // Buscar en diferentes ubicaciones posibles
    if (filtroObj.and && filtroObj.and.evento_id) {
      eventoId = filtroObj.and.evento_id;
    }
    if (filtroObj.and && filtroObj.and.activo_sn) {
      activoSn = filtroObj.and.activo_sn;
    }

    // También buscar en where si existe
    const where = filtroObj.where || {};
    if (!eventoId && where.evento_id) {
      eventoId = where.evento_id;
    }
    if (!activoSn && where.activo_sn) {
      activoSn = where.activo_sn;
    }


    if (!eventoId) {
      return { count: 0 };
    }

    const filtroRelaciones = {
      eventoId: eventoId
    };

    // Solo agregar filtro de activo_sn si se especifica (para pestañas Activos/Bajas)
    // Si no se especifica, contar todos (pestaña Todas)
    if (activoSn) {
      filtroRelaciones.activoSn = activoSn;
    }

    // Como getEventoProfesorCount del backend tiene un bug, usamos getEventoProfesor y contamos manualmente
    try {
      const empresaId = Number(localStorage.getItem('empresa'));
      const registrosReales = await getEventoProfesor(JSON.stringify(filtroRelaciones));

      // Obtener todos los tipos de profesores
      const tiposProfesores = await getTiposProfesores(JSON.stringify({
        where: {
          empresaId: empresaId
        }
      }));

      // Filtrar solo los tipos de profesores que NO sean nativos
      const tiposProfesoresNoNativosIds = tiposProfesores
        .filter(tipo => tipo.codigo !== 'nativo')
        .map(tipo => tipo.id);

      // Obtener los profesores para filtrar por tipo
      const profesorIds = registrosReales.map(rel => rel.profesorId);
      const filtroProfesores = {
        where: {
          id: { inq: profesorIds },
          empresa_id: empresaId
        }
      };
      const profesores = await getProfesores(JSON.stringify(filtroProfesores));

      // Contar solo los profesores no nativos
      const countReal = { count: profesores.filter(profesor => tiposProfesoresNoNativosIds.includes(profesor.tipo_profesor_id)).length };
      return countReal;

    } catch (error) {
      return { count: 0 };
    }
  },
  controlador: "Eventos",
  seccion: "Usuarios",
  parametrosEliminar: ["usuario_id"],
  botones: [],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Profesor",
    rol: "Profesor",
    crudDerivado: true
  },
  getIdEditar: (registro) => registro.usuario_id || registro.id,
  tipoUsuario: "Profesor",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "apellido1", headerKey: "Primer apellido", tipo: "string" },
    { campo: "apellido2", headerKey: "Segundo apellido", tipo: "string" },

    {
      campo: "activo_sn",
      headerKey: "Dado de alta",
      tipo: "booleano"
    },
  ],
  mostrarTabs: true,
  campoEstado: "activo_sn"
};

/**
 * Configuración para el panel de Acompañantes en Eventos
 * Sistema limpio: acompanyante + evento_acompanyante
 */
export const configAcompanantes = {
  headerKey: "Acompañantes",
  getRegistros: async (filtro, cambiosPendientes = null) => {

    // Parsear el filtro
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }


    const empresaId = Number(localStorage.getItem('empresa'));

    try {
      //Obtener relaciones del evento con filtro de estado
      const filtroRelaciones = {
        where: {
          eventoId: eventoId
        }
      };

      // Agregar filtro de estado si existe
      if (activoSn) {
        filtroRelaciones.where.activoSn = activoSn;
      }


      const relaciones = await getEventoAcompanyante(JSON.stringify(filtroRelaciones));

      if (relaciones.length === 0 && cambiosPendientes?.acompanyantes?.altas?.length === 0
        && cambiosPendientes?.acompanyantes?.bajas?.length === 0) return [];

      //Obtener datos de los acompañantes
      const acompanyanteIds = relaciones.map(rel => rel.acompanyanteId);

      const filtroAcompanyantes = {
        where: {
          id: { inq: acompanyanteIds },
          empresa_id: empresaId
        }
      };


      const acompanyantes = await getAcompanyantes(JSON.stringify(filtroAcompanyantes));


      // Paso 3: Combinar datos (solo los que tienen relación en el evento)
      const resultado = acompanyantes
        .filter(acompanyante => relaciones.some(rel => rel.acompanyanteId === acompanyante.id))
        .map(acompanyante => {
          const relacion = relaciones.find(rel => rel.acompanyanteId === acompanyante.id);
          return {
            ...acompanyante,
            relacionId: relacion.id,
            usuario_id: acompanyante.usuario_id,
            evento_id: eventoId,
            activo_sn: relacion.activoSn
          };
        });

      // Combinar con cambios pendientes si existen
      let resultadoFinal = [...resultado];

      if (cambiosPendientes?.acompanyantes) {
        // Procesar altas pendientes
        for (const alta of cambiosPendientes.acompanyantes.altas || []) {
          if (alta.esReadmision && alta.relacionId) {
            // Es una readmisión: actualizar registro existente o agregarlo si no está
            const indice = resultadoFinal.findIndex(r => r.relacionId === alta.relacionId);
            if (indice >= 0) {
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'S',
                pendiente_alta: true
              };
            } else {
              // El registro no está en resultadoFinal (estamos en pestaña de Activos), consultar y agregar
              try {
                const acompanantesReadmision = await getAcompanyantes(JSON.stringify({
                  where: { id: alta.acompanyanteId }
                }));
                if (acompanantesReadmision.length > 0) {
                  const acompanyante = acompanantesReadmision[0];
                  resultadoFinal.push({
                    ...acompanyante,
                    relacionId: alta.relacionId,
                    usuario_id: acompanyante.usuario_id,
                    evento_id: eventoId,
                    activo_sn: 'S',
                    pendiente_alta: true
                  });
                }
              } catch (error) {
                console.error('Error al obtener acompañante para readmisión:', error);
              }
            }
          } else {
            // Es una nueva alta: agregar registro si no existe
            const yaExiste = resultadoFinal.some(r => r.id === alta.acompanyanteId);
            if (!yaExiste) {
              try {
                const acompanantesNuevos = await getAcompanyantes(JSON.stringify({
                  where: { and: { id: alta.acompanyanteId } }
                }));
                if (acompanantesNuevos.length > 0) {
                  const acompanyante = acompanantesNuevos[0];
                  resultadoFinal.push({
                    ...acompanyante,
                    relacionId: null,
                    usuario_id: acompanyante.usuario_id,
                    evento_id: eventoId,
                    activo_sn: 'S',
                    pendiente_alta: true
                  });
                }
              } catch (error) {
                console.error('Error al obtener acompañante pendiente:', error);
              }
            }
          }
        }

        // Procesar bajas pendientes
        for (const baja of cambiosPendientes.acompanyantes.bajas || []) {
          const indice = resultadoFinal.findIndex(r => r.relacionId === baja.relacionId);
          if (indice >= 0) {
            // Si es un alta pendiente que se da de baja, eliminarla completamente
            if (resultadoFinal[indice].pendiente_alta) {
              resultadoFinal.splice(indice, 1);
            } else {
              // Si ya existía, marcarlo como baja pendiente
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'N',
                pendiente_baja: true
              };
            }
          } else {
            // El registro no está en resultadoFinal, consultar datos y agregarlo
            try {
              const acompanyantesBaja = await getAcompanyantes(JSON.stringify({
                where: { and: { id: baja.acompanyanteId } }
              }));
              if (acompanyantesBaja.length > 0) {
                const acompanyante = acompanyantesBaja[0];
                resultadoFinal.push({
                  ...acompanyante,
                  relacionId: baja.relacionId,
                  usuario_id: acompanyante.usuario_id,
                  evento_id: eventoId,
                  activo_sn: 'N',
                  pendiente_baja: true
                });
              }
            } catch (error) {
              console.error('Error al obtener acompañante para baja pendiente:', error);
            }
          }
        }
      }

      // Filtrar según activo_sn si se especificó en el filtro
      if (activoSn) {
        resultadoFinal = resultadoFinal.filter(r => r.activo_sn === activoSn);
      }

      return resultadoFinal;

    } catch (error) {
      return [];
    }
  },
  getRegistrosCount: async (filtro) => {
    const where = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    if (!eventoId) return { count: 0 };

    const filtroRelaciones = {
      eventoId: eventoId
    };

    if (activoSn) {
      filtroRelaciones.activoSn = activoSn;
    }

    const result = await getEventoAcompanyanteCount(JSON.stringify(filtroRelaciones));
    return result;
  },
  controlador: "Eventos",
  seccion: "Usuarios",
  parametrosEliminar: ["usuario_id"],
  botones: [],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Acompañante",
    rol: "Acompañante",
    crudDerivado: true
  },
  getIdEditar: (registro) => registro.usuario_id || registro.id,
  tipoUsuario: "Acompañante",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "apellido1", headerKey: "Primer apellido", tipo: "string" },
    { campo: "apellido2", headerKey: "Segundo apellido", tipo: "string" },

    {
      campo: "activo_sn",
      headerKey: "Dado de alta",
      tipo: "booleano"
    },
  ],
  mostrarTabs: true,
  campoEstado: "activo_sn"
};

/**
 * Configuración para el panel de Profesores Nativos
 */
export const configProfesoresNativos = {
  headerKey: "Profesores Nativos",
  getRegistros: async (filtro, cambiosPendientes = null) => {
    // Parsear el filtro
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    const empresaId = Number(localStorage.getItem('empresa'));

    try {
      // Obtener relaciones del evento con filtro de estado
      const filtroRelaciones = {
        where: {
          eventoId: eventoId
        }
      };

      // Agregar filtro de estado
      if (activoSn) {
        filtroRelaciones.where.activoSn = activoSn;
      }

      const relaciones = await getEventoProfesor(JSON.stringify(filtroRelaciones));

      if (relaciones.length === 0 && cambiosPendientes?.profesoresNativos?.altas?.length === 0
        && cambiosPendientes?.profesoresNativos?.bajas?.length === 0) return [];

      // Obtener datos de los profesores
      const profesorIds = relaciones.map(rel => rel.profesorId);

      const filtroProfesores = {
        where: {
          id: { inq: profesorIds },
          empresa_id: empresaId
        }
      };

      const profesores = await getProfesores(JSON.stringify(filtroProfesores));

      // Obtener todos los tipos de profesores
      const tiposProfesores = await getTiposProfesores(JSON.stringify({
        where: {
          empresaId: empresaId
        }
      }));

      // Filtrar solo los tipos de profesores que sean nativos
      const tiposProfesoresNativosIds = tiposProfesores
        .filter(tipo => tipo.codigo === 'nativo')
        .map(tipo => tipo.id);

      // Combinar datos y filtrar solo profesores nativos
      const resultado = profesores
        .filter(profesor =>
          relaciones.some(rel => rel.profesorId === profesor.id) &&
          tiposProfesoresNativosIds.includes(profesor.tipo_profesor_id)
        )
        .map(profesor => {
          const relacion = relaciones.find(rel => rel.profesorId === profesor.id);
          return {
            ...profesor,
            relacionId: relacion.id,
            usuario_id: profesor.usuario_id,
            evento_id: eventoId,
            activo_sn: relacion.activoSn
          };
        });

      // Combinar con cambios pendientes si existen
      let resultadoFinal = [...resultado];

      if (cambiosPendientes?.profesoresNativos) {
        // Procesar altas pendientes
        for (const alta of cambiosPendientes.profesoresNativos.altas || []) {
          if (alta.esReadmision && alta.relacionId) {
            // Es una readmisión: actualizar registro existente o agregarlo si no está
            const indice = resultadoFinal.findIndex(r => r.relacionId === alta.relacionId);
            if (indice >= 0) {
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'S',
                pendiente_alta: true
              };
            } else {
              // El registro no está en resultadoFinal (estamos en pestaña de Activos), consultar y agregar
              try {
                const profesoresReadmision = await getProfesores(JSON.stringify({
                  where: { id: alta.profesorId }
                }));
                if (profesoresReadmision.length > 0) {
                  const profesor = profesoresReadmision[0];
                  // Verificar que sea nativo
                  if (tiposProfesoresNativosIds.includes(profesor.tipo_profesor_id)) {
                    resultadoFinal.push({
                      ...profesor,
                      relacionId: alta.relacionId,
                      usuario_id: profesor.usuario_id,
                      evento_id: eventoId,
                      activo_sn: 'S',
                      pendiente_alta: true
                    });
                  }
                }
              } catch (error) {
                console.error('Error al obtener profesor nativo para readmisión:', error);
              }
            }
          } else {
            // Es una nueva alta: agregar registro si no existe
            const yaExiste = resultadoFinal.some(r => r.id === alta.profesorId);
            if (!yaExiste) {
              try {
                const profesoresNuevos = await getProfesores(JSON.stringify({
                  where: { and: { id: alta.profesorId } }
                }));
                if (profesoresNuevos.length > 0) {
                  const profesor = profesoresNuevos[0];
                  // Verificar que sea nativo
                  if (tiposProfesoresNativosIds.includes(profesor.tipo_profesor_id)) {
                    resultadoFinal.push({
                      ...profesor,
                      relacionId: null,
                      usuario_id: profesor.usuario_id,
                      evento_id: eventoId,
                      activo_sn: 'S',
                      pendiente_alta: true
                    });
                  }
                }
              } catch (error) {
                console.error('Error al obtener profesor nativo pendiente:', error);
              }
            }
          }
        }

        // Procesar bajas pendientes
        for (const baja of cambiosPendientes.profesoresNativos.bajas || []) {
          const indice = resultadoFinal.findIndex(r => r.relacionId === baja.relacionId);
          if (indice >= 0) {
            // Si es un alta pendiente que se da de baja, eliminarla completamente
            if (resultadoFinal[indice].pendiente_alta) {
              resultadoFinal.splice(indice, 1);
            } else {
              // Si ya existía, marcarlo como baja pendiente
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'N',
                pendiente_baja: true
              };
            }
          } else {
            // El registro no está en resultadoFinal, consultar datos y agregarlo
            try {
              const profesoresBaja = await getProfesores(JSON.stringify({
                where: { and: { id: baja.profesorId } }
              }));
              if (profesoresBaja.length > 0) {
                const profesor = profesoresBaja[0];
                // Verificar que sea nativo
                if (tiposProfesoresNativosIds.includes(profesor.tipo_profesor_id)) {
                  resultadoFinal.push({
                    ...profesor,
                    relacionId: baja.relacionId,
                    usuario_id: profesor.usuario_id,
                    evento_id: eventoId,
                    activo_sn: 'N',
                    pendiente_baja: true
                  });
                }
              }
            } catch (error) {
              console.error('Error al obtener profesor nativo para baja pendiente:', error);
            }
          }
        }
      }

      // Filtrar según activo_sn si se especificó en el filtro
      if (activoSn) {
        resultadoFinal = resultadoFinal.filter(r => r.activo_sn === activoSn);
      }

      return resultadoFinal;

    } catch (error) {
      console.error('Error en configProfesoresNativos.getRegistros:', error);
      return [];
    }
  },
  getRegistrosCount: async (filtro) => {
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    // Extraer eventoId y activoSn de la estructura correcta
    let eventoId = null;
    let activoSn = null;

    // Buscar en diferentes ubicaciones posibles
    if (filtroObj.and && filtroObj.and.evento_id) {
      eventoId = filtroObj.and.evento_id;
    }
    if (filtroObj.and && filtroObj.and.activo_sn) {
      activoSn = filtroObj.and.activo_sn;
    }

    // También buscar en where si existe
    const where = filtroObj.where || {};
    if (!eventoId && where.evento_id) {
      eventoId = where.evento_id;
    }
    if (!activoSn && where.activo_sn) {
      activoSn = where.activo_sn;
    }


    if (!eventoId) {
      return { count: 0 };
    }

    const filtroRelaciones = {
      eventoId: eventoId
    };

    // Solo agregar filtro de activo_sn si se especifica (para pestañas Activos/Bajas)
    // Si no se especifica, contar todos (pestaña Todas)
    if (activoSn) {
      filtroRelaciones.activoSn = activoSn;
    }

    // Como getEventoProfesorCount del backend tiene un bug, usamos getEventoProfesor y contamos manualmente
    try {
      const empresaId = Number(localStorage.getItem('empresa'));
      const registrosReales = await getEventoProfesor(JSON.stringify(filtroRelaciones));

      // Obtener todos los tipos de profesores
      const tiposProfesores = await getTiposProfesores(JSON.stringify({
        where: {
          empresaId: empresaId
        }
      }));

      // Filtrar solo los tipos de profesores que sean nativos
      const tiposProfesoresNativosIds = tiposProfesores
        .filter(tipo => tipo.codigo === 'nativo')
        .map(tipo => tipo.id);

      // Obtener los profesores para filtrar por tipo
      const profesorIds = registrosReales.map(rel => rel.profesorId);
      const filtroProfesores = {
        where: {
          id: { inq: profesorIds },
          empresa_id: empresaId
        }
      };
      const profesores = await getProfesores(JSON.stringify(filtroProfesores));

      // Contar solo los profesores nativos
      const countReal = { count: profesores.filter(profesor => tiposProfesoresNativosIds.includes(profesor.tipo_profesor_id)).length };
      return countReal;

    } catch (error) {
      return { count: 0 };
    }
  },
  controlador: "Eventos",
  seccion: "Usuarios",
  parametrosEliminar: ["usuario_id"],
  botones: [],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Profesor nativo",
    rol: "Profesor nativo",
    crudDerivado: true
  },
  getIdEditar: (registro) => registro.usuario_id || registro.id,
  tipoUsuario: "Profesor nativo",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "apellido1", headerKey: "Primer apellido", tipo: "string" },
    { campo: "apellido2", headerKey: "Segundo apellido", tipo: "string" },
    {
      campo: "activo_sn",
      headerKey: "Dado de alta",
      tipo: "booleano"
    },
  ],
  mostrarTabs: true,
  campoEstado: "activo_sn"
};

/**
 * Configuración para el panel de Tutores en Eventos
 * Sistema limpio: tutor + evento_tutor
 */
export const configTutores = {
  headerKey: "Tutores",
  getRegistros: async (filtro, cambiosPendientes = null) => {

    // Parsear el filtro
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    // Extraer filtro de ids para casos de filtrado desde alumno
    let id = where.id;
    if (!id && where.and && where.and.id) {
      id = where.and.id;
    }

    const empresaId = Number(localStorage.getItem('empresa'));

    try {
      //Obtener relaciones del evento con filtro de estado
      const filtroRelaciones = {
        where: {
          eventoId: eventoId
        }
      };

      // Agregar filtro de estado si existe
      if (activoSn) {
        filtroRelaciones.where.activoSn = activoSn;
      }

      // Agregar filtro de ids
      if (id) {
        filtroRelaciones.where.tutorId = id;
      }


      const relaciones = await getEventoTutor(JSON.stringify(filtroRelaciones));

      if (relaciones.length === 0 && cambiosPendientes?.tutores?.altas?.length === 0
        && cambiosPendientes?.tutores?.bajas?.length === 0) return [];

      //Obtener datos de los tutores
      const tutorIds = relaciones.map(rel => rel.tutorId);

      const filtroTutores = {
        where: {
          id: { inq: tutorIds },
          empresa_id: empresaId
        }
      };


      const tutores = await getTutores(JSON.stringify(filtroTutores));


      //Combinar datos (solo los que tienen relación en el evento)
      const resultado = tutores
        .filter(tutor => relaciones.some(rel => rel.tutorId === tutor.id))
        .map(tutor => {
          const relacion = relaciones.find(rel => rel.tutorId === tutor.id);
          return {
            ...tutor,
            relacionId: relacion.id,
            usuario_id: tutor.usuario_id,
            evento_id: eventoId,
            activo_sn: relacion.activoSn
          };
        });

      // Combinar con cambios pendientes si existen
      let resultadoFinal = [...resultado];

      if (cambiosPendientes?.tutores) {
        // Procesar altas pendientes
        for (const alta of cambiosPendientes.tutores.altas || []) {
          if (alta.esReadmision && alta.relacionId) {
            // Es una readmisión: actualizar registro existente o agregarlo si no está
            const indice = resultadoFinal.findIndex(r => r.relacionId === alta.relacionId);
            if (indice >= 0) {
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'S',
                pendiente_alta: true
              };
            } else {
              // El registro no está en resultadoFinal (estamos en pestaña de Activos), consultar y agregar
              try {
                const tutoresReadmision = await getTutores(JSON.stringify({
                  where: { and: { id: alta.tutorId } }
                }));
                if (tutoresReadmision.length > 0) {
                  const tutor = tutoresReadmision[0];
                  resultadoFinal.push({
                    ...tutor,
                    relacionId: alta.relacionId,
                    usuario_id: tutor.usuario_id,
                    evento_id: eventoId,
                    activo_sn: 'S',
                    pendiente_alta: true
                  });
                }
              } catch (error) {
                console.error('Error al obtener tutor para readmisión:', error);
              }
            }
          } else {
            // Es una nueva alta: agregar registro si no existe
            const yaExiste = resultadoFinal.some(r => r.id === alta.tutorId);
            if (!yaExiste) {
              try {
                const tutoresNuevos = await getTutores(JSON.stringify({
                  where: { and: { id: alta.tutorId } }
                }));
                if (tutoresNuevos.length > 0) {
                  const tutor = tutoresNuevos[0];
                  resultadoFinal.push({
                    ...tutor,
                    relacionId: null,
                    usuario_id: tutor.usuario_id,
                    evento_id: eventoId,
                    activo_sn: 'S',
                    pendiente_alta: true
                  });
                }
              } catch (error) {
                console.error('Error al obtener tutor pendiente:', error);
              }
            }
          }
        }

        // Procesar bajas pendientes
        for (const baja of cambiosPendientes.tutores.bajas || []) {
          const indice = resultadoFinal.findIndex(r => r.relacionId === baja.relacionId);
          if (indice >= 0) {
            // Si es un alta pendiente que se da de baja, eliminarla completamente
            if (resultadoFinal[indice].pendiente_alta) {
              resultadoFinal.splice(indice, 1);
            } else {
              // Si ya existía, marcarlo como baja pendiente
              resultadoFinal[indice] = {
                ...resultadoFinal[indice],
                activo_sn: 'N',
                pendiente_baja: true
              };
            }
          } else {
            // El registro no está en resultadoFinal, consultar datos y agregarlo
            try {
              const tutoresBaja = await getTutores(JSON.stringify({
                where: { and: { id: baja.tutorId } }
              }));
              if (tutoresBaja.length > 0) {
                const tutor = tutoresBaja[0];
                resultadoFinal.push({
                  ...tutor,
                  relacionId: baja.relacionId,
                  usuario_id: tutor.usuario_id,
                  evento_id: eventoId,
                  activo_sn: 'N',
                  pendiente_baja: true
                });
              }
            } catch (error) {
              console.error('Error al obtener tutor para baja pendiente:', error);
            }
          }
        }
      }

      // Filtrar según activo_sn si se especificó en el filtro
      if (activoSn) {
        resultadoFinal = resultadoFinal.filter(r => r.activo_sn === activoSn);
      }

      return resultadoFinal;

    } catch (error) {
      return [];
    }
  },
  getRegistrosCount: async (filtro) => {
    const where = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;

    // Extraer eventoId de diferentes ubicaciones posibles
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles  
    let activoSn = where.activo_sn;
    if (!activoSn && where.and && where.and.activo_sn) {
      activoSn = where.and.activo_sn;
    }

    // Extraer filtro de ids para casos de filtrado desde alumno
    let id = where.id;
    if (!id && where.and && where.and.id) {
      id = where.and.id;
    }

    if (!eventoId) return { count: 0 };

    const filtroRelaciones = {
      eventoId: eventoId
    };

    if (activoSn) {
      filtroRelaciones.activoSn = activoSn;
    }

    // Agregar filtro de ids
    if (id) {
      filtroRelaciones.tutorId = id;
    }

    const result = await getEventoTutorCount(JSON.stringify(filtroRelaciones));
    return result;
  },
  controlador: "Eventos",
  seccion: "Usuarios",
  parametrosEliminar: ["usuario_id"],
  botones: [],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Tutor",
    rol: "Alumno / Tutor",
    crudDerivado: true
  },
  getIdEditar: (registro) => registro.usuario_id || registro.id,
  tipoUsuario: "Tutor",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "apellido1", headerKey: "Primer apellido", tipo: "string" },
    { campo: "apellido2", headerKey: "Segundo apellido", tipo: "string" },

    {
      campo: "activo_sn",
      headerKey: "Dado de alta",
      tipo: "booleano"
    },
  ],
  mostrarTabs: true,
  campoEstado: "activo_sn"
};

/**
 * Configuración para el panel de Agentes
 */
export const configAgentes = {
  headerKey: "Agentes",
  getRegistros: async (vista, filtro, cambiosPendientes = null) => {
    const registros = await getVistaEventosRelaciones(vista, filtro);

    // Extraer eventoId y activoSn para nuevas altas y filtrado
    const filtroObj = typeof filtro === 'string' ? JSON.parse(filtro) : filtro;
    const where = filtroObj.where || {};
    let eventoId = where.evento_id;
    if (!eventoId && where.and && where.and.evento_id) {
      eventoId = where.and.evento_id;
    }

    // Extraer activo_sn de diferentes ubicaciones posibles
    let activoSn = where.evento_agentes_activo_sn;
    if (!activoSn && where.and && where.and.evento_agentes_activo_sn) {
      activoSn = where.and.evento_agentes_activo_sn;
    }

    let resultado = [...registros];

    // Combinar con cambios pendientes si existen
    if (cambiosPendientes?.agentes) {
      // Procesar altas pendientes
      for (const alta of cambiosPendientes.agentes.altas || []) {
        if (alta.esReadmision && alta.relacionId) {
          // Es una readmisión: actualizar registro existente o agregarlo si no está
          const indice = resultado.findIndex(r => r.evento_agentes_id === alta.relacionId);
          if (indice >= 0) {
            resultado[indice] = {
              ...resultado[indice],
              evento_agentes_activo_sn: 'S',
              pendiente_alta: true
            };
          } else {
            // El registro no está en resultado (estamos en pestaña de Activos), consultar y agregar
            try {
              const empresaId = Number(localStorage.getItem('empresa'));
              const agentesReadmision = await getAgentes(JSON.stringify({
                where: { id: alta.agenteId }
              }));

              if (agentesReadmision.length > 0) {
                const agente = agentesReadmision[0];
                const usuarioIdAgente = agente.usuarioId || agente.usuario_id;

                // Obtener el email del usuario
                let emailAgente = '';
                if (usuarioIdAgente) {
                  try {
                    const usuariosAgente = await getUsuarios(JSON.stringify({
                      where: { id: usuarioIdAgente }
                    }));
                    if (usuariosAgente.length > 0) {
                      emailAgente = usuariosAgente[0].mail || usuariosAgente[0].email || '';
                    }
                  } catch (error) {
                    console.error('Error al obtener usuario de agente:', error);
                  }
                }

                resultado.push({
                  agente_id: agente.id,
                  usuario_id: usuarioIdAgente,
                  nombre: agente.nombre,
                  apellido1: agente.apellido1 || '',
                  apellido2: agente.apellido2 || '',
                  usuario_email: emailAgente,
                  evento_id: eventoId,
                  evento_agentes_id: alta.relacionId,
                  evento_agentes_activo_sn: 'S',
                  pendiente_alta: true
                });
              }
            } catch (error) {
              console.error('Error al obtener agente para readmisión:', error);
            }
          }
        } else {
          // Es una nueva alta: consultar datos del agente y agregarlo
          const yaExiste = resultado.some(r => r.agente_id === alta.agenteId);
          if (!yaExiste) {
            try {
              const empresaId = Number(localStorage.getItem('empresa'));
              const agentesNuevos = await getAgentes(JSON.stringify({
                where: { and: { id: alta.agenteId } }
              }));

              if (agentesNuevos.length > 0) {
                const agente = agentesNuevos[0];
                const usuarioIdAgente = agente.usuarioId || agente.usuario_id;

                // Obtener el email del usuario
                let emailAgente = '';
                if (usuarioIdAgente) {
                  try {
                    const usuariosAgente = await getUsuarios(JSON.stringify({
                      where: { id: usuarioIdAgente }
                    }));
                    if (usuariosAgente.length > 0) {
                      emailAgente = usuariosAgente[0].mail || usuariosAgente[0].email || '';
                    }
                  } catch (error) {
                    console.error('Error al obtener usuario de agente:', error);
                  }
                }

                resultado.push({
                  agente_id: agente.id,
                  usuario_id: usuarioIdAgente,
                  nombre: agente.nombre,
                  apellido1: agente.apellido1 || '',
                  apellido2: agente.apellido2 || '',
                  usuario_email: emailAgente,
                  evento_id: eventoId,
                  evento_agentes_id: null,
                  evento_agentes_activo_sn: 'S',
                  pendiente_alta: true
                });
              }
            } catch (error) {
              console.error('Error al obtener agente pendiente:', error);
            }
          }
        }
      }

      // Procesar bajas pendientes
      for (const baja of cambiosPendientes.agentes.bajas || []) {
        const indice = resultado.findIndex(r => r.evento_agentes_id === baja.relacionId);
        if (indice >= 0) {
          // Si es un alta pendiente que se da de baja, eliminarla completamente
          if (resultado[indice].pendiente_alta) {
            resultado.splice(indice, 1);
          } else {
            // Si ya existía, marcarlo como baja pendiente
            resultado[indice] = {
              ...resultado[indice],
              evento_agentes_activo_sn: 'N',
              pendiente_baja: true
            };
          }
        } else {
          // El registro no está en resultado, consultar datos y agregarlo
          try {
            const empresaId = Number(localStorage.getItem('empresa'));
            const agentesBaja = await getAgentes(JSON.stringify({
              where: { and: { id: baja.agenteId } }
            }));
            if (agentesBaja.length > 0) {
              const agente = agentesBaja[0];
              const usuarioIdAgente = agente.usuarioId || agente.usuario_id;

              let emailAgente = '';
              if (usuarioIdAgente) {
                try {
                  const usuariosAgente = await getUsuarios(JSON.stringify({
                    where: { id: usuarioIdAgente }
                  }));
                  if (usuariosAgente.length > 0) {
                    emailAgente = usuariosAgente[0].mail || usuariosAgente[0].email || '';
                  }
                } catch (error) {
                  console.error('Error al obtener usuario de agente:', error);
                }
              }

              resultado.push({
                agente_id: agente.id,
                usuario_id: usuarioIdAgente,
                nombre: agente.nombre,
                apellido1: agente.apellido1 || '',
                apellido2: agente.apellido2 || '',
                usuario_email: emailAgente,
                evento_id: eventoId,
                evento_agentes_id: baja.relacionId,
                evento_agentes_activo_sn: 'N',
                pendiente_baja: true
              });
            }
          } catch (error) {
            console.error('Error al obtener agente para baja pendiente:', error);
          }
        }
      }
    }

    // Filtrar según activo_sn si se especificó en el filtro
    if (activoSn) {
      resultado = resultado.filter(r => r.evento_agentes_activo_sn === activoSn);
    }

    return resultado;
  },
  getRegistrosCount: getVistaEventosRelacionesCount,
  controlador: "Eventos",
  seccion: "Usuarios",
  parametrosEliminar: ["usuario_id"],
  botones: [],
  editarComponente: <EditarUsuario />,
  editarComponenteParametrosExtra: {
    tipo: "Agente",
    rol: "Agente",
    crudDerivado: true
  },
  tipoUsuario: "Agente",
  columnas: [
    { campo: "nombre", headerKey: "Nombre", tipo: "string" },
    { campo: "apellido1", headerKey: "Primer apellido", tipo: "string" },
    { campo: "apellido2", headerKey: "Segundo apellido", tipo: "string" },
    { campo: "usuario_email", headerKey: "Email", tipo: "string" },
    { campo: "evento_agentes_activo_sn", headerKey: "Dado de alta", tipo: "booleano" },

  ],
  mostrarTabs: true,
  campoEstado: "evento_agentes_activo_sn",
  vista: "vista_evento_agentes",
};

// Puedes exportar una función factory si prefieres una aproximación más funcional
export const crearConfigCrud = ({
  headerKey,
  getRegistros,
  getRegistrosCount,
  deleteRegistro,
  controlador,
  seccion,
  columnas,
  editarComponente,
  editarComponenteParametrosExtra,
  parametrosEliminar = ["id"],
  botones = ["nuevo", "eliminar", "descargarCSV"],
  filtradoBase = null
}) => ({
  headerKey,
  getRegistros,
  getRegistrosCount,
  deleteRegistro,
  controlador,
  seccion,
  parametrosEliminar,
  botones,
  editarComponente,
  editarComponenteParametrosExtra,
  columnas,
  filtradoBase
});

