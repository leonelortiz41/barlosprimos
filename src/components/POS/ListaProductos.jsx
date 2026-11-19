import React, { useState, useEffect } from 'react';
import { Search, Utensils, ChevronRight } from 'lucide-react';

const ListaProductos = ({ productos, filtro, setFiltro, onSeleccionar }) => {
  const [categoriaActiva, setCategoriaActiva] = useState("");

  // Obtener nombres de categorías y establecer la primera como activa por defecto
  const categorias = Object.keys(productos ?? {});
  
  useEffect(() => {
    if (categorias.length > 0 && !categoriaActiva) {
      setCategoriaActiva(categorias[0]);
    }
  }, [productos, categorias, categoriaActiva]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* CABECERA: BUSCADOR Y TABS */}
      <div className="border-b border-gray-800 bg-gray-900/20">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="text-green-500" size={18} />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Carta Digital</h2>
            </div>
            {filtro && (
              <span className="text-[11px] bg-green-500 text-black px-2 py-0.5 rounded-full font-black animate-pulse">
                MODO BÚSQUEDA
              </span>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text" 
              placeholder="BUSCAR COMIDA..." 
              className="w-full bg-black border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-bold text-white focus:border-green-500 outline-none transition-all placeholder:text-gray-700"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* NAVEGADOR DE CATEGORÍAS (TABS) */}
        {!filtro && (
          <div className="flex items-center gap-1 overflow-x-auto px-4 pb-3 no-scrollbar scroll-smooth">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase whitespace-nowrap transition-all border ${
                  categoriaActiva === cat 
                  ? "bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/20 scale-105" 
                  : "bg-gray-900/50 text-gray-500 border-gray-800 hover:border-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CUERPO DE LA CARTA */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/40">
        <div className="space-y-6">
          {Object.entries(productos ?? {}).map(([categoria, lista]) => {
            
            // Si hay filtro, mostramos todo lo que coincida. 
            // Si no hay filtro, SOLO mostramos la categoría activa.
            const mostrarEstaCategoria = filtro ? true : (categoria === categoriaActiva);
            
            if (!mostrarEstaCategoria) return null;

            const productosFiltrados = (lista ?? []).filter(p => 
              p.nombre?.toUpperCase().includes(filtro || "")
            );

            if (productosFiltrados.length === 0) return null;

            return (
              <div key={categoria} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {categoria}
                  </h3>
                  <span className="text-[11px] text-gray-600 font-bold">{productosFiltrados.length} ITEMS</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {productosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSeleccionar(p, categoria)}
                      className="group relative bg-gray-900/30 border border-gray-800/60 p-4 rounded-2xl text-left hover:border-green-500 hover:bg-gray-800/40 transition-all active:scale-95 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <p className="text-[11px] font-black text-gray-100 uppercase leading-tight mb-4 h-8 line-clamp-2 group-hover:text-green-400 transition-colors">
                        {p.nombre}
                      </p>
                      
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-600 font-black uppercase tracking-tighter">Precio</span>
                          <span className="text-green-500 font-black text-base tracking-tighter">
                            ${p.precio}
                          </span>
                        </div>
                        <div className="w-7 h-7 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20 group-hover:bg-green-500 group-hover:text-black transition-all">
                          <ChevronRight size={14} strokeWidth={4} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* ESTADO VACÍO */}
          {categorias.length === 0 && (
            <div className="text-center py-20">
              <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
                <Utensils size={20} className="text-gray-700" />
              </div>
              <p className="text-gray-700 font-black text-[11px] uppercase tracking-[0.3em]">Cargando carta...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListaProductos;