'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { PaginatorPageChangeEvent } from 'primereact/paginator';
import { CRUDTable, ColumnDef } from '@/components/admin/CRUDTable';
import { FormDialog, FormField } from '@/components/admin/FormDialog';
import RolService, { Rol, CreateRolInput, UpdateRolInput } from '@/services/RolService';
import styles from './page.module.css';
import UsuarioService from '@/services/UsuarioService';

const getRolFields = (rol?: Rol | null) => {
    return [
        {
            name: 'nombre',
            label: 'Nombre del Rol',
            type: 'text',
            required: true,
            placeholder: 'Ej: Administrador',
            helperText: 'Máximo 50 caracteres',
        },
        {
            name: 'activoSn',
            label: 'Estado',
            type: 'boolean',
            placeholder: 'Activo',
            disabled: rol?.nombre === 'Supervisor', //AQUÍ
        },
    ];
};

export default function RolesPage() {

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://[::1]:8000';

    const isDuplicateRole = (nombre: string, excludeId?: number) => {
        return roles.some((r) => {
            const sameName = r.nombre.toLowerCase() === nombre.toLowerCase();
            const isNotCurrent = excludeId ? r.id !== excludeId : true;
            return sameName && isNotCurrent;
        });
    };
    const [permissions, setPermissions] = useState<any>({});
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState(10);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('nombre');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [selectedRol, setSelectedRol] = useState<Rol | null>(null);
    const [isViewOnly, setIsViewOnly] = useState(false);

    const [view, setView] = useState<'table' | 'form'>('table');

    const toastRef = useRef<Toast>(null);

    // =============================
    // LOAD ROLES
    // =============================
    const loadRoles = async () => {

        setLoading(true);


        try {

            const response = await RolService.getRoles(page, rows, search, sortBy, sortOrder, filters);

            setRoles(response.data || []);
            setTotal(response.total || 0);

        } catch (error) {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : 'Error al cargar los roles',
                life: 3000,
            });

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        loadRoles();


    }, [page, rows, search, sortBy, sortOrder, filters]);

    useEffect(() => {
        const loadPermissions = async () => {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');

            if (!userData?.rolId) return;

            const res = await fetch(`${BASE_URL}/permisos/por-rol/${userData.rolId}`);
            const data = await res.json();

            const transformed: any = {};

            setPermissions(data);
        };

        loadPermissions();
    }, []);

    // =============================
    // CRUD ACTIONS
    // =============================
    const handleNew = () => {

        setSelectedRol(null);
        setIsViewOnly(false);

        setView('form');

    };

    const handleEdit = (rol: Rol) => {

        setSelectedRol(rol);
        setIsViewOnly(false);

        setView('form');

    };

    const handleView = (rol: Rol) => {

        setSelectedRol(rol);
        setIsViewOnly(true);

        setView('form');

    };

    const handleDelete = async (rol: Rol) => {

        //No se puede eliminar el rol Supervisor
        if (rol.nombre === 'Supervisor') {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Acción no permitida',
                detail: 'El rol Supervisor no se puede eliminar',
                life: 4000,
            });
            return;
        }

        try {

            const count = await UsuarioService.countUsuariosByRol(rol.id);

            //Bloqueo si tiene usuarios
            if (count > 0) {
                toastRef.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se puede eliminar el rol porque está asignado a uno o más usuarios',
                    life: 4000,
                });
                return;
            }

            //Confirmación y eliminación
            confirmDialog({
                message: `¿Seguro que deseas eliminar el rol "${rol.nombre}"?`,
                header: 'Confirmar eliminación',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Sí',
                rejectLabel: 'No',

                accept: async () => {
                    await RolService.deleteRol(rol.id);

                    toastRef.current?.show({
                        severity: 'success',
                        summary: 'Rol eliminado',
                        detail: 'El rol se eliminó correctamente',
                        life: 3000,
                    });

                    loadRoles();
                },
            });

        } catch {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo verificar el rol',
                life: 3000,
            });
        }
    };

    // =============================
    // SAVE
    // =============================
    const handleSaveRol = async (formData: Record<string, any>) => {

        try {

            const nombre = formData.nombre?.trim();

            if (!nombre) {
                toastRef.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'El nombre es obligatorio',
                    life: 3000,
                });
                return;
            }

            // =============================
            // VALIDACIÓN DUPLICADOS
            // =============================
            if (selectedRol) {

                const duplicate = isDuplicateRole(nombre, selectedRol.id);

                if (duplicate) {
                    toastRef.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Ya existe un rol con ese nombre',
                        life: 3000,
                    });
                    return;
                }

            } else {

                const duplicate = isDuplicateRole(nombre);

                if (duplicate) {
                    toastRef.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Ya existe un rol con ese nombre',
                        life: 3000,
                    });
                    return;
                }

            }

            // =============================
            // SI ESTAMOS EDITANDO
            // =============================
            if (selectedRol) {

                const nuevoEstado = formData.activoSn ? 'S' : 'N';

                if (nuevoEstado === 'N') {

                    const count = await UsuarioService.countUsuariosByRol(selectedRol.id);

                    if (count > 0) {

                        confirmDialog({

                            message: `Este rol está asignado a ${count} usuario(s). ¿Deseas continuar?`,
                            header: 'Confirmar cambio de estado',
                            icon: 'pi pi-exclamation-triangle',

                            accept: async () => {

                                await RolService.updateRol(selectedRol.id, formData as UpdateRolInput);

                                toastRef.current?.show({
                                    severity: 'success',
                                    summary: 'Rol actualizado',
                                    detail: `El rol "${nombre}" se actualizó correctamente`,
                                    life: 3000,
                                });

                                setView('table');
                                loadRoles();
                            },

                        });

                        return;
                    }
                }

                await RolService.updateRol(selectedRol.id, formData as UpdateRolInput);

                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Rol actualizado',
                    detail: `El rol "${nombre}" se actualizó correctamente`,
                    life: 3000,
                });

            } else {

                // =============================
                // CREAR ROL
                // =============================

                await RolService.createRol(formData as CreateRolInput);

                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Rol creado',
                    detail: `El rol "${nombre}" se creó correctamente`,
                    life: 3000,
                });

            }

            setView('table');
            loadRoles();

        } catch (error) {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : 'Error al guardar el rol',
                life: 3000,
            });

        }
    };

    const handleDownloadCSV = async (type: 'visible' | 'all') => {

        try {

            const blob = await RolService.downloadRolesCSV({
                type,
                ...(type === 'visible' && {
                    search,
                    filters
                })
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = `roles_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo descargar el CSV',
                life: 3000,
            });

        }
    };

    // =============================
    // TABLE COLUMNS
    // =============================
    const columns: ColumnDef<Rol>[] = [

        {
            field: 'id',
            header: 'ID',
            visible: false,
            sortable: true,
            searchable: true,
            width: '80px',
        },

        {
            field: 'nombre',
            header: 'Nombre',
            sortable: true,
            searchable: true,
            width: '200px',
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

    const handlePageChange = (event: PaginatorPageChangeEvent) => {
        setPage(event.page + 1);
        setRows(event.rows);
    };

    if (!permissions?.Roles?.Acceder) {
        return null;
    }

    return (

        <div className={styles.container}>

            <Toast ref={toastRef} />
            <ConfirmDialog />

            {view === 'table' && (
                <>
                    <CRUDTable<Rol>
                        title="Gestión de Roles"
                        data={roles}
                        columns={columns}
                        loading={loading}
                        total={total}
                        page={page}
                        rows={rows}
                        permissions={permissions}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={(r) => {
                            setRows(r);
                            setPage(1);
                        }}
                        onSearch={(params: { global: string; filters: Record<string, string> }) => {
                            setSearch(params.global);
                            setFilters(params.filters);
                            setPage(1);
                        }}
                        onSort={(field, order) => {
                            if (!field || !order) {
                                setSortBy('id');
                                setSortOrder('desc');
                                setPage(1);
                                return;
                            }

                            setSortBy(field);
                            setSortOrder(order);
                            setPage(1);
                        }}
                        sortField={sortBy}
                        sortOrder={sortOrder}
                        onNew={handleNew}
                        onEdit={handleEdit}
                        onView={handleView}
                        onDelete={handleDelete}
                        onDownloadCSV={handleDownloadCSV}
                        searchPlaceholder="Buscar por nombre..."
                        module="Roles"
                    />

                    {/*Muestra el total de roles debajo de la tabla*/}
                    <div style={{ marginTop: '1rem', fontWeight: 500, textAlign: 'right' }}>
                        Roles: {total}
                    </div>
                </>
            )}

            {view === 'form' && (

                <FormDialog

                    inline

                    visible={true}

                    title={
                        isViewOnly
                            ? `Ver Rol - ${selectedRol?.nombre}`
                            : selectedRol
                                ? `Editar Rol - ${selectedRol.nombre}`
                                : 'Nuevo Rol'
                    }

                    fields={getRolFields(selectedRol || undefined) as FormField[]}

                    data={selectedRol || undefined}

                    loading={loading}

                    onHide={() => setView('table')}

                    onSave={handleSaveRol}

                    isViewOnly={isViewOnly}

                />

            )}

        </div>

    );

}