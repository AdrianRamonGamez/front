export type PermisoMatrix = {
    [modulo: string]: {
        [accion: string]: {
            [rolId: number]: boolean;
        };
    };
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://[::1]:8000';

export default class PermisoService {

    static async getMatrix(): Promise<PermisoMatrix> {

        const res = await fetch(`${BASE_URL}/permisos/matrix`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
            }
        });

        if (!res.ok) throw new Error('Error cargando permisos');

        return res.json();
    }

    static async updatePermiso(data: {
        modulo: string;
        accion: string;
        rolId: number;
        permitido: boolean;
    }) {

        const res = await fetch(`${BASE_URL}/permisos`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Error actualizando permiso');

        //
        window.dispatchEvent(new Event('permisosUpdated'));
        return res.json();
    }

}