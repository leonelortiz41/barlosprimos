import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { StockProvider } from './context/StockContext';
import Navbar from './components/NavBar';
import PuntoVenta from './pages/PuntoVenta';
import Cuaderno from './pages/Cuaderno';
import Configuracion from './pages/Configuracion';

function AppContent() {
  const navigate = useNavigate();

 
 useEffect(() => {
  const handleKeyDown = (e) => {
    // Verificamos si solo se presionó la tecla Control
    if (e.key === 'Control') {
      // Si estamos en la raíz, vamos a cuadernos; si no, volvemos a la raíz
      if (window.location.pathname === '/') {
        navigate('/cuaderno');
      } else {
        navigate('/');
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  
  // Limpieza del evento para evitar fugas de memoria
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [navigate]);


  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="p-4">
        <Routes>
          <Route path="/" element={<PuntoVenta />} />
          <Route path="/cuaderno" element={<Cuaderno />} />
          <Route path="/config" element={<Configuracion />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StockProvider>
      <Router>
        <AppContent />
      </Router>
    </StockProvider>
  );
}