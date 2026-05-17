import { create } from 'zustand';

interface ThemeState {
	theme: 'light' | 'dark';
	toggleTheme: () => void;
	setTheme: (theme: 'light' | 'dark') => void;
}

function getInitialTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light';
	const stored = localStorage.getItem('theme');
	if (stored === 'dark' || stored === 'light') return stored;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>((set) => ({
	theme: getInitialTheme(),
	toggleTheme: () =>
		set((state) => {
			const next = state.theme === 'dark' ? 'light' : 'dark';
			localStorage.setItem('theme', next);
			document.documentElement.classList.toggle('dark', next === 'dark');
			return { theme: next };
		}),
	setTheme: (theme) => {
		localStorage.setItem('theme', theme);
		document.documentElement.classList.toggle('dark', theme === 'dark');
		set({ theme });
	},
}));
