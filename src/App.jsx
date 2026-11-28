import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { StockProvider } from './context/StockContext';
import { api } from './services/api';
import Navbar from './components/NavBar';
import PuntoVenta from './pages/PuntoVenta';
import Cuaderno from './pages/Cuaderno';
import Configuracion from './pages/Configuracion';
import ConfigAppWeb from './pages/ConfigAppWeb';

const rawApiUrl = String(import.meta.env.VITE_API_URL || 'http://localhost:3000').trim();
const API_URL = rawApiUrl.replace(/\/+$/, '');
const CONFIRMADOS_KEY = 'bar_los_primos_pedidos_confirmados_v1';

const extraerPedidosLista = (resPedidos) => {
  const base = resPedidos?.data ?? resPedidos;
  if (Array.isArray(base)) return base;
  if (base && typeof base === 'object') {
    for (const clave of ['pedidos', 'data', 'rows']) {
      if (Array.isArray(base[clave])) return base[clave];
    }
  }
  return [];
};

const leerIdsConfirmados = () => {
  try {
    const raw = localStorage.getItem(CONFIRMADOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
};

const esPedidoMesaPendiente = (pedido) => {
  if (String(pedido?.tipoEntrega || '').toUpperCase() === 'MESA') return true;
  if (String(pedido?.origen || '').toUpperCase().includes('MESA')) return true;
  const fuente = `${pedido?.cliente ?? ''} ${pedido?.detalleTicket ?? ''}`;
  return /\[?MESA\s*#?\s*\d+\]?/i.test(fuente);
};

const esPedidoWebPendiente = (pedido, setConfirmados) => {
  if (!pedido || pedido.id == null) return false;
  if (String(pedido?.statu || '').startsWith('ENTREGADO_')) return false;
  if (setConfirmados.has(String(pedido.id))) return false;
  if (esPedidoMesaPendiente(pedido)) return true;
  if (String(pedido?.origen || '').toUpperCase() === 'WEB') return true;
  const clienteStr = String(pedido?.cliente ?? '').toUpperCase();
  return clienteStr.includes('[WEB]');
};

function AppContent() {
  const navigate = useNavigate();
  const [tiendaAbierta, setTiendaAbierta] = useState(true);
  const [pedidosPorConfirmar, setPedidosPorConfirmar] = useState(0);

  const consultarPendientesWeb = useCallback(async () => {
    try {
      const resPedidos = await api.getPedidos();
      const lista = extraerPedidosLista(resPedidos);
      const setConfirmados = leerIdsConfirmados();
      const pendientes = lista.filter((p) => esPedidoWebPendiente(p, setConfirmados));
      setPedidosPorConfirmar(pendientes.length);
    } catch {
      // Mantiene el último conteo si falla la consulta
    }
  }, []);

  useEffect(() => {
    let activa = true;
    const consultarEstadoWeb = async () => {
      try {
        const res = await fetch(`${API_URL}/configuracion-web`);
        if (!res.ok || !activa) return;
        const data = await res.json();
        if (typeof data?.tiendaAbierta === 'boolean') {
          setTiendaAbierta(data.tiendaAbierta);
        }
      } catch {
        // Mantiene el valor por defecto si el endpoint aún no responde
      }
    };
    consultarEstadoWeb();
    return () => {
      activa = false;
    };
  }, []);

  useEffect(() => {
    consultarPendientesWeb();
    const timer = setInterval(consultarPendientesWeb, 10000);
    const onFocus = () => consultarPendientesWeb();
    const onStorage = (e) => {
      if (e.key === CONFIRMADOS_KEY) {
        consultarPendientesWeb();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [consultarPendientesWeb]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control') {
        if (window.location.pathname === '/') {
          navigate('/cuaderno');
        } else {
          navigate('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar
        tiendaAbierta={tiendaAbierta}
        pedidosPorConfirmar={pedidosPorConfirmar}
      />
      <main className="p-4">
        <Routes>
          <Route path="/" element={<PuntoVenta />} />
          <Route
            path="/cuaderno"
            element={<Cuaderno onPendientesChange={setPedidosPorConfirmar} />}
          />
          <Route path="/config" element={<Configuracion />} />
          <Route
            path="/config-web"
            element={<ConfigAppWeb onEstadoWebChange={setTiendaAbierta} />}
          />
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