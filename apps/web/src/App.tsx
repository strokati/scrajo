import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from '@/components/Layout';
import { JobsPage } from '@/components/jobs/JobsPage';
import { SitesPage } from '@/components/sites/SitesPage';
import { SettingsPage } from '@/components/settings/SettingsPage';

function App() {
	return (
		<>
			<Routes>
				<Route element={<Layout />}>
					<Route index element={<Navigate to="/jobs" replace />} />
					<Route path="/jobs" element={<JobsPage />} />
					<Route path="/sites" element={<SitesPage />} />
					<Route path="/settings" element={<SettingsPage />} />
				</Route>
			</Routes>
			<Toaster richColors position="top-right" />
		</>
	);
}

export default App;
