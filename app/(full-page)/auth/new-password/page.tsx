"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";

export default function NewPassword() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const toastRef = useRef<Toast>(null);

    // TU REGEX
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=:;?<>])[A-Za-z\d!@#$%^&*()_\-+=:;?<>]{8,}$/;

    const handleSubmit = async () => {
        // Validaciones frontend
        if (!password || !confirmPassword) {
            return toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Rellena todos los campos",
                life: 3000
            });
        }

        if (password !== confirmPassword) {
            return toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Las contraseñas no coinciden",
                life: 3000
            });
        }

        if (!passwordRegex.test(password)) {
            return toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "La contraseña debe tener mínimo 8 caracteres, una letra, un número y un carácter especial",
                life: 4000
            });
        }

        if (!token) {
            return toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Token inválido",
                life: 3000
            });
        }

        setLoading(true);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/usuarios/new-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        token,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Error al cambiar contraseña");
            }

            toastRef.current?.show({
                severity: "success",
                summary: "Éxito",
                detail: "Contraseña actualizada correctamente",
                life: 3000
            });

        } catch (error: any) {
            toastRef.current?.show({
                severity: "error",
                summary: "Error",
                detail: error.message,
                life: 3000
            });
        }

        setLoading(false);
    };

    return (
        <>
            <Toast ref={toastRef} />

            <div className="px-5 min-h-screen flex justify-content-center align-items-center">
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">

                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            Nueva contraseña
                        </div>
                        <span className="text-600 font-medium">
                            Introduce y confirma tu nueva contraseña
                        </span>
                    </div>

                    <div className="flex flex-column gap-3">

                        <InputText
                            type="password"
                            placeholder="Nueva contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <InputText
                            type="password"
                            placeholder="Confirmar contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <Button
                            label="Cambiar contraseña"
                            onClick={handleSubmit}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}