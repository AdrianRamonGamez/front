"use client";

import { useIntl } from "react-intl";
import { getRol, getRolCount, deleteRol } from "@/app/api-endpoints/roles";
import EditarRoles from "./editar";
import { CRUDTable } from '@/components/admin/CRUDTable';

const Rol = () => {
    const intl = useIntl();

    const columnas = [
        {
            campo: 'nombre',
            header: intl.formatMessage({ id: 'Nombre' }),
            tipo: 'string'
        },
        {
            campo: 'dashboardUrl',
            header: intl.formatMessage({ id: 'Página inicio' }),
            tipo: 'string'
        },
        {
            campo: 'activoSn',
            header: intl.formatMessage({ id: 'Activo' }),
            tipo: 'booleano'
        },
    ];

    return (
        <div>
            <CRUDTable
                headerCrud={intl.formatMessage({ id: 'Roles' })}
                getRegistros={getRol}
                getRegistrosCount={getRolCount}
                botones={['nuevo', 'ver', 'editar', 'eliminar', 'descargarCSV']}
                controlador={"Roles"}
                editarComponente={<EditarRoles />}
                columnas={columnas}
                deleteRegistro={deleteRol}
            />
        </div>
    );
};

export default Rol;