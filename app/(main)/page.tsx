'use client';

import React from 'react';
import { Card } from 'primereact/card';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function Dashboard() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Panel de Administración</h1>
            </div>

            <div className={styles.grid}>
                <Link href="/admin/usuarios" className={styles.cardLink}>
                    <Card className={styles.card}>
                        <i className="pi pi-users"></i>
                        <h3>Usuarios</h3>
                    </Card>
                </Link>

                <Link href="/admin/roles" className={styles.cardLink}>
                    <Card className={styles.card}>
                        <i className="pi pi-shield"></i>
                        <h3>Roles</h3>
                    </Card>
                </Link>
            </div>
        </div>
    );
}