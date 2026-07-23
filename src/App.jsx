import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/frota/Layout';
import Dashboard from '@/pages/Dashboard';
import Checklist from '@/pages/Checklist';
import Kanban from '@/pages/Kanban';
import Registros from '@/pages/Registros';
import Multas from '@/pages/Multas';
import Manutencoes from '@/pages/Manutencoes';
import Frota from '@/pages/Frota';
import VeiculoDetalhe from '@/pages/VeiculoDetalhe';
import Admin from '@/pages/Admin';
import Mais from '@/pages/Mais';
import OnboardingBordo from '@/pages/OnboardingBordo';
import Perfil from '@/pages/Perfil';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Rotas públicas (sem auth)
  if (location.pathname.startsWith("/onboarding-bordo")) {
    return <OnboardingBordo />;
  }

  // Páginas de autenticação (acessíveis sem login)
  if (location.pathname === "/login") return <Login />;
  if (location.pathname === "/register") return <Register />;
  if (location.pathname === "/forgot-password") return <ForgotPassword />;
  if (location.pathname === "/reset-password") return <ResetPassword />;

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/registros" element={<Registros />} />
        <Route path="/multas" element={<Multas />} />
        <Route path="/manutencoes" element={<Manutencoes />} />
        <Route path="/frota" element={<Frota />} />
        <Route path="/frota/:id" element={<VeiculoDetalhe />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/mais" element={<Mais />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App