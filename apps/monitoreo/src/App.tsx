import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './HomePage';
import { JoinPage } from './JoinPage';
import { SessionPage } from './SessionPage';

// HashRouter: las rutas viven tras "#", así funcionan en GitHub Pages sin configuración extra.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/unirse" element={<JoinPage />} />
        <Route path="/sesion/:id" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
