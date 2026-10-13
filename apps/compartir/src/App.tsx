import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './HomePage';
import { SessionPage } from './SessionPage';

// HashRouter: las rutas viven tras "#", así funcionan en GitHub Pages y luego en Capacitor sin configuración extra.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sesion/:id" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
