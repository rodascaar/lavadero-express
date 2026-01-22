/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                // Luxury Palette
                luxury: {
                    black: '#050505',
                    dark: '#111111',
                    card: 'rgba(255, 255, 255, 0.03)',
                    border: 'rgba(255, 255, 255, 0.1)',
                },
                // Brand colors (Refined)
                primary: {
                    50: '#fef2f2',
                    100: '#ffe1e1',
                    200: '#ffc9c9',
                    300: '#fra3a3',
                    400: '#fc6d6d',
                    500: '#ef4444', // Red base
                    600: '#dc2626', // Rosso Corsa vibes
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                    950: '#450a0a',
                },
                chrome: {
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
                // Status colors
                status: {
                    pending: '#fbbf24',      // Amarillo
                    confirmed: '#22c55e',   // Verde
                    inProgress: '#3b82f6',  // Azul
                    completed: '#10b981',   // Verde esmeralda
                    cancelled: '#ef4444',   // Rojo
                }
            },
            fontFamily: {
                heading: ['"Playfair Display"', 'serif'],
                sans: ['"Manrope"', 'sans-serif'],
                technical: ['"Montserrat"', 'sans-serif'],
            },
            backgroundImage: {
                'hero-pattern': "url('/patterns/carbon.png')", // Placeholder or remove if using CSS only
            }
        },
    },
    plugins: [],
}
