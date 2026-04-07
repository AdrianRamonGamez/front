/**
 * Utilidades para manejo de URLs de imágenes con diferentes tamaños
 */

/**
 * Genera las diferentes URLs de una imagen desde la URL original
 * @param {string} originalUrl - URL original de la imagen
 * @returns {object} - Objeto con las URLs en diferentes tamaños
 */
export const getUrlsImagen = (originalUrl) => {
    if (!originalUrl || originalUrl.includes('sistemaNLE/imagen-no-disponible.jpeg')) {
        return {
            originalUrl: originalUrl || '/multimedia/sistemaNLE/imagen-no-disponible.jpeg',
            webUrl: originalUrl || '/multimedia/sistemaNLE/imagen-no-disponible.jpeg',
            thumbnailUrl: originalUrl || '/multimedia/sistemaNLE/imagen-no-disponible.jpeg'
        };
    }

    // Patrón para reemplazar: captura la ruta y el nombre del archivo
    const pattern = /(\/[^\/]+\/)([^\/]+\.\w+)$/;
    
    return {
        originalUrl: originalUrl,
        webUrl: originalUrl.replace(pattern, '$11250x850_$2'),
        thumbnailUrl: originalUrl.replace(pattern, '$1200x200_$2')
    };
};

/**
 * Obtiene la URL de thumbnail (Imagen en miniatura 200x200) desde cualquier URL de imagen
 * @param {string} url - URL de la imagen (puede ser original, web o thumbnail)
 * @returns {string} - URL de la miniatura (200x200)
 */
export const getUrlImagenMiniatura = (url) => {
    if (!url || url.includes('sistemaNLE/imagen-no-disponible.jpeg')) {
        return url;
    }

    // Eliminar cualquier prefijo de tamaño existente y agregar el de thumbnail
    const pattern = /(\/[^\/]+\/)((?:\d+x\d+_)?[^\/]+\.\w+)$/;
    return url.replace(pattern, (match, path, filename) => {
        // Remover cualquier prefijo de dimensiones existente
        const cleanFilename = filename.replace(/^\d+x\d+_/, '');
        return `${path}200x200_${cleanFilename}`;
    });
};

/**
 * Obtiene la URL de display (1250x850) desde cualquier URL de imagen
 * @param {string} url - URL de la imagen (puede ser original, web o thumbnail)
 * @returns {string} - URL de display (1250x850)
 */
export const getUrlImagenGrande = (url) => {
    if (!url || url.includes('sistemaNLE/imagen-no-disponible.jpeg')) {
        return url;
    }

    // Eliminar cualquier prefijo de tamaño existente y agregar el de web
    const pattern = /(\/[^\/]+\/)((?:\d+x\d+_)?[^\/]+\.\w+)$/;
    return url.replace(pattern, (match, path, filename) => {
        // Remover cualquier prefijo de dimensiones existente
        const cleanFilename = filename.replace(/^\d+x\d+_/, '');
        return `${path}1250x850_${cleanFilename}`;
    });
};

/**
 * Obtiene la URL original (sin redimensionar) desde cualquier URL de imagen
 * @param {string} url - URL de la imagen (puede ser original, web o thumbnail)
 * @returns {string} - URL original sin prefijo de tamaño
 */
export const getUrlOriginal = (url) => {
    if (!url || url.includes('sistemaNLE/imagen-no-disponible.jpeg')) {
        return url;
    }

    // Remover cualquier prefijo de tamaño
    const pattern = /(\/[^\/]+\/)\d+x\d+_([^\/]+\.\w+)$/;
    return url.replace(pattern, '$1$2');
};

/**
 * Verifica si una URL corresponde a una imagen basándose en su extensión
 * @param {string} url - URL a verificar
 * @returns {boolean} - true si es una imagen, false en caso contrario
 */
export const UrlEsImagen = (url) => {
    if (!url) return false;
    const extension = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'avif'].includes(extension);
};
