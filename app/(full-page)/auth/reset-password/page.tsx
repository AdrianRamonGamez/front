"use client";
import { useState, useRef, useContext } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import AuthService from "@/services/AuthService";
import { LayoutContext } from "../../../../layout/context/layoutcontext";

export default function ResetPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const toastRef = useRef<Toast>(null);
    const { layoutConfig } = useContext(LayoutContext);
    const dark = layoutConfig.colorScheme !== "light";

    const handleReset = async () => {
        if (!email) {
            toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Introduce tu email",
                life: 3000
            });
            return;
        }

        setLoading(true);

        try {
            await AuthService.resetPassword(email);

            toastRef.current?.show({
                severity: "success",
                summary: "Correo enviado",
                detail: "Revisa tu email para continuar",
                life: 3000
            });
        } catch {
            toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "No se pudo enviar el correo",
                life: 3000
            });
        }

        setLoading(false);
    };

    return (
        <>
            <Toast ref={toastRef} />

            {/* MISMO FONDO QUE LOGIN */}
            <div className="px-5 min-h-screen flex justify-content-center align-items-center">
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">
                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            Recuperar contraseña
                        </div>
                        <span className="text-600 font-medium">
                            Introduce tu email
                        </span>
                    </div>

                    <div className="flex flex-column">
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-envelope"></i>
                            <InputText
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </span>

                        <Button
                            label="Enviar enlace"
                            onClick={handleReset}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}