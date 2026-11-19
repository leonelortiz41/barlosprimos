import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

const HeaderAdmin = ({ filtro, setFiltro, fetchPedidos, loading }) => (
  <div className="flex items-center gap-2 mt-3 w-full">
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
      <input 
        type="text" 
        placeholder="BUSCAR..." 
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="bg-black/40 border border-white/10 rounded-lg py-1 pl-8 pr-2 text-[9px] font-bold uppercase outline-none focus:border-orange-500/50 w-full transition-all"
      />
    </div>
    
    <button 
      onClick={fetchPedidos} 
      className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-all active:scale-95 text-orange-500"
      title="Refrescar datos"
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
    </button>
  </div>
);

export default HeaderAdmin;