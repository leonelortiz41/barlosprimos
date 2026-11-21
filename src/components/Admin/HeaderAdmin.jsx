import React from 'react';
import { Search, RefreshCw, X } from 'lucide-react';

const HeaderAdmin = ({ filtro, setFiltro, fetchPedidos, loading = false }) => {
  const limpiarFiltro = () => setFiltro('');

  return (
    <div className="flex items-center gap-2 mt-3 w-full">
      <div className="relative flex-1">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          size={12}
        />
        <input
          type="text"
          placeholder="BUSCAR CLIENTE O #ID..."
          aria-label="Buscar cliente o ID"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') limpiarFiltro();
          }}
          className="bg-black/40 border border-white/10 rounded-lg py-1.5 pl-8 pr-6 text-[10px] font-bold uppercase text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50 w-full transition-all"
        />
        {filtro && (
          <button
            type="button"
            onClick={limpiarFiltro}
            aria-label="Limpiar búsqueda"
            title="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={fetchPedidos}
        disabled={loading}
        aria-label="Refrescar datos"
        className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
          loading
            ? 'bg-orange-500/5 border-orange-500/10 text-orange-500/50 cursor-not-allowed'
            : 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 text-orange-500'
        }`}
        title="Refrescar datos"
      >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default HeaderAdmin;