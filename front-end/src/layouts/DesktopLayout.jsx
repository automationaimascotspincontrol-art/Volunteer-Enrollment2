import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from '../components/navigation/Topbar';

const DesktopLayout = () => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            <Topbar />
            <main className="container" style={{
                padding: '2rem 2rem',
                maxWidth: '1400px',
                margin: '0 auto',
                width: '100%'
            }}>
                <Outlet />
            </main>
        </div>
    );
};

export default DesktopLayout;
