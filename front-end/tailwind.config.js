/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary)',
                'primary-hover': 'var(--primary-hover)',
                secondary: 'var(--secondary)',
                'bg-panel': 'var(--bg-panel)',
                'bg-card': 'var(--bg-card)',
                'text-main': 'var(--text-main)',
                'text-muted': 'var(--text-muted)',
                accent: 'var(--accent)',
                error: 'var(--error)',
                success: 'var(--success)',
                warning: 'var(--warning)',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'zoom-in': 'zoomIn 0.2s ease-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                zoomIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
