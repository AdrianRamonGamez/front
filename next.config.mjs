// @ts-check
 
/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export', //-> Crea una compilación estática para subirlos al servidor, crea la carpeta compilada /out
  trailingSlash: true, //-> Sirve para que al actualizar una pagina se mantenga en la misma pagina y no regrese al index.html
}
 
export default nextConfig