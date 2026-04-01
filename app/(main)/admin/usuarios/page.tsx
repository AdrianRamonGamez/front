'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { PaginatorPageChangeEvent } from 'primereact/paginator';
import { CRUDTable, ColumnDef } from '@/components/admin/CRUDTable';
import { FormDialog, FormField } from '@/components/admin/FormDialog';
import UsuarioService, {
    Usuario,
    CreateUsuarioInput,
    UpdateUsuarioInput
} from '@/services/UsuarioService';
import RolService, { Rol } from '@/services/RolService';
import styles from './page.module.css';
import { Password } from 'primereact/password';

export default function UsuariosPage() {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://[::1]:8000';
    const currentUserId =
        typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('userData') || '{}')?.id
            : null;
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(10);
    const [search, setSearch] = useState('');
    const [permissions, setPermissions] = useState<any>({});
    const [sortBy, setSortBy] = useState('nombre');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [view, setView] = useState<'table' | 'form'>('table');

    const toastRef = useRef<Toast>(null);

    // =============================
    // LOAD ROLES
    // =============================
    const loadRoles = async () => {

        try {

            const response = await RolService.getRoles(1, 100);

            // SOLO roles activos
            const rolesActivos = (response.data || [])
                .filter((rol) => rol.activoSn === 'S')
                .sort((a, b) => a.nombre.localeCompare(b.nombre)); //orden alfabético

            setRoles(rolesActivos);

        } catch {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los roles',
                life: 3000,
            });

        }

    };

    // =============================
    // LOAD USERS
    // =============================
    const loadUsuarios = async () => {

        setLoading(true);

        try {

            const response = await UsuarioService.getUsuarios(
                page,
                rows,
                search,
                sortBy,
                sortOrder,
                filters
            );

            setUsuarios(response.data);
            setTotal(response.total);

        } catch (error) {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail:
                    error instanceof Error
                        ? error.message
                        : 'Error al cargar usuarios',
                life: 3000,
            });

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        loadRoles();
    }, []);

    useEffect(() => {
        loadUsuarios();
    }, [page, rows, search, sortBy, sortOrder, filters]);

    useEffect(() => {
        const loadPermissions = async () => {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');

            if (!userData?.rolId) return;

            const res = await fetch(`${BASE_URL}/permisos/por-rol/${userData.rolId}`);
            const data = await res.json();

            const transformed: any = {};

            for (const modulo in data) {
                transformed[modulo] = {};

                for (const accion in data[modulo]) {
                    transformed[modulo][accion] = data[modulo][accion] === true;
                }
            }

            setPermissions(data);
        };

        loadPermissions();
    }, []);

    // =============================
    // CRUD ACTIONS
    // =============================
    const handleNew = () => {

        setSelectedUsuario(null);
        setIsViewOnly(false);

        setView('form');

    };

    const handleEdit = (usuario: Usuario) => {

        setSelectedUsuario(usuario);
        setIsViewOnly(false);

        setView('form');

    };

    const handleView = (usuario: Usuario) => {

        setSelectedUsuario(usuario);
        setIsViewOnly(true);

        setView('form');

    };

    const handleDownloadCSV = async (type: 'visible' | 'all') => {
        await UsuarioService.exportCSV({
            type,
            page,
            rows,
            search,
            sortBy,
            sortOrder,
            filters
        });
    };

    const handleDelete = (usuario: Usuario) => {

        confirmDialog({

            message: `¿Eliminar el usuario "${usuario.nombre}"?`,
            header: 'Confirmar',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí',
            rejectLabel: 'No',

            accept: async () => {

                try {

                    await UsuarioService.deleteUsuario(usuario.id);

                    toastRef.current?.show({
                        severity: 'success',
                        summary: 'Usuario eliminado',
                        detail: 'El usuario se eliminó correctamente',
                        life: 3000,
                    });

                    loadUsuarios();

                } catch (error: any) {

                    let message = 'Error al eliminar';

                    //Detecta que hay campos relacionados que impiden la eliminación (foreign key)
                    if (error?.response?.data?.message) {
                        message = error.response.data.message;
                    }

                    toastRef.current?.show({
                        severity: 'error',
                        summary: 'No se puede eliminar',
                        detail: message,
                        life: 4000,
                    });

                }

            },

        });

    };

    // =============================
    // SAVE
    // =============================
    const handleSaveUsuario = async (formData: Record<string, any>) => {

        try {

            let avatarUrl = selectedUsuario?.avatarUrl;

            // =============================
            // SUBIR AVATAR SI EXISTE
            // =============================
            if (avatarFile) {

                const formDataAvatar = new FormData();
                formDataAvatar.append('file', avatarFile);

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/upload-avatar/${selectedUsuario?.id}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
                        },
                        body: formDataAvatar
                    }
                );

                if (!res.ok) {
                    throw new Error('Error subiendo avatar');
                }

                const data = await res.json();
                avatarUrl = data.url; //ajusta si tu backend devuelve otro campo
            }

            // =============================
            // UPDATE
            // =============================
            if (selectedUsuario) {

                const updateData: UpdateUsuarioInput = {

                    nombre: formData.nombre,
                    mail: formData.mail,
                    telefono: formData.telefono,
                    rolId: formData.rolId,
                    activoSn: formData.activo ? 'S' : 'N',
                    movil: formData.movil,
                    apellidos: formData.apellidos,

                    //IMPORTANTE
                    avatarUrl: avatarUrl
                };

                await UsuarioService.updateUsuario(
                    selectedUsuario.id,
                    updateData
                );

                // PASSWORD
                const password = formData.password?.trim();

                if (password) {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/usuarioCredenciales/${selectedUsuario.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
                        },
                        body: JSON.stringify({
                            password: password
                        })
                    });
                }

                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Usuario actualizado',
                    detail: 'El usuario se actualizó correctamente',
                    life: 3000,
                });

            } else {

                const createData: CreateUsuarioInput = {

                    nombre: formData.nombre,
                    apellidos: formData.apellidos,
                    mail: formData.mail,
                    movil: formData.movil,
                    telefono: formData.telefono,
                    rolId: formData.rolId,
                    password: formData.password,
                    activoSn: formData.activo ? 'S' : 'N',

                    //IMPORTANTE TAMBIÉN AQUÍ
                    avatarUrl: avatarUrl
                };

                await UsuarioService.createUsuario(createData);

                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Usuario creado',
                    detail: 'El usuario se creó correctamente',
                    life: 3000,
                });

            }

            //LIMPIAR ESTADO
            setAvatarFile(null);
            setAvatarPreview(null);

            setView('table');
            loadUsuarios();

        } catch (error) {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail:
                    error instanceof Error
                        ? error.message
                        : 'Error al guardar usuario',
                life: 3000,
            });

        }
    };

    // =============================
    // TABLE HANDLERS
    // =============================
    const handlePageChange = (event: PaginatorPageChangeEvent) => {
        setPage(event.page + 1); // aquí sumamos +1 porque PrimeReact empieza en 0
        setRows(event.rows);
    };

    const handleRowsPerPageChange = (newRows: number) => {

        setRows(newRows);
        setPage(1);

    };

    const handleSearch = (params: {
        global: string;
        filters: Record<string, string>;
    }) => {

        setSearch(params.global);
        setFilters(params.filters); // puedes usar esto para filtros específicos por campo si lo deseas
        setPage(1);
    };

    const handleSort = (field: string, order: 'asc' | 'desc' | null) => {
        if (!field || !order) {
            setSortBy('id');
            setSortOrder('desc');
            //setPage(1); // quita esta línea si no quieres resetear a página 1
            return;
        }

        setSortBy(field);
        setSortOrder(order);
    };

    const validatePassword = (value: string) => {
        if (!value) return 'La contraseña es obligatoria';

        // Mínimo 8 caracteres, al menos una letra, un número y un caracter especial
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=:;?<>])[A-Za-z\d!@#$%^&*()_\-+=:;?<>]{8,}$/;

        if (!regex.test(value)) {
            return 'La contraseña debe tener mínimo 8 caracteres, incluyendo letras, números y un caracter especial';
        }

        return null;
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarFile(file);

        const reader = new FileReader();
        reader.onload = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // =============================
    // FORM FIELDS
    // =============================
    const usuarioFields: FormField[] = [

        { name: 'nombre', label: 'Nombre', type: 'text', required: true },

        { name: 'apellidos', label: 'Apellidos', type: 'text', required: false }, // NUEVO: campo opcional

        { name: 'mail', label: 'Email', type: 'email', required: true },

        { name: 'movil', label: 'Móvil', type: 'phone', required: false, placeholder: 'Ej: +34 600123456' }, // NUEVO: campo opcional

        {
            name: 'telefono',
            label: 'Teléfono',
            type: 'text',
            required: false,
            placeholder: 'Ej: 600123456',
            validate: (value) => {
                if (!value) return null;

                const regex = /^[67]\d{8}$/;

                if (!regex.test(value)) {
                    return 'El teléfono debe empezar por 6 o 7 y tener 9 dígitos';
                }

                return null;
            }
        },

        {
            name: 'rolId',
            label: 'Rol',
            type: 'select',
            required: true,
            options: roles.map((rol) => ({
                label: rol.nombre,
                value: rol.id,
            })),
        },

        {
            name: 'password',
            label: selectedUsuario ? 'Nueva Contraseña' : 'Contraseña',
            type: 'password',
            required: !selectedUsuario,
            validate: (value) => {
                if (!value && !selectedUsuario) return 'La contraseña es obligatoria';
                if (value && value.length > 0) return validatePassword(value);
                return null;
            },
        },

        {
            name: 'activo',
            label: 'Activo',
            type: 'boolean',
            disabled: selectedUsuario?.id === currentUserId //BLOQUEO AQUÍ
        },

    ];

    // =============================
    // TABLE COLUMNS
    // =============================
    const columns: ColumnDef<Usuario>[] = [

        { field: 'id', header: 'ID', sortable: true, visible: false },

        { field: 'nombre', header: 'Nombre', sortable: true, searchable: true },

        { field: 'apellidos', header: 'Apellidos', sortable: true, searchable: true },

        { field: 'mail', header: 'Email', sortable: true, searchable: true },

        { field: 'telefono', header: 'Teléfono', sortable: true, searchable: true },

        { field: 'movil', header: 'Móvil', sortable: true, searchable: true },

        {
            field: 'rolId', header: 'Rol', sortable: true, searchable: true, template: (rowData) => {

                const rol = roles.find((r) => r.id === rowData.rolId);
                return rol ? rol.nombre : 'N/A';
            }
        },

        {
            field: 'activoSn',
            header: 'Estado',
            sortable: true,
            searchable: true,
            width: '120px',
            template: (rowData) => (
                <span className={rowData.activoSn === 'S' ? styles.badgeActive : styles.badgeInactive}>
                    {rowData.activoSn === 'S' ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },

    ];

    if (!permissions?.Usuarios?.Acceder) {
        return null;
    }

    return (
        <div className={styles.container}>

            <Toast ref={toastRef} />
            <ConfirmDialog />

            {view === 'table' && (
                <>
                    <CRUDTable<Usuario>
                        title="Gestión de Usuarios"
                        data={usuarios}
                        columns={columns}
                        loading={loading}
                        total={total}
                        page={page}
                        rows={rows}
                        sortField={sortBy}
                        sortOrder={sortOrder}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        onSearch={handleSearch}
                        onSort={handleSort}
                        onNew={handleNew}
                        onEdit={handleEdit}
                        onView={handleView}
                        onDelete={handleDelete}
                        onDownloadCSV={handleDownloadCSV}
                        permissions={permissions}
                        module='Usuarios'
                    />

                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                        Usuarios: {total}
                    </div>
                </>
            )}

            {view === 'form' && (
                <div>

                    {/* AVATAR */}
                    <div className={styles.avatarContainer}>

                        <div className={styles.avatarWrapper}>
                            <img
                                src={
                                    avatarPreview ||
                                    selectedUsuario?.avatarUrl ||
                                    '/demo/images/avatar/stephenshaw.png'
                                }
                                className={styles.avatar}
                            />

                            {!isViewOnly && (
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                />
                            )}
                        </div>

                        <div className={styles.avatarInfo}>
                            <Tag
                                value={
                                    selectedUsuario?.activoSn === 'S'
                                        ? 'Activo'
                                        : 'Inactivo'
                                }
                                severity={
                                    selectedUsuario?.activoSn === 'S'
                                        ? 'success'
                                        : 'danger'
                                }
                            />
{/*
                            {!isViewOnly && (
                                <button
                                    className={styles.avatarButton}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Cambiar
                                </button>
                            )}*/}
                        </div>

                    </div>

                    {/* FORM */}
                    <FormDialog
                        inline
                        key={selectedUsuario?.id || 'new'}
                        visible={true}
                        title={
                            selectedUsuario
                                ? 'Editar Usuario'
                                : 'Nuevo Usuario'
                        }
                        fields={usuarioFields}
                        data={
                            selectedUsuario
                                ? {
                                    ...selectedUsuario,
                                    password: '',
                                    activo: selectedUsuario.activoSn === 'S',
                                }
                                :
                                {
                                    password: ''
                                }}
                        onHide={() => {
                            setAvatarPreview(null);
                            setAvatarFile(null);
                            setView('table');
                        }}
                        onSave={handleSaveUsuario}
                        isViewOnly={isViewOnly}
                        loading={loading}
                    />

                </div>
            )}

        </div>
    );

}