import { NavLink } from 'react-router-dom';
import { ShoppingCart, LayoutDashboard, Utensils, Settings, Globe } from 'lucide-react';

const Navbar = ({ tiendaAbierta = true, pedidosPorConfirmar = 0 }) => {
  const linkBase =
    'flex items-center gap-2 font-bold text-xs sm:text-sm transition-all pb-1 rounded-lg';
  const active = `${linkBase} text-orange-500 border-b-2 border-orange-500 rounded-b-none`;
  const inactive = `${linkBase} text-gray-400 hover:text-white`;
  const hayPendientes = pedidosPorConfirmar > 0;

  return (
    <nav className="bg-[#080808] border-b border-gray-800 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Utensils className="text-orange-500 shrink-0" />
        <h1 className="text-lg sm:text-xl font-black uppercase tracking-tighter">
          Bar <span className="text-orange-500">Los Primos</span>
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <NavLink to="/" className={({ isActive }) => (isActive ? active : inactive)}>
          <ShoppingCart size={18} />
          <span>VENTAS</span>
        </NavLink>

        <NavLink
          to="/cuaderno"
          className={({ isActive }) => {
            const baseClase = isActive ? active : inactive;
            if (!hayPendientes) return baseClase;
            return `${baseClase} px-2.5 py-1 bg-amber-500/15 text-amber-300 border border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.25)] animate-pulse`;
          }}
          title={
            hayPendientes
              ? `${pedidosPorConfirmar} ${
                  pedidosPorConfirmar === 1 ? 'pedido por confirmar' : 'pedidos por confirmar'
                }`
              : 'Ir a Cuaderno'
          }
        >
          <LayoutDashboard size={18} className={hayPendientes ? 'text-amber-400' : ''} />
          <span>CUADERNO</span>
          {hayPendientes && (
            <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-black leading-none rounded-full bg-orange-600 text-white border border-amber-200/40 tabular-nums">
              {pedidosPorConfirmar}
            </span>
          )}
        </NavLink>

        <NavLink to="/config" className={({ isActive }) => (isActive ? active : inactive)}>
          <Settings size={18} />
          <span>MENÚ</span>
        </NavLink>

        <NavLink to="/config-web" className={({ isActive }) => (isActive ? active : inactive)}>
          <Globe size={18} />
          <span>APP WEB</span>
          <span
            className={`w-2 h-2 rounded-full ${
              tiendaAbierta ? 'bg-emerald-400' : 'bg-red-500'
            }`}
            title={tiendaAbierta ? 'Tienda web abierta' : 'Tienda web cerrada'}
          />
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;