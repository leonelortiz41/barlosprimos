import React, { useState } from 'react';
import { api } from '../../services/api.js';
import ItemMenu from '../Admin/ItemMenu.jsx';
import { PlusCircle } from 'lucide-react';

const SeccionCarta = ({ productos = {}, refresh }) => {
  const categoriasDisponibles = Object.keys(productos);
  const categoriaInicial = categoriasDisponibles.includes('milanesas')
    ? 'milanesas'
    : categoriasDisponibles[0] || 'milanesas';

  const [nuevo, setNuevo] = useState({
    nombre: '',
    precio: '',
    categoria: categoriaInicial
  });
  const [guardando, setGuardando] = useState(false);

  const puedeAgregar =
    Boolean(nuevo.nombre.trim()) &&
    nuevo.precio !== '' &&
    Number(nuevo.precio) >= 0 &&
    !guardando;

  const agregar = async (e) => {
    e.preventDefault();
    if (!puedeAgregar) return;

    setGuardando(true);
    try {
      await api.addProducto(nuevo.categoria, {
        ...nuevo,
        nombre: nuevo.nombre.trim().toUpperCase(),
        precio: Number(nuevo.precio)
      });
      setNuevo((prev) => ({ ...prev, nombre: '', precio: '' }));
      await refresh?.();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] text-white">
      {/* FORMULARIO FIJO ARRIBA */}
      <div className="mb-5 shrink-0">
        <form
          onSubmit={agregar}
          className="bg-gradient-to-b from-[#111318] to-[#0a0b0e] border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-wrap gap-3.5 items-end shadow-xl"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
              Producto
            </label>
            <input
              type="text"
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              className="input-dark w-full rounded-xl bg-black/70 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white placeholder:text-gray-600 uppercase outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
              placeholder="EJ. MILANESA NAPOLITANA"
            />
          </div>

          <div className="w-28 sm:w-32">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
              Precio
            </label>
            <input
              type="number"
              min="0"
              value={nuevo.precio}
              onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })}
              className="input-dark w-full rounded-xl bg-black/70 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all tabular-nums"
              placeholder="$ 0"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5 ml-1">
              Categoría
            </label>
            <select
              value={nuevo.categoria}
              onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
              className="input-dark w-full rounded-xl bg-black/70 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
            >
              {categoriasDisponibles.map((cat) => (
                <option key={cat} value={cat} className="bg-[#111318] text-white">
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!puedeAgregar}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:border-white/5 text-black font-black text-xs uppercase tracking-wider border border-orange-300/30 shadow-md shadow-orange-600/20 disabled:shadow-none flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <PlusCircle size={16} strokeWidth={2.5} />
            <span>{guardando ? 'Agregando...' : 'Agregar'}</span>
          </button>
        </form>
      </div>

      {/* CONTENEDOR CON SCROLL */}
      <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-8">
        {Object.entries(productos).map(([cat, list]) => {
          const items = Array.isArray(list) ? list : [];
          return (
            <section key={cat} className="space-y-3">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[#060606]/95 backdrop-blur-sm py-2 px-1 border-b border-white/10">
                <h2 className="text-orange-400 font-black uppercase text-[11px] tracking-[0.2em] border-l-2 border-orange-500 pl-3">
                  {cat}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/10 tabular-nums">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                {items.map((p) => (
                  <ItemMenu
                    key={p.id}
                    producto={p}
                    categoria={cat}
                    refresh={refresh}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default SeccionCarta;