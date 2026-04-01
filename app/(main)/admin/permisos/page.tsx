'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Toast } from 'primereact/toast';

import PermisosMatrix, { PermisoMatrix } from '@/components/admin/PermisosMatrix';
import RolService, { Rol } from '@/services/RolService';
import PermisoService from '@/services/PermisoService';

import styles from './page.module.css';

export default function PermisosPage() {

    const toastRef = useRef<Toast>(null);

    const [roles, setRoles] = useState<Rol[]>([]);
    const [matrix, setMatrix] = useState<PermisoMatrix>({});
    const [loading, setLoading] = useState(true);

    const loadData = async () => {

        setLoading(true);

        try {

            // =============================
            // ROLES
            // =============================
            const rolesRes = await RolService.getRoles(1, 100);

            const rolesActivos = (rolesRes.data || [])
                .filter(r => r.activoSn === 'S')
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            setRoles(rolesActivos);

            // =============================
            // PERMISOS MATRIX
            // =============================
            const permisosRes = await PermisoService.getMatrix();
            console.log('MATRIX:', permisosRes); //AÑADE ESTO

            setMatrix(permisosRes);

        } catch (error) {

            console.error(error);

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error cargando permisos',
                life: 3000
            });

        } finally {
            setLoading(false);
        }

    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggle = async (
        modulo: string,
        accion: string,
        rolId: number,
        value: boolean
    ) => {

        // Guardamos valor anterior
        const prevValue = matrix?.[modulo]?.[accion]?.[rolId] || false;

        // 
        setMatrix(prev => ({
            ...prev,
            [modulo]: {
                ...(prev[modulo] || {}),
                [accion]: {
                    ...((prev[modulo] && prev[modulo][accion]) || {}),
                    [rolId]: value
                }
            }
        }));

        try {

            await PermisoService.updatePermiso({
                modulo,
                accion,
                rolId,
                permitido: value
            });

        } catch (error) {

            console.error(error);

            //Revertimos el cambio en UI//IMPORTANTE
            setMatrix(prev => ({
                ...prev,
                [modulo]: {
                    ...(prev[modulo] || {}),
                    [accion]: {
                        ...((prev[modulo] && prev[modulo][accion]) || {}),
                        [rolId]: prevValue
                    }
                }
            }));

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Error actualizando permiso',
                life: 3000
            });

        }
    };

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (userData?.rolId !== 1) {
        return (
            <div className={styles.container}>
                No tienes permisos para acceder a esta sección
            </div>
        );
    }
    
    return (
        <div className={styles.container}>

            <Toast ref={toastRef} />

            <h2 className={styles.title}>Permisos</h2>

            {loading ? (
                <p>Cargando...</p>
            ) : (
                <PermisosMatrix
                    roles={roles}
                    matrix={matrix}
                    onToggle={handleToggle}
                />
            )}

        </div>
    );
}