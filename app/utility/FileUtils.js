import { borrarFichero, postSubirImagen, postSubirFichero } from "@/app/api-endpoints/ficheros";
import { postArchivo, deleteArchivo } from "@/app/api-endpoints/archivo";
import { getUrlOriginal } from "./ImageUtils";

/**
 * Borra un archivo y sus versiones redimensionadas si es una imagen
 * @param {string} url - URL del archivo a borrar
 * @param {string} tipoArchivo - Tipo de archivo (imagen, fichero, etc.)
 */
const borrarArchivoConVersiones = async (url, tipoArchivo) => {
    // Si es una imagen, borra todas las versiones redimensionadas
    if (tipoArchivo?.toLowerCase() === 'imagen') {
        // Obtiene la URL original (sin prefijos de redimensionado)
        const urlOriginal = getUrlOriginal(url);
        
        // Borra la versión original
        try {
            await borrarFichero(urlOriginal);
        } catch (error) {
            console.warn('No se pudo borrar la versión original:', urlOriginal);
        }
        
        // Borra la versión 1250x850
        try {
            const url1250x850 = urlOriginal.replace(/(\/[^\/]+\/)([^\/]+\.\w+)$/, '$11250x850_$2');
            await borrarFichero(url1250x850);
        } catch (error) {
            console.warn('No se pudo borrar la versión 1250x850:', error.message);
        }
        
        // Borra el avatar (32x32)
        // try {
        //     const urlAvatar = urlOriginal.replace(/(\/[^\/]+\/)([^\/]+\.\w+)$/, '$132x32_$2');
        //     await borrarFichero(urlAvatar);
        // } catch (error) {
        //     console.warn('No se pudo borrar la versión 32x32:', error.message);
        // }
    } else {
        // Si no es imagen, solo borra el archivo principal
        await borrarFichero(url);
    }
};

/**
 * Borra los archivos antiguos de la base de datos y del servidor
 * @param {Object|Array} listaTipoArchivosAntiguos - Lista de archivos antiguos
 * @param {Object} tipoArchivo - Tipo de archivo
 * @param {Object} registro - Registro que contiene los archivos
 */
const LimpiarArchivosAntiguos = async (listaTipoArchivosAntiguos, tipoArchivo, registro) => {
    const archivosAntiguos = Array.isArray(listaTipoArchivosAntiguos[tipoArchivo['nombre']]) ? 
        listaTipoArchivosAntiguos[tipoArchivo['nombre']] : 
        [listaTipoArchivosAntiguos[tipoArchivo['nombre']]];
        
    for (const archivoAntiguo of archivosAntiguos) {
        if (archivoAntiguo) {
            const urlArchivo = archivoAntiguo.url || archivoAntiguo;
            await borrarArchivoConVersiones(urlArchivo, tipoArchivo.tipo);
            
            // Eliminar registro del archivo en la base de datos
            const archivoId = archivoAntiguo.id || registro[`${(tipoArchivo.nombre).toLowerCase()}Id`];
            if (archivoId) {
                await deleteArchivo(archivoId);
            }
        }
    }
};

/**
 * Gestiona la edición de archivos para un registro
 * @param {Object} registro - El registro que contiene los archivos
 * @param {number} id - ID del registro
 * @param {Array} listaTipoArchivos - Lista de tipos de archivos permitidos
 * @param {Object} listaTipoArchivosAntiguos - Lista de archivos antiguos para comparar cambios
 * @param {Object} seccion - Información de la sección
 * @param {number} usuario - ID del usuario que realiza la acción
 */
export const editarArchivos = async (registro, id, listaTipoArchivos, listaTipoArchivosAntiguos, seccion, usuario) => {
    if (!listaTipoArchivos) return;
    
    for (const tipoArchivo of listaTipoArchivos) {
        const archivos = registro[(tipoArchivo.nombre).toLowerCase()];
        const esArray = Array.isArray(archivos);
        
        // Comprueba si se ha añadido un archivo nuevo
        const hayArchivosNuevos = esArray ? 
            archivos?.some(archivo => archivo?.type !== undefined) : 
            archivos?.type !== undefined;

        if (hayArchivosNuevos) {
            // Si ya existía antes un archivo, hay que eliminarlo junto a sus versiones redimensionadas
            if (listaTipoArchivosAntiguos[tipoArchivo['nombre']] != null) {
                await LimpiarArchivosAntiguos(listaTipoArchivosAntiguos, tipoArchivo, registro);
            }
            
            // Se inserta el archivo modificado
            await insertarArchivo(registro, id, tipoArchivo, seccion, usuario);
        }
        else {
            // Si ya existía antes un archivo y se ha borrado, hay que eliminarlo junto a sus versiones redimensionadas
            const archivosFueronEliminados = esArray ? 
                (archivos === null || archivos.length === 0) : 
                archivos === null;
                
            if (listaTipoArchivosAntiguos[tipoArchivo['nombre']] !== null && archivosFueronEliminados) {
                await LimpiarArchivosAntiguos(listaTipoArchivosAntiguos, tipoArchivo, registro);
            }
        }
    }
};

/**
 * Inserta un archivo nuevo en el sistema
 * @param {Object} registro - El registro que contiene el archivo
 * @param {number} id - ID del registro al que pertenece el archivo
 * @param {Object} tipoArchivo - Información del tipo de archivo
 * @param {Object} seccion - Información de la sección
 * @param {number} usuario - ID del usuario que realiza la acción
 */
export const insertarArchivo = async (registro, id, tipoArchivo, seccion, usuario) => {
    const archivos = registro[(tipoArchivo.nombre).toLowerCase()];
    const esArray = Array.isArray(archivos);
    const archivosArray = esArray ? archivos : [archivos];
    
    //Comprueba que el input haya sido modificado
    for (const archivo of archivosArray) {
        if (archivo?.type !== undefined) {
            //Comprueba si el tipo de archivo es una imagen para la subida
            let response = null;
            if ((tipoArchivo.tipo).toLowerCase() === 'imagen') {
                response = await postSubirImagen(seccion+'/'+id, archivo.name, archivo);
            }
            else {
                response = await postSubirFichero(seccion+'/'+id, archivo.name, archivo);
            }
            //Hace el insert en la tabla de archivos
            const objArchivo = {}
            objArchivo['usuCreacion'] = usuario;
            objArchivo['empresaId'] = Number(localStorage.getItem('empresa'));
            objArchivo['tipoArchivoId'] = tipoArchivo.id;
            objArchivo['url'] = response.originalUrl;
            objArchivo['idTabla'] = id;
            objArchivo['tabla'] = seccion.toLowerCase();
            await postArchivo(objArchivo);
        }
    }
};

/**
 * Inserta un archivo simple (usado para adjuntos de email)
 * @param {number} id - ID del registro al que se asocia el archivo
 * @param {File} archivo - El archivo a subir
 * @param {string} seccion - Sección/tabla del sistema
 * @param {number} usuario - ID del usuario que realiza la acción
 * @param {number} tipoArchivoId - ID del tipo de archivo
 */
export const insertarArchivoSimple = async (id, archivo, seccion, usuario, tipoArchivoId) => {
    //Comprueba que el input haya sido modificado
    if (archivo?.type !== undefined) {
        //Comprueba si el tipo de archivo es una imagen para la subida
        let response = null;
        if ((archivo.type).includes('image/')) {
            response = await postSubirImagen(seccion, archivo.name, archivo);
        }
        else {
            response = await postSubirFichero(seccion, archivo.name, archivo);
        }
        //Hace el insert en la tabla de archivos
        const objArchivo = {}
        objArchivo['usuCreacion'] = usuario;
        objArchivo['empresaId'] = Number(localStorage.getItem('empresa'));
        objArchivo['tipoArchivoId'] = tipoArchivoId;
        objArchivo['url'] = response.originalUrl;
        objArchivo['idTabla'] = id;
        objArchivo['tabla'] = seccion.toLowerCase();
        await postArchivo(objArchivo);
    }
};

/**
 * Procesa los archivos para un nuevo registro
 * @param {Object} registro - El registro que contiene los archivos
 * @param {number} id - ID del registro
 * @param {Array} listaTipoArchivos - Lista de tipos de archivos permitidos
 * @param {Object} seccion - Información de la sección
 * @param {number} usuario - ID del usuario que realiza la acción
 */
export const procesarArchivosNuevoRegistro = async (registro, id, listaTipoArchivos, seccion, usuario) => {
    if (!listaTipoArchivos) return;
    
    for (const tipoArchivo of listaTipoArchivos) {
        const archivos = registro[(tipoArchivo.nombre).toLowerCase()];
        const esArray = Array.isArray(archivos);
        const hayArchivos = esArray ? 
            archivos?.some(archivo => archivo?.type !== undefined) : 
            archivos?.type !== undefined;
            
        //Comprueba que el input haya sido modificado
        if (hayArchivos) {
            await insertarArchivo(registro, id, tipoArchivo, seccion, usuario);
        }
    }
};

/**
 * Valida que las imágenes tengan el formato correcto
 * @param {Object} registro - El registro que contiene las imágenes
 * @param {Array} listaTipoArchivos - Lista de tipos de archivos permitidos
 * @returns {boolean} true si hay errores de validación, false si todo está correcto
 */
export const validarImagenes = (registro, listaTipoArchivos) => {
    if (!listaTipoArchivos) return false;
    
    for (const tipoArchivo of listaTipoArchivos) {
        //Comprueba si el tipo de archivo es una imagen para validar su extension
        if ((tipoArchivo.tipo).toLowerCase() === 'imagen') {
            const archivos = registro[(tipoArchivo.nombre).toLowerCase()];
            const esArray = Array.isArray(archivos);
            const archivosArray = esArray ? archivos : [archivos];
            
            //Comprueba que el input haya sido modificado
            for (const archivo of archivosArray) {
                if (archivo?.type !== undefined) {
                    //Comprueba que la imagen es del tipo valido
                    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/tiff", "image/avif"];
                    if (!(allowedTypes.includes(archivo.type))) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
};

/**
 * Crea una copia de los archivos antiguos para poder compararlos después
 * @param {Object} registro - El registro original
 * @param {Array} listaTipoArchivos - Lista de tipos de archivos
 * @returns {Object} Objeto con los archivos antiguos
 */
export const crearListaArchivosAntiguos = (registro, listaTipoArchivos) => {
    const listaArchivosAntiguos = {};
    if (listaTipoArchivos) {
        for (const tipoArchivo of listaTipoArchivos) {
            const archivos = registro[(tipoArchivo.nombre).toLowerCase()];
            // Mantener la estructura original (array o individual)
            listaArchivosAntiguos[tipoArchivo['nombre']] = Array.isArray(archivos) ? [...archivos] : archivos;
        }
    }
    return listaArchivosAntiguos;
};