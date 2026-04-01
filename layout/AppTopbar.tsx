import type { AppTopbarRef } from "@/types";
import { Button } from "primereact/button";
import { forwardRef, useContext, useImperativeHandle, useRef, useState, useEffect } from "react";
import AppBreadcrumb from "./AppBreadCrumb";
import { LayoutContext } from "./context/layoutcontext";
import AuthService from "@/services/AuthService";

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {

    const { onMenuToggle, showConfigSidebar } =
        useContext(LayoutContext);

    const menubuttonRef = useRef(null);

    const [usuario, setUsuario] = useState<any>(null);

    useEffect(() => {

        const user = AuthService.getUserData();

        if (user) {
            setUsuario(user);
        }

    }, []);

    const onConfigButtonClick = () => {
        showConfigSidebar();
    };

    const handleLogout = () => {
        AuthService.logout();
    };

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current,
    }));

    return (
        <div className="layout-topbar">
            <div className="topbar-start">
                <button
                    ref={menubuttonRef}
                    type="button"
                    className="topbar-menubutton p-link p-trigger"
                    onClick={onMenuToggle}
                >
                    <i className="pi pi-bars"></i>
                </button>

                <AppBreadcrumb className="topbar-breadcrumb"></AppBreadcrumb>
            </div>

            <div className="topbar-end">
                <ul className="topbar-menu">

                    {usuario && (
                        <li className="flex align-items-center gap-3 mr-3">

                            <span className="text-700 font-medium">
                                Sesión iniciada como
                            </span>

                            <span className="font-bold text-primary">
                                {usuario.nombre} {usuario.apellido}
                            </span>

                            <Button
                                icon="pi pi-sign-out"
                                text
                                rounded
                                severity="danger"
                                onClick={handleLogout}
                            />

                        </li>
                    )}

                    

                </ul>
            </div>
        </div>
    );
});

AppTopbar.displayName = "AppTopbar";

export default AppTopbar;