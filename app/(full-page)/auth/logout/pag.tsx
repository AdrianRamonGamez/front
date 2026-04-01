"use client";

import { useEffect } from "react";
import AuthService from "@/services/AuthService";

export default function LogoutPage() {

    useEffect(() => {
        AuthService.logout();
    }, []);

    return null;
}