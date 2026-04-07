"use client";

import { useIntl } from "react-intl";
import { obtenerRol, obtenerCuentaRol, deleteRol } from "@/app/api-endpoints/roles";
import EditarRoles from "./editar";
import { CRUDTable } from '@/components/admin/CRUDTable';

const Rol = () => {
    const intl = useIntl();

    const columnas = [
        {

            field: 'nombre',
            header: intl.formatMessage({ id: 'Nombre' }),
            type: 'string'
        },
        {
            visible: false,
            field: 'dashboardUrl',
            header: intl.formatMessage({ id: 'Página inicio' }),
            type: 'string'
        },
        {
            field: 'activoSn',
            header: intl.formatMessage({ id: 'Estado' }),
            type: 'string'
        },
    ];

    return (
        <div>
            <CRUDTable
                headerCrud={intl.formatMessage({ id: 'Roles' })}
                getRegistros={obtenerRol}
                getRegistrosCount={obtenerCuentaRol}
                botones={['Nuevo', 'ver', 'editar', 'eliminar', 'descargarCSV']}
                controlador={"Roles"}
                editarComponente={<EditarRoles />}
                columns={columnas}
                deleteRegistro={deleteRol}
            />
        </div>
    );
};

export default Rol;