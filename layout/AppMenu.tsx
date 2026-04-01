import type { MenuModel } from "@/types";
import AppSubMenu from "./AppSubMenu";

const AppMenu = () => {
    const model: MenuModel[] = [
        {
            label: "Administración",
            icon: "pi pi-fw pi-cog",
            items: [
                {
                    label: "Usuarios",
                    icon: "pi pi-fw pi-users",
                    to: "/admin/usuarios",
                },
                {
                    label: "Roles",
                    icon: "pi pi-fw pi-shield",
                    to: "/admin/roles",
                },
                {
                    label: "Permisos",
                    icon: "pi pi-fw pi-lock",
                    to: "/admin/permisos",
                },
            ],
        },
    ];

    return <AppSubMenu model={model} />;
};

export default AppMenu;
