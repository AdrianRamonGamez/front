import { 
  UsuarioControllerApi, 
  settings 
} from "@/app/api-programa";

const apiUsuario = new UsuarioControllerApi(settings);

export const obtenerUsuarios = async (filtro) => {
  const { data } = await apiUsuario.usuarioControllerFind(filtro);
  return data;
};

export const obtenerCuentaUsuarios = async (filtro) => {
  const { data } = await apiUsuario.usuarioControllerCount(filtro);
  return data;
};

export const obtenerUsuarioById = async (id) => {
  const { data } = await apiUsuario.usuarioControllerFindById(id);
  return data;
};

export const postUsuario = async (usuario) => {
  const { data } = await apiUsuario.usuarioControllerCreate(usuario);
  return data;
};

export const patchUsuario = async (id, usuario) => {
  const { data } = await apiUsuario.usuarioControllerUpdateById(id, usuario);
  return data;
};

export const deleteUsuario = async (id) => {
  const { data } = await apiUsuario.usuarioControllerDeleteById(id);
  return data;
};

export const loginUsuario = async (credenciales) => {
  const { data } = await apiUsuario.usuarioControllerLogin(credenciales);
  return data;
};

export const registroUsuario = async (usuario) => {
  const { data } = await apiUsuario.usuarioControllerRegister(usuario);
  return data;
};

export const resetearContrseñaUsuario = async (email) => {
  const { data } = await apiUsuario.usuarioControllerResetPassword({ email });
  return data;
};

export const nuevaContraseñaUsuario = async (token, password) => {
  const { data } = await apiUsuario.usuarioControllerNewPassword({
    token,
    password
  });
  return data;
};

export const obtenerUsuariosCountByRol = async (rolId) => {
  const { data } = await apiUsuario.usuarioControllerCountByRol(rolId);
  return data;
};

export const obtenerVistaUsuarios = async (filtros) => {
  const { data } = await apiUsuario.usuarioControllerVistaEmpresaRolUsuario(filtros);
  return data;
};

export const obtenerVistaUsuariosCount = async (filtros) => {
  const { data } = await apiUsuario.usuarioControllerVistaEmpresaRolUsuarioCount(filtros);
  return data;
};

export const obtenerUsuarioAvatar = async (id) => {
  const { data } = await apiUsuario.usuarioControllerObtenerUsuarioAvatar(id);
  return data;
};

export const obtenerUsuariosCSV = async (params) => {
  const { data } = await apiUsuario.usuarioControllerExportCSV(params);
  return data;
};