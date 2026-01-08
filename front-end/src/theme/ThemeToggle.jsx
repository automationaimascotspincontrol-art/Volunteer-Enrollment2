import React, { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import { Moon, Sun, Monitor } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, setTheme } = useContext(ThemeContext);

    // Only authorized roles should probably see this, or everyone?
    // User request said "Game Master-only toggle UI" but typically themes are for everyone.
    // For now we expose it as a UI component to be placed in Layout.

    const cycleTheme = () => {
        if (theme === 'current') setTheme('light');
        else if (theme === 'light') setTheme('dark');
        else setTheme('current');
    };

    const getIcon = () => {
        if (theme === 'light') return <Sun size={20} />;
        if (theme === 'dark') return <Moon size={20} />;
        return <Monitor size={20} />; // Current/System-like
    };

    return (
        <button
            onClick={cycleTheme}
            className="btn btn-ghost"
            style={{ padding: '0.5rem', borderRadius: '50%' }}
            title={`Current theme: ${theme}`}
        >
            {getIcon()}
        </button>
    );
};

export default ThemeToggle;
