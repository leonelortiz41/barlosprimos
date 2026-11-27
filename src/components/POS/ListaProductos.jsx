import React, { useState, useEffect, useMemo } from 'react';
import { Search, Utensils, ChevronRight, X } from 'lucide-react';
import { getImagenUrl } from '../../services/api.js';

const ListaProductos = ({ productos, filtro, setFiltro, onSeleccionar, inputRef }) => {
  const [categoriaActiva, setCategoriaActiva] = useState('');
  const [imagenesRotas, setImagenesRotas] = useState({});

  const categorias = useMemo(() => Object.keys(productos ?? {}), [productos]);

  useEffect(() => {
    if (categorias.length === 0) {
      if (categoriaActiva) setCategoriaActiva('');
      return;
    }
    if (!categoriaActiva || !categorias.includes(categoriaActiva)) {
      setCategoriaActiva(categorias[0]);
    }
  }, [categorias, categoriaActiva]);

  const filtroNormalizado = (filtro || '').trim().toUpperCase();

  const seccionesFiltradas = useMemo(() => {
    return Object.entries(productos ?? {})
      .filter(([categoria]) => (filtroNormalizado ? true : categoria === categoriaActiva))
      .map(([categoria, lista]) => {
        const items = (lista ?? []).filter((p) =>
          String(p?.nombre ?? '').toUpperCase().includes(filtroNormalizado)
        );
        return { categoria, items };
      })
      .filter((sec) => sec.items.length > 0);
  }, [productos, filtroNormalizado, categoriaActiva]);

  const totalResultadosBusqueda = useMemo(
    () => seccionesFiltradas.reduce((acc, sec) => acc + sec.items.length, 0),
    [seccionesFiltradas]
  );

  const manejarKeyDownBusqueda = (e) => {
    if (e.key === 'Enter' && filtroNormalizado && totalResultadosBusqueda === 1) {
      const unicaSeccion = seccionesFiltradas[0];
      const unicoProducto = unicaSeccion?.items?.[0];
      if (unicoProducto) {
        e.preventDefault();
        onSeleccionar(unicoProducto, unicaSeccion.categoria);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* CABECERA: BUSCADOR Y TABS */}
      <div className="border-b border-gray-800 bg-gray-900/20 shrink-0">
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Utensils className="text-green-500" size={17} />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                Carta Digital
              </h2>
            </div>

            {filtroNormalizado && (
              <span className="text-[10px] bg-green-500 text-black px-2.5 py-0.5 rounded-full font-black uppercase">
                {totalResultadosBusqueda} {totalResultadosBusqueda === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
          </div>

          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="BUSCAR COMIDA..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value.toUpperCase())}
              onKeyDown={manejarKeyDownBusqueda}
              className="w-full bg-black border border-gray-700 rounded-xl py-2.5 pl-9 pr-9 text-xs font-bold text-white focus:border-green-500 outline-none transition-all placeholder:text-gray-600"
            />
            {filtro && (
              <button
                type="button"
                onClick={() => {
                  setFiltro('');
                  inputRef?.current?.focus();
                }}
                className="absolute right-2.5 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* NAVEGADOR DE CATEGORÍAS (TABS) */}
        {!filtroNormalizado && categorias.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 pb-3 custom-scrollbar">
            {categorias.map((cat) => {
              const activa = categoriaActiva === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase whitespace-nowrap transition-all border cursor-pointer ${
                    activa
                      ? 'bg-green-500 text-black border-green-500 shadow-lg shadow-green-500/20'
                      : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CUERPO DE LA CARTA */}
      <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar bg-black/40">
        {categorias.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
              <Utensils size={20} className="text-gray-700" />
            </div>
            <p className="text-gray-600 font-black text-[11px] uppercase tracking-[0.25em]">
              Cargando carta...
            </p>
          </div>
        ) : seccionesFiltradas.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-400 font-black text-xs uppercase">
              No hay comidas que coincidan con &ldquo;{filtroNormalizado}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setFiltro('');
                inputRef?.current?.focus();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-[11px] font-black uppercase text-green-400 cursor-pointer"
            >
              Ver categoría {categoriaActiva || 'completa'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {seccionesFiltradas.map(({ categoria, items }) => (
              <div key={categoria}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {categoria}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-bold">
                    {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {items.map((p) => {
                    const claveProd = `${categoria}-${p.id}`;
                    const srcImagen = !imagenesRotas[claveProd] ? getImagenUrl(p.imagen) : '';

                    return (
                      <button
                        key={claveProd}
                        type="button"
                        onClick={() => onSeleccionar(p, categoria)}
                        className="group relative bg-gray-900/35 border border-gray-800/70 p-3 rounded-2xl text-left hover:border-green-500 hover:bg-gray-800/40 transition-all active:scale-[0.98] overflow-hidden cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {srcImagen && (
                            <div className="w-full h-24 mb-2.5 rounded-xl overflow-hidden bg-black/60 border border-white/5">
                              <img
                                src={srcImagen}
                                alt={p.nombre || 'Producto'}
                                loading="lazy"
                                onError={() =>
                                  setImagenesRotas((prev) => ({ ...prev, [claveProd]: true }))
                                }
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}

                          <p className="text-[11px] font-black text-gray-100 uppercase leading-snug mb-3 line-clamp-2 group-hover:text-green-400 transition-colors">
                            {p.nombre}
                          </p>
                        </div>

                        <div className="flex items-end justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">
                              Precio
                            </span>
                            <span className="text-green-400 font-black text-base tracking-tight">
                              ${(Number(p.precio) || 0).toLocaleString('es-AR')}
                            </span>
                          </div>
                          <div className="w-7 h-7 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20 group-hover:bg-green-500 group-hover:text-black transition-all shrink-0">
                            <ChevronRight size={14} strokeWidth={3.5} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaProductos;