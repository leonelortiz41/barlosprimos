import { NavLink } from 'react-router-dom';
// Agregamos "Settings" a la lista de importaciones de lucide-react
import { ShoppingCart, LayoutDashboard, Utensils, Settings } from 'lucide-react';

const Navbar = () => {
  const linkBase = "flex items-center gap-2 font-bold transition-all pb-1";
  const active = `${linkBase} text-orange-500 border-b-2 border-orange-500`;
  const inactive = `${linkBase} text-gray-400 hover:text-white`;

  return (
    <nav className="bg-[#080808] border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Utensils className="text-orange-500" />
        <h1 className="text-xl font-black uppercase tracking-tighter">
          Bar <span className="text-orange-500">Los Primos</span>
        </h1>
      </div>
      
      <div className="flex gap-8">
        <NavLink to="/" className={({ isActive }) => isActive ? active : inactive}>
          <ShoppingCart size={18} /> VENTAS
        </NavLink>
        
        <NavLink to="/cuaderno" className={({ isActive }) => isActive ? active : inactive}>
          <LayoutDashboard size={18} /> CUADERNO
        </NavLink>

        {/* Nueva ruta de Configuración */}
        <NavLink to="/config" className={({ isActive }) => isActive ? active : inactive}>
          <Settings size={18} /> MENÚ
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;