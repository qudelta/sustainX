import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import VerifyPage from './pages/VerifyPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import SimulationPage from './pages/SimulationPage';
import AppLayout from './components/Layout/AppLayout';

function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/verify" element={<VerifyPage />} />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AppLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardPage />} />
                <Route path="project/:projectId" element={<EditorPage />} />
                <Route path="project/:projectId/simulation/:jobId" element={<SimulationPage />} />
            </Route>
        </Routes>
    );
}

export default App;
