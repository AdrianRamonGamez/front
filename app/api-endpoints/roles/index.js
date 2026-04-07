import { RolControllerApi, settings, PermisoControllerApi } from "@/app/api-programa";

const apiRol = new RolControllerApi(settings)
const apiPermisos = new PermisoControllerApi(settings)

export const obtenerRol = async (filtro = {}) => {
    const response = await apiRol.rolControllerFind(
        filtro.page || 1,
        filtro.limit || 10,
        filtro.search || '',
        filtro.sortBy,
        filtro.sortOrder,
        filtro.filters || {}
    );

    return {
        data: response?.data?.data || [],
        total: response?.data?.total || 0
    };
};

export const obtenerCuentaRol = async (filtro) => {
    const { data: dataRoles } = await apiRol.rolControllerCount(filtro)
    return dataRoles
}

export const postRol = async (objRol) => {
    const { data: dataRol } = await apiRol.rolControllerCreate(objRol)
    return dataRol
}

export const patchRol = async (idRol, objRol) => {
    const { data: dataRol } = await apiRol.rolControllerUpdateById(idRol, objRol)
    return dataRol
}

export const deleteRol = async (idRol) => {
    const { data: dataRol } = await apiRol.rolControllerDeleteById(idRol)
    return dataRol
}

export const buscaPermisosExistente = async (idRol) => {
    const { data: dataRol } = await apiPermisos.permisoControllerFind(JSON.stringify(
        { where: { rolId: idRol } }
    ));
    return dataRol;
};

export const obtenerRolDashboard = async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (usuario) {
        const filtro = {
            filters: {
                id: usuario.rolId
            }
        };

        const rol = await obtenerRol(filtro);

        return (rol && rol.data && rol.data.length > 0)
            ? (rol.data[0].dashboardUrl || '/')
            : '/';
    }
    return '/';
}
