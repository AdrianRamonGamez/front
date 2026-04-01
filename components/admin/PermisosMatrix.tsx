'use client';

import React from 'react';
import { Checkbox } from 'primereact/checkbox';
import { Rol } from '@/services/RolService';
import styles from './PermisosMatrix.module.css';

export type PermisoMatrix = Record<
    string,
    Record<string, Record<number, boolean>>
>;

type Props = {
    roles: Rol[];
    matrix: PermisoMatrix;
    onToggle: (
        modulo: string,
        accion: string,
        rolId: number,
        value: boolean
    ) => void;
};

export default function PermisosMatrix({ roles, matrix, onToggle }: Props) {

    return (
        <div className={styles.wrapper}>
            <table className={styles.table}>

                <thead>
                    <tr>
                        <th className={styles.colModule}>Módulo</th>
                        <th className={styles.colAction}>Acción</th>

                        {roles.map((rol) => (
                            <th key={rol.id} className={styles.colRole}>
                                {rol.nombre}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {Object.entries(matrix).map(([modulo, acciones]) => {

                        const accionesEntries = Object.entries(acciones);

                        return (
                            <React.Fragment key={modulo}>

                                {accionesEntries.map(([accion, permisos], index) => (

                                    <tr key={accion}>

                                        {index === 0 && (
                                            <td
                                                rowSpan={accionesEntries.length}
                                                className={styles.moduleCell}
                                            >
                                                {modulo}
                                            </td>
                                        )}

                                        <td className={styles.actionCell}>
                                            {accion}
                                        </td>

                                        {roles.map((rol) => (
                                            <td key={rol.id} className={styles.checkboxCell}>
                                                <Checkbox
                                                    checked={permisos[rol.id] || false}
                                                    onChange={(e) =>
                                                        onToggle(
                                                            modulo,
                                                            accion,
                                                            rol.id,
                                                            e.checked ?? false
                                                        )
                                                    }
                                                />
                                            </td>
                                        ))}

                                    </tr>

                                ))}

                            </React.Fragment>
                        );

                    })}
                </tbody>

            </table>
        </div>
    );
}