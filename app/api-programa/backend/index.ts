/**
 * Este archivo centraliza las configuraciones necesarias para realizar peticiones HTTP con Axios a la API 
 */
import { Configuration, ConfigurationParameters } from "./axios"

//usamos variable de entorno
const params: ConfigurationParameters = {
    basePath: process.env.NEXT_PUBLIC_API_URL
}

export const settings = new Configuration(params)

export * from "./axios"