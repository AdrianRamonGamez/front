'use client';

import React, { useState, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import { Password } from 'primereact/password'; // NUEVO: componente Password de PrimeReact
import styles from './FormDialog.module.css';
import { error } from 'console';

export type FieldType = 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea' | 'select' | 'boolean' | 'phone';

export interface FormField {
    name: string;
    label: string;
    type: FieldType;
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    options?: Array<{ label: string; value: any }>;
    placeholder?: string;
    helperText?: string;
    validate?: (value: any) => string | null;
    disabled?: boolean;
}

export interface FormDialogProps {
    visible: boolean;
    title: string;
    fields: FormField[];
    data?: Record<string, any>;
    loading: boolean;
    onHide: () => void;
    onSave: (formData: Record<string, any>) => Promise<void>;
    isViewOnly?: boolean;

    // NUEVO: permite usar sin popup
    inline?: boolean;
}

const phoneCodes = [
    { label: '🇪🇸 +34', value: '+34' },
    { label: '🇬🇧 +44', value: '+44' },
    { label: '🇫🇷 +33', value: '+33' },
    { label: '🇩🇪 +49', value: '+49' },
    { label: '🇮🇹 +39', value: '+39' },
    { label: '🇲🇽 +52', value: '+52' },
    { label: '🇦🇷 +54', value: '+54' },
    { label: '🇨🇱 +56', value: '+56' }
];

export function FormDialog({
    visible,
    title,
    fields,
    data,
    loading,
    onHide,
    onSave,
    isViewOnly = false,
    inline = false
}: FormDialogProps) {

    const [formData, setFormData] = useState<Record<string, any>>(data || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const toastRef = useRef<Toast>(null);

    // usuario logueado (desde localStorage)
    const currentUserId =
        typeof window !== 'undefined'
            ? Number(JSON.parse(localStorage.getItem('userData') || '{}')?.id)
            : null;

    React.useEffect(() => {

        if (data) {

            const processedData = { ...data };

            fields.forEach((field) => {

                if (field.type === 'boolean' && processedData[field.name] !== undefined) {

                    if (typeof processedData[field.name] === 'string') {
                        processedData[field.name] = processedData[field.name] === 'S';
                    }

                }

            });

            setFormData(processedData);

        } else {

            const newData: Record<string, any> = {};

            fields.forEach((field) => {
                newData[field.name] = field.type === 'boolean' ? false : '';
            });

            setFormData(newData);

        }

        setErrors({});

    }, [data, visible, fields]);

    const validateField = (field: FormField, value: any): string | null => {

        if (field.required && (value === '' || value === null || value === undefined)) {
            return `${field.label} es obligatorio`;
        }

        if (value === '' || value === null || value === undefined) {
            return null;
        }

        if (field.type === 'email') {

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(value)) {
                return `${field.label} no es válido`;
            }

        }

        if (field.pattern) {

            const regex = new RegExp(field.pattern);

            if (!regex.test(value)) {
                return `${field.label} no cumple el formato esperado`;
            }

        }
        

        if (field.type === 'number') {

            if (field.min !== undefined && value < field.min) {
                return `${field.label} debe ser mayor o igual a ${field.min}`;
            }

            if (field.max !== undefined && value > field.max) {
                return `${field.label} debe ser menor o igual a ${field.max}`;
            }

        }

        if (field.validate) {
            return field.validate(value);
        }

        return null;

    };

    const handleFieldChange = (name: string, value: any) => {

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {

            setErrors((prev) => {

                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;

            });

        }

    };

    const validateForm = (): boolean => {

        const newErrors: Record<string, string> = {};

        fields.forEach((field) => {

            const error = validateField(field, formData[field.name]);

            if (error) {
                newErrors[field.name] = error;
            }

        });

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;

    };

    const handleSave = async () => {

        if (!validateForm()) {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Errorr al guardar',
                detail: 'Por favor, revisa los campos',
                life: 4000,
            });

            return;

        }

        setSubmitting(true);

        try {

            await onSave(formData);

            toastRef.current?.show({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Datos guardados',
                life: 3000,
            });

            onHide();

        } catch (error) {

            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : 'Error al guardar',
                life: 3000,
            });

        } finally {

            setSubmitting(false);

        }

    };

    const renderField = (field: FormField) => {

        const hasError = !!errors[field.name];
        const value = formData[field.name];

        // obtener id del registro que se está editando (soporta varios nombres)
        const recordId =
            Number(data?.id ?? data?.usuarioId ?? data?.idUsuario ?? formData?.id ?? formData?.usuarioId);

        // saber si el registro es el del usuario logueado
        const isCurrentUser = Number(formData?.id) === Number(currentUserId);

        // si es el campo activoSn y es el propio usuario → bloquear
        const disableField =
            isViewOnly ||
            loading ||
            (field.name === 'activoSn' && isCurrentUser);

        const commonProps = {
            disabled: disableField,
            className: hasError ? 'p-invalid w-full' : 'w-full',
        };

        switch (field.type) {

            case 'text':
                return (
                    <InputText
                        {...commonProps}
                        value={value || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={!isViewOnly ? field.placeholder : ''}
                    />
                );

            case 'email':
                return (
                    <InputText
                        {...commonProps}
                        type="email"
                        value={value || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={!isViewOnly ? field.placeholder : ''}
                    />
                );

            case 'select':
                return (
                    <Dropdown
                        {...commonProps}
                        value={value}
                        options={field.options || []}
                        onChange={(e) => handleFieldChange(field.name, e.value)}
                        placeholder={!isViewOnly ? field.placeholder : ''}
                    />
                );

            case 'password':

                //OCULTAR EN MODO VISUALIZACIÓN
                if (isViewOnly) return null;

                return (
                    <Password
                        {...commonProps}
                        value={value || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        toggleMask
                        feedback={false}
                        placeholder={field.placeholder}
                    />
                );
            case 'phone':

                const phoneValue = value || '';
                const detected = phoneCodes.find(c => phoneValue.startsWith(c.value));
                const detectedCode = detected ? detected.value : '+34';
                const phoneNumber = detected ? phoneValue.replace(detected.value, '') : phoneValue;

                return (
                    <div style={{ display: 'flex', gap: '8px' }}>

                        <Dropdown
                            value={detectedCode}
                            options={phoneCodes}
                            onChange={(e) => {
                                const newCode = e.value;
                                handleFieldChange(field.name, newCode + phoneNumber);
                            }}
                            style={{ width: '120px' }}
                            disabled={disableField}
                        />

                        <InputText
                            {...commonProps}
                            value={phoneNumber}
                            placeholder={!isViewOnly ? "666666666" : ''}
                            onChange={(e) => {

                                let number = e.target.value.replace(/\D/g, '');

                                // máximo 9 números para el teléfono
                                number = number.slice(0, 9);

                                // si el primer número no es 6 o 7 lo eliminamos
                                if (number.length === 1 && !['6', '7'].includes(number)) {
                                    number = '';
                                }

                                handleFieldChange(field.name, detectedCode + number);

                            }}
                        />

                    </div>
                );

            case 'boolean':
                return (
                    <InputSwitch
                        disabled={
                            isViewOnly ||
                            loading ||
                            (field.name === 'activo' && isCurrentUser)
                        }
                        checked={!!value}
                        onChange={(e) => handleFieldChange(field.name, e.value)}
                    />
                );
        }
    };
    const formContent = (
        <div className={styles.formContainer}>

            {fields
                .filter((field) => !(isViewOnly && field.type === 'password'))
                .map((field) => (

                    <div key={field.name} className={styles.formGroup}>

                        <label className={styles.label}>
                            {field.label}
                            {field.required && <span className={styles.required}>*</span>}
                        </label>

                        {renderField(field)}

                        {errors[field.name] && (
                            <small className={styles.error}>{errors[field.name]}</small>
                        )}

                    </div>

                ))}

            {!isViewOnly && (

                <div className={styles.buttonContainer}>

                    <Button
                        label="Cancelar"
                        icon="pi pi-times"
                        onClick={onHide}
                        severity="secondary"
                        disabled={submitting}
                    />

                    <Button
                        label="Guardar"
                        icon="pi pi-check"
                        onClick={handleSave}
                        loading={submitting}
                        disabled={loading}
                    />

                </div>

            )}

        </div>
    );

    return (
        <>
            <Toast ref={toastRef} />

            {inline ? (

                <div className={styles.inlineContainer}>

                    {/* CAMBIO: header con botón volver */}
                    <div className={styles.inlineHeader}>

                        <h2>{title}</h2>

                        {isViewOnly && (
                            <Button
                                label="Volver"
                                icon="pi pi-arrow-left"
                                className="p-button-text"
                                onClick={onHide}
                            />
                        )}

                    </div>

                    {formContent}

                </div>

            ) : (

                // Popup normal
                <Dialog
                    visible={visible}
                    onHide={onHide}
                    modal
                    style={{ width: '50vw' }}
                    closable={false}
                    header={
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%'
                        }}>
                            <span>{title}</span>

                            {/* Botón Volver en lugar de la X */}
                            <Button
                                icon="pi pi-times"
                                className="p-button-text"
                                onClick={onHide}
                            />
                        </div>
                    }
                >
                    {formContent}
                </Dialog>

            )}

        </>
    );
}