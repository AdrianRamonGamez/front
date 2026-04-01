// Servicio para gestionar las operaciones CRUD de Roles
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://[::1]:8000';

export interface Rol {
    id: number;
    nombre: string;
    activoSn?: string;
    fechaCreacion?: string;
    usuarioCreacion?: number;
    fechaModificacion?: string;
    usuarioModificacion?: number;
}

export interface RolResponse {
    data: Rol[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateRolInput {
    nombre: string;
    activoSn?: string | boolean;
    fechaCreacion?: string;
    usuarioCreacion?: number;
}

export interface UpdateRolInput {
    nombre?: string;
    activoSn?: string | boolean;
    fechaModificacion?: string;
    usuarioModificacion?: number;
}

function getAuthHeaders() {
    if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };

    const token = localStorage.getItem('accessToken');

    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

function handleUnauthorized(response: Response): boolean {

    if (response.status === 401) {

        if (typeof window !== "undefined") {

            localStorage.clear();

            alert("Tu sesión ya no es válida o ha expirado.");

            window.location.href = "/auth/login";

        }

        return true;
    }

    return false;
}

class RolService {

    async getRoles(page: number = 1, limit: number = 10, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: Record<string, string>) {
        try {

            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search }),
                ...(sortBy && { sortBy }),
                ...(sortOrder && { sortOrder }),
            });

            // MISMO FORMATO QUE USUARIOS
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value) {
                        params.append(`filters[${key}]`, value);
                    }
                });
            }

            const url = `${BASE_URL}/rols?${params.toString()}`;

            const response = await fetch(url, {
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                throw new Error(`Error al cargar los roles: ${response.statusText}`);
            }

            const rawData = await response.json();

            let data: Rol[] = [];
            let total = 0;

            if (Array.isArray(rawData)) {
                data = rawData;
                total = rawData.length;
            } else if (rawData.data && Array.isArray(rawData.data)) {
                data = rawData.data;
                total = rawData.total || data.length;
            } else if (rawData.roles && Array.isArray(rawData.roles)) {
                data = rawData.roles;
                total = rawData.total || data.length;
            } else if (rawData.result && Array.isArray(rawData.result)) {
                data = rawData.result;
                total = rawData.total || data.length;
            }

            return {
                data,
                total,
                page,
                limit,
            } as RolResponse;

        } catch (error) {
            console.error('Error en RolService.getRoles:', error);
            throw error;
        }
    }

    async getRolesActivos(): Promise<Rol[]> {
        try {

            const response = await fetch(
                `${BASE_URL}/rols?filter[where][activoSn]=S`,
                {
                    headers: getAuthHeaders(),
                }
            );

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                throw new Error(`Error fetching roles: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error en RolService.getRolesActivos:', error);
            throw error;
        }
    }

    async getRolById(id: number): Promise<Rol> {
        try {

            const response = await fetch(`${BASE_URL}/rols/${id}`, {
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                throw new Error(`Error fetching rol: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Error en RolService.getRolById:', error);
            throw error;
        }
    }

    async createRol(data: CreateRolInput): Promise<Rol> {
        try {

            if (!data.nombre || data.nombre.trim() === '') {
                throw new Error('El nombre del rol es obligatorio');
            }

            if (data.nombre.length > 50) {
                throw new Error('El nombre del rol no puede exceder 50 caracteres');
            }

            const payload = {
                nombre: data.nombre,
                activoSn: data.activoSn === true || data.activoSn === 'S' ? 'S' : 'N',
                ...(data.fechaCreacion && { fechaCreacion: data.fechaCreacion }),
                ...(data.usuarioCreacion && { usuarioCreacion: data.usuarioCreacion }),
            };

            const response = await fetch(`${BASE_URL}/rols`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Error al crear el rol');
            }

            const texto = await response.text();

            if (!texto) {
                return {
                    id: 0,
                    ...payload,
                } as Rol;
            }

            return JSON.parse(texto);

        } catch (error) {
            console.error('Error en RolService.createRol:', error);
            throw error;
        }
    }

    async updateRol(id: number, data: UpdateRolInput): Promise<Rol> {
        try {

            if (data.nombre && data.nombre.length > 50) {
                throw new Error('El nombre del rol no puede exceder 50 caracteres');
            }

            const payload: any = {};

            if (data.nombre) payload.nombre = data.nombre;

            if (data.activoSn !== undefined) {
                payload.activoSn = data.activoSn === true || data.activoSn === 'S' ? 'S' : 'N';
            }

            if (data.fechaModificacion) payload.fechaModificacion = data.fechaModificacion;
            if (data.usuarioModificacion) payload.usuarioModificacion = data.usuarioModificacion;

            const response = await fetch(`${BASE_URL}/rols/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Error al actualizar el rol');
            }

            const texto = await response.text();

            if (!texto) {
                return {
                    id,
                    ...payload,
                } as Rol;
            }

            return JSON.parse(texto);

        } catch (error) {
            console.error('Error en RolService.updateRol:', error);
            throw error;
        }
    }

    async deleteRol(id: number): Promise<void> {
        try {

            const response = await fetch(`${BASE_URL}/rols/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Error al eliminar el rol');
            }

        } catch (error) {
            console.error('Error en RolService.deleteRol:', error);
            throw error;
        }
    }

    async downloadRolesCSV(params?: {
        type?: 'visible' | 'all';
        search?: string;
        filters?: Record<string, string>;
    }): Promise<Blob> {

        try {

            const query = new URLSearchParams();

            //USAR EL TYPE REAL
            query.append('type', params?.type || 'visible');

            if (params?.search) {
                query.append('search', params.search);
            }

            if (params?.filters) {
                query.append('filters', JSON.stringify(params.filters));
            }

            const response = await fetch(`${BASE_URL}/rols/export/csv?${query.toString()}`, {
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                throw new Error(`Error downloading CSV: ${response.statusText}`);
            }

            return await response.blob();

        } catch (error) {
            console.error('Error en RolService.downloadRolesCSV:', error);
            throw error;
        }
    }

    async checkRolExists(nombre: string): Promise<boolean> {
        try {

            const params = new URLSearchParams({
                search: nombre
            });

            const response = await fetch(`${BASE_URL}/rols?${params.toString()}`, {
                headers: getAuthHeaders(),
            });

            if (handleUnauthorized(response)) throw new Error("Unauthorized");

            if (!response.ok) {
                throw new Error('Error comprobando duplicados');
            }

            const data = await response.json();

            const roles: Rol[] = Array.isArray(data)
                ? data
                : data.data || [];

            return roles.some(
                r => r.nombre.toLowerCase() === nombre.toLowerCase()
            );

        } catch (error) {
            console.error('Error en checkRolExists:', error);
            throw error;
        }
    }
}

export default new RolService();