'use client';

import { Metadata } from "next";
import Layout from "../../layout/layout";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthService from '@/services/AuthService';
import IntlProviderWrapper from '@/app/utility/Traducciones.js';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: "PrimeReact APOLLO",
    description:
        "The ultimate collection of design-agnostic, flexible and accessible React UI Components.",
    robots: { index: false, follow: false },
    viewport: { initialScale: 1, width: "device-width" },
    openGraph: {
        type: "website",
        title: "PrimeReact APOLLO-REACT",
        url: "https://www.primefaces.org/apollo-react",
        description:
            "The ultimate collection of design-agnostic, flexible and accessible React UI Components.",
        images: ["https://www.primefaces.org/static/social/apollo-react.png"],
        ttl: 604800,
    },
    icons: {
        icon: "/favicon.ico",
    },
};

export default function MainLayout({ children }: MainLayoutProps) {

    const router = useRouter();

    useEffect(() => {

        if (!AuthService.isAuthenticated()) {
            router.replace('/auth/login');
        }

    }, []);

    return (
        <IntlProviderWrapper>
            <Layout>
                {children}
            </Layout>
        </IntlProviderWrapper>
    );
}