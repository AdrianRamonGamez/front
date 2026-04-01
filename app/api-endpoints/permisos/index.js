import { PermisoControllerApi, settings } from "@/app/api-programa";

const apiPermiso = new PermisoControllerApi(settings);

export const obtenerPermisos = async (filtro) => {
  const { data } = await apiPermiso.permisoControllerFind(filtro);
  return data;
};

export const obtenerCuentaPermisos = async (filtro) => {
  const { data } = await apiPermiso.permisoControllerCount(filtro);
  return data;
};

export const postPermiso = async (permiso) => {
  const { data } = await apiPermiso.permisoControllerCreate(permiso);
  return data;
};

export const patchPermiso = async (id, permiso) => {
  const { data } = await apiPermiso.permisoControllerUpdateById(id, permiso);
  return data;
};

export const deletePermiso = async (id) => {
  const { data } = await apiPermiso.permisoControllerDeleteById(id);
  return data;
};

export const obtenerPermisosPorRol = async (rolId) => {
  const { data } = await apiPermiso.permisoControllerGetPermisosPorRol(rolId);
  return data;
};

export const obtenerPermisosMatrix = async () => {
  const { data } = await apiPermiso.permisoControllerGetMatrix();
  return data;
};

export const actualizarPermisosMasivo = async (permisos) => {
  const { data } = await apiPermiso.permisoControllerUpdateBulk(permisos);
  return data;
};

export const actualizarPermisoMatrix = async (dataPermiso) => {
  const { data } = await apiPermiso.permisoControllerUpdatePermisoMatrix(dataPermiso);
  return data;
};