// Servicio para gestionar las operaciones CRUD de Usuarios
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://[::1]:8000';

export interface Usuario {
    id: number;
    nombre: string;
    mail: string;
    activoSn: 'S' | 'N';
    rolId: number;
    usuarioCreacion: string;
    fechaCreacion: string;
    usuarioModificacion?: string;
    fechaModificacion?: string;
    telefono?: string; // NUEVO: teléfono opcional
    apellidos?: string; // NUEVO: apellido opcional
    movil?: string; // NUEVO: móvil opcional
}

export interface UsuarioResponse {
    data: Usuario[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateUsuarioInput {
    nombre: string;
    apellidos?: string; // NUEVO: apellido opcional
    movil?: string; // NUEVO: móvil opcional
    mail: string;
    rolId: number;
    password: string;
    activoSn: 'S' | 'N';
    telefono?: string; // NUEVO: teléfono opcional
}

export interface UpdateUsuarioInput {
    nombre?: string;
    apellidos?: string; // NUEVO: apellido opcional
    movil?: string; // NUEVO: móvil opcional
    mail?: string;
    rolId?: number;
    password?: string;
    activoSn?: 'S' | 'N';
    telefono?: string; // NUEVO: teléfono opcional
}

function getAuthHeaders(): HeadersInit {

    const headers: HeadersInit = {
        "Content-Type": "application/json"
    };

    if (typeof window !== "undefined") {

        const token = localStorage.getItem("accessToken");

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

    }

    return headers;
}

function handleUnauthorized(response: Response) {

    if (response.status === 401) {

        if (typeof window !== "undefined") {

            localStorage.clear();

            alert("Tu sesión ya no es válida o el usuario ha sido eliminado.");

            window.location.href = "/auth/login";

        }

        return true;
    }

    return false;
}

class UsuarioService {
    /**
     * Obtiene lista paginada de usuarios
     */
    async getUsuarios(page: number = 1, limit: number = 10, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: Record<string, string>) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search }),
                ...(sortBy && { sortBy }),
                ...(sortOrder && { sortOrder })
            });

            //Añadir filtros dinámicamente
            if (filters) {
                Object.keys(filters).forEach((key) => {
                    const value = filters[key];
                    if (value) {
                        params.append(`filters[${key}]`, value);
                    }
                });
            }

            const response = await fetch(`${BASE_URL}/usuarios?${params.toString()}`, {
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) return;

            if (!response.ok) {
                throw new Error(`Error al cargar usuarios: ${response.statusText}`);
            }

            const result = await response.json();

            if (Array.isArray(result)) {
                return {
                    data: result,
                    total: result.length
                };
            }

            return result;

        } catch (error) {
            console.error('Error en UsuarioService.getUsuarios:', error);
            throw error;
        }
    }

    /**
     * Obtiene un usuario por ID
     */
    async getUsuarioById(id: number): Promise<Usuario> {
        try {
            const response = await fetch(`${BASE_URL}/usuarios/${id}`, {
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) return {} as Usuario;

            if (!response.ok) {
                throw new Error(`Error fetching usuario: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en UsuarioService.getUsuarioById:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo usuario
     */
    async createUsuario(data: CreateUsuarioInput): Promise<Usuario> {
        try {

            const body = {
                nombre: data.nombre,
                apellidos: data.apellidos, // NUEVO: incluir apellido
                mail: data.mail,
                password: data.password,
                rolId: data.rolId,
                movil: data.movil, // NUEVO: incluir móvil
                telefono: data.telefono, // NUEVO: incluir teléfono
                activoSn: data.activoSn ?? 'S'
            };

            const response = await fetch(`${BASE_URL}/usuarios/register`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(body),
            });

            const responseText = await response.text();
            console.log("RESPUESTA BACKEND:", responseText);

            if (!response.ok) {
                throw new Error(responseText);
            }

            const result = JSON.parse(responseText);

            return result.user ?? result;

        } catch (error) {
            console.error('Error en UsuarioService.createUsuario:', error);
            throw error;
        }
    }

    /**
     * Actualiza un usuario existente
     */
    async updateUsuario(id: number, data: UpdateUsuarioInput): Promise<Usuario> {
        try {

            const cleanData = Object.fromEntries(
                Object.entries(data).filter(
                    ([_, v]) => v !== undefined
                )
            );

            const response = await fetch(`${BASE_URL}/usuarios/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(cleanData),
            });

            if (handleUnauthorized(response)) return {} as Usuario;

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar el usuario');
            }

            if (response.status === 204) {
                return {} as Usuario;
            }

            return await response.json();

        } catch (error) {
            console.error('Error en UsuarioService.updateUsuario:', error);
            throw error;
        }
    }
    /**
     * Elimina un usuario por ID
     */
    async deleteUsuario(id: number): Promise<void> {
        try {
            const response = await fetch(`${BASE_URL}/usuarios/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (handleUnauthorized(response)) return;
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el usuario');
            }
        } catch (error) {
            console.error('Error en UsuarioService.deleteUsuario:', error);
            throw error;
        }
    }

    /**
     * Descarga los usuarios en formato CSV
     */
    async exportCSV(params: {
        type: 'visible' | 'all';
        page: number;
        rows: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        filters?: Record<string, string>;
    }): Promise<void> {
        try {
            const query = new URLSearchParams({
                type: params.type,
                page: params.page.toString(),
                rows: params.rows.toString(),
                ...(params.search && { search: params.search }),
                ...(params.sortBy && { sortBy: params.sortBy }),
                ...(params.sortOrder && { sortOrder: params.sortOrder }),
            });

            // AÑADIR ESTO
            if (params.filters) {
                query.append('filters', JSON.stringify(params.filters));
            }

            const response = await fetch(`${BASE_URL}/usuarios/export-csv?${query}`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Error downloading CSV: ${response.statusText}`);
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download = 'usuarios.csv';
            a.click();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error en UsuarioService.exportCSV:', error);
            throw error;
        }
    }

    // NUEVO: Cuenta cuántos usuarios hay asociados a un rol específico
    async countUsuariosByRol(rolId: number): Promise<number> {

        const response = await fetch(`${BASE_URL}/usuarios/count-by-rol/${rolId}`, {
            headers: getAuthHeaders(),
        });

        if (handleUnauthorized(response)) return 0;

        if (!response.ok) {
            throw new Error('Error comprobando usuarios del rol');
        }

        const data = await response.json();

        return data.count;
    }

    /**
     * Valida que el email tenga formato correcto
     */
    private isValidEmail(mail: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(mail);
    }
}

export default new UsuarioService();
