// Servicio de autenticación
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://[::1]:8000';

export interface LoginCredentials {
    mail: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    expiresIn: string;
    refreshToken: string;
    userData: {
        id: number;
        nombre: string;
        apellido: string;
        mail: string;
        activo: boolean;
    };
}

class AuthService {
    /**
     * Login de usuario
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const response = await fetch(`${BASE_URL}/usuarios/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mail: credentials.mail,
                    password: credentials.password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Credenciales inválidas');
            }

            const data = await response.json() as LoginResponse;

            // Guardar tokens en localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken ?? '');
                localStorage.setItem('userData', JSON.stringify(data.userData));
                localStorage.setItem('expiresIn', data.expiresIn);
            }

            return data;
        } catch (error) {
            console.error('Error en AuthService.login:', error);
            throw error;
        }
    }

    /**
     * Logout de usuario
     */
    logout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('expiresIn');
            window.location.href = '/auth/login';
        }
    }

    /**
     * Obtiene el token del localStorage
     */
    getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated(): boolean {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('accessToken');
    }

    /**
     * Obtiene los datos del usuario autenticado
     */
    getUserData() {
        if (typeof window === 'undefined') return null;
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    resetPassword = async (email: string): Promise<{ message: string }> => {
        try {
            const response = await fetch(`${BASE_URL}/usuarios/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al enviar el email');
            }

            return data;

        } catch (error: any) {
            console.error('Error en resetPassword:', error);
            throw error;
        }
    };
}

export default new AuthService();
