import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Briefcase, Globe, Settings, Sun, Moon, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/theme-store';

const navItems = [
	{ to: '/jobs', label: 'Jobs', icon: Briefcase },
	{ to: '/sites', label: 'Sites', icon: Globe },
	{ to: '/settings', label: 'Settings', icon: Settings },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const { theme, toggleTheme } = useThemeStore();

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className="flex h-16 items-center gap-2 px-6 border-b border-border">
				<Briefcase className="h-6 w-6 text-primary" />
				<span className="text-xl font-bold tracking-tight">Scrajo</span>
			</div>

			{/* Navigation */}
			<nav className="flex-1 space-y-1 px-3 py-4">
				{navItems.map(({ to, label, icon: Icon }) => (
					<NavLink
						key={to}
						to={to}
						onClick={onNavigate}
						className={({ isActive }) =>
							cn(
								'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
								isActive
									? 'bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
							)
						}
					>
						<Icon className="h-4 w-4" />
						{label}
					</NavLink>
				))}
			</nav>

			{/* Theme toggle */}
			<div className="border-t border-border p-4">
				<button
					type="button"
					onClick={toggleTheme}
					className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
				>
					{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					{theme === 'dark' ? 'Light mode' : 'Dark mode'}
				</button>
			</div>
		</div>
	);
}

export default function Layout() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex h-screen bg-background">
			{/* Desktop sidebar */}
			<aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border bg-card">
				<SidebarNav />
			</aside>

			{/* Mobile sidebar sheet */}
			<Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
					<Dialog.Content className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card p-0 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-200 md:hidden">
						<Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
						<SidebarNav onNavigate={() => setMobileOpen(false)} />
						<Dialog.Close className="absolute right-3 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
							<X className="h-4 w-4" />
						</Dialog.Close>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			{/* Main content area */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Mobile header */}
				<header className="flex h-16 items-center gap-4 border-b border-border px-4 md:hidden">
					<button
						type="button"
						onClick={() => setMobileOpen(true)}
						className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
						aria-label="Open navigation menu"
					>
						<Menu className="h-5 w-5" />
					</button>
					<div className="flex items-center gap-2">
						<Briefcase className="h-5 w-5 text-primary" />
						<span className="text-lg font-bold tracking-tight">Scrajo</span>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
