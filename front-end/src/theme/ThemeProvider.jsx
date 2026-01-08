import React, { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

export default function ThemeProvider({ children }) {
    // Default to 'current' (base theme) if nothing stored
    const [theme, setTheme] = useState(
        localStorage.getItem("theme") || "current"
    );

    useEffect(() => {
        // Apply theme to html root
        if (theme === 'current') {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", theme);
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    // Prevent flash of unstyled theme
    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved && saved !== 'current') {
            document.documentElement.setAttribute("data-theme", saved);
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
