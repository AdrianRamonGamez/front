/**
 * Este archivo centraliza las configuraciones necesarias para realizar peticiones HTTP con Axios a la API 
 */
import {Configuration, ConfigurationParameters} from "./axios"
import { devuelveBasePath } from "@/app/utility/Utils"

const params : ConfigurationParameters = {
    basePath: devuelveBasePath() //-> Dependiendo de si apunta a DEV, PRO o LOCAL: Establece dinamicamente el BasePath de la API.
}

export const settings = new Configuration(params)

export * from "./axios"
