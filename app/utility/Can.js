import React, { createContext, useContext, useState } from 'react';
import { compruebaPermiso } from "@/app/api-endpoints/permisos";

// Define el contexto
export const AbilityContext = createContext();

// Exporta un hook para usar el contexto
export const useAbility = () => useContext(AbilityContext);

// Proveedor del contexto
export const AbilityProvider = ({ children }) => {
    // Define la lógica de permisos
    const ability = {
        // can sirve para comprobar si un usuario tiene permisos para realizar una acción, se ejecuta cuando se llama a .can() en un componente
        can: (modulo, controlador, accion) => {
            // Devuelve una promesa que resuelve a true o false dependiendo de si el usuario tiene permisos, hasta que no acabe no sigue el codigo
            return new Promise((resolve, reject) => {
                // Obtener los datos del usuario
                const storedData = localStorage.getItem('userDataNathalie');
                const parsedData = JSON.parse(storedData);
    
                // Llama a una funcion en la que se comprueba si el usuario tiene permisos
                compruebaPermiso(parsedData.rolId, modulo, controlador, accion)
                    .then(existePermiso => {
                        if (existePermiso) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    })
                    .catch(error => {
                        reject(error);
                    });
            });
        }
    };
    

    return (
        <AbilityContext.Provider value={ability}>
            {children}
        </AbilityContext.Provider>
    );
};