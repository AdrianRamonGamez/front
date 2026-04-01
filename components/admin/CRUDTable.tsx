'use client';

import React, { useState, useRef } from 'react';
import { DataTable, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { Paginator, PaginatorPageChangeEvent } from 'primereact/paginator';
import styles from './CRUDTable.module.css';
import { Dialog } from 'primereact/dialog';

export interface CRUDTableProps<T> {
    title: string;
    data: T[];
    columns: ColumnDef<T>[];

    onNew?: () => void;
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    onView?: (row: T) => void;

    loading: boolean;
    total: number;
    page: number;
    rows: number;

    onPageChange: (event: PaginatorPageChangeEvent) => void;
    onRowsPerPageChange: (rows: number) => void;

    //AHORA TIPADO CORRECTAMENTE
    onSearch: (params: {
        global: string;
        filters: Record<string, string>;
    }) => void;

    onSort?: (field: string, order: 'asc' | 'desc' | null) => void;

    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    onDownloadCSV?: (type: 'visible' | 'all') => Promise<void> | void;
    searchPlaceholder?: string;
}

export interface ColumnDef<T> {
    field: string;
    header: string;
    sortable?: boolean;
    searchable?: boolean;
    width?: string;
    visible?: boolean;
    template?: (rowData: T, column: ColumnDef<T>) => React.ReactNode;
}

export function CRUDTable<T extends { id?: number | string }>({

    title,
    data,
    columns,
    onNew,
    onEdit,
    onDelete,
    onView,
    loading,
    total,
    page,
    rows,
    onPageChange,
    onRowsPerPageChange,
    onSearch,
    onSort,
    sortField,
    sortOrder,
    onDownloadCSV,
    searchPlaceholder = 'Buscar en todas las columnas...',

}: CRUDTableProps<T>) {

    const [globalSearch, setGlobalSearch] = useState('');
    const [showCsvDialog, setShowCsvDialog] = useState(false);
    const toastRef = useRef<Toast>(null);

    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const currentUserId =
        typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('userData') || '{}')?.id
            : null;

    // =============================
    // SEARCH GLOBAL
    // =============================
    const handleSearch = (value: string) => {
        setGlobalSearch(value);

        onSearch({
            global: value,
            filters: columnFilters
        });
    };

    // =============================
    // COLUMN FILTERS
    // =============================
    const handleColumnFilterChange = (field: string, value: string) => {
        setColumnFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const applyColumnFilter = () => {
        onSearch({
            global: globalSearch,
            filters: columnFilters
        });

        setActiveFilter(null);
    };

    const clearColumnFilter = (field: string) => {
        const updated = { ...columnFilters, [field]: '' };
        setColumnFilters(updated);

        onSearch({
            global: globalSearch,
            filters: updated
        });
    };

    // =============================
    // DOWNLOAD CSV
    // =============================
    const handleDownloadCSV = async (type: 'visible' | 'all') => {
        try {
            if (onDownloadCSV) {
                await onDownloadCSV(type);
            }
        } catch (error) {
            console.error(error);

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo descargar el CSV',
                life: 3000,
            });
        }
    };

    const handleDelete = (row: T) => {
        if (onDelete) onDelete(row);
    };

    const handleClearFilters = () => {
        setGlobalSearch('');
        setColumnFilters({});

        onSearch({
            global: '',
            filters: {}
        });

        //FORZAR ORDEN ALFABÉTICO
        if (onSort) onSort('nombre', 'asc');
    };

    // =============================
    // SORT CONTROLADO
    // =============================
    const handleSort = (e: DataTableSortEvent) => {
        const field = e.sortField;
        const order = e.sortOrder === 1 ? 'asc' : 'desc';

        onSort?.(field, order);
    };

    // =============================
    // TOOLBAR
    // =============================
    const leftToolbarTemplate = () => (
        <>
            <Button label="Nuevo" icon="pi pi-plus" severity="success" onClick={onNew} className="mr-2" />
            <Button label="Exportar CSV" icon="pi pi-download" onClick={() => setShowCsvDialog(true)} />
        </>
    );

    const rightToolbarTemplate = () => (
        <Button label="Limpiar Filtros" icon="pi pi-times" severity="danger" onClick={handleClearFilters} />
    );

    // =============================
    // ACTIONS
    // =============================
    const actionsTemplate = (row: T) => {
        const isCurrentUser = row.id === currentUserId;

        return (
            <div className={styles.cellWithActions}>
                <div className={styles.actions}>
                    {onView && (
                        <Button icon="pi pi-eye" severity="info" onClick={() => onView(row)} className="p-button-sm p-button-rounded" />
                    )}

                    {onEdit && (
                        <Button icon="pi pi-pencil" severity="success" onClick={() => onEdit(row)} className="p-button-sm p-button-rounded" />
                    )}

                    {onDelete && !isCurrentUser && (
                        <Button icon="pi pi-trash" severity="warning" onClick={() => handleDelete(row)} className="p-button-sm p-button-rounded" />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>

            <Toast ref={toastRef} />

            <div className={styles.header}>
                <h1>{title}</h1>
            </div>

            <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className={styles.toolbar} />

            <div className={styles.searchContainer}>
                <InputText
                    placeholder={searchPlaceholder}
                    value={globalSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.tableContainer}>

                <DataTable
                    value={data}
                    loading={loading}
                    paginator={false}
                    rows={rows}
                    sortMode="single"
                    onSort={handleSort}
                    sortField={sortField}
                    sortOrder={sortOrder === 'asc' ? 1 : -1}
                    emptyMessage="No se encontraron resultados"
                >

                    {columns
                        .filter(col => col.visible !== false)
                        .map((col) => (

                            <Column
                                key={col.field}
                                field={col.field}
                                sortable={col.sortable}
                                style={{ width: col.width }}

                                header={
                                    <div
                                        className={styles.headerCell}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span>{col.header}</span>

                                        {col.searchable && (
                                            <i
                                                className={`pi pi-filter ${styles.filterIcon}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveFilter(activeFilter === col.field ? null : col.field);
                                                }}
                                            />
                                        )}

                                        {activeFilter === col.field && (
                                            <div className={styles.filterPopup}>
                                                <InputText
                                                    placeholder={`Buscar por ${col.header}`}
                                                    value={columnFilters[col.field] || ''}
                                                    onChange={(e) =>
                                                        handleColumnFilterChange(col.field, e.target.value)
                                                    }
                                                />

                                                <div className={styles.filterActions}>
                                                    <Button label="Limpiar" size="small" onClick={() => clearColumnFilter(col.field)} />
                                                    <Button label="Aplicar" size="small" onClick={applyColumnFilter} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                }

                                body={
                                    col.template
                                        ? (rowData: T) => col.template!(rowData, col)
                                        : undefined
                                }
                            />
                        ))}

                    <Column
                        header="Acciones"
                        body={(rowData) => actionsTemplate(rowData)}
                        style={{ width: '200px' }}
                        exportable={false}
                    />

                </DataTable>

            </div>

            <div className={styles.pagination}>

                <Paginator
                    first={(page - 1) * rows}
                    rows={rows}
                    totalRecords={total}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(e) => onPageChange(e)}
                />

                <Dialog
                    header="Descargar archivo CSV"
                    visible={showCsvDialog}
                    style={{ width: '400px' }}
                    modal
                    onHide={() => setShowCsvDialog(false)}
                >
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <Button label="Registros mostrados" icon="pi pi-download" onClick={async () => {
                            await handleDownloadCSV('visible');
                            setShowCsvDialog(false);
                        }} />

                        <Button label="Todos los registros" icon="pi pi-download" onClick={async () => {
                            await handleDownloadCSV('all');
                            setShowCsvDialog(false);
                        }} />
                    </div>
                </Dialog>

            </div>

        </div>
    );
}