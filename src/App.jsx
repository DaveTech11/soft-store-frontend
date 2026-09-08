import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Premium from './pages/Premium';
import Codex from './pages/Code';
import Artifacts from './pages/Artifacts';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DownloadPage from './pages/Download';
import DownloadRedirect from './pages/DownloadRedirect';

const AuthenticatedApp = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/download" element={<DownloadPage />} />
    <Route path="/d" element={<DownloadRedirect />} />
    <Route path="/" element={<Chat />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/premium" element={<Premium />} />
    <Route path="/codex" element={<Codex />} />
    <Route path="/artifacts" element={<Artifacts />} />
    <Route path="/admin" element={<Admin />} />
    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

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