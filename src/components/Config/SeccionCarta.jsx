import React, { useState } from 'react';
import { api } from '../../services/api.js';
import ItemMenu from '../Admin/ItemMenu.jsx';
import { PlusCircle } from 'lucide-react';

const SeccionCarta = ({ productos, refresh }) => {
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "", categoria: "milanesas" });

  const agregar = async (e) => {
    e.preventDefault();
    if (!nuevo.nombre || !nuevo.precio) return;
    await api.addProducto(nuevo.categoria, { ...nuevo, nombre: nuevo.nombre.toUpperCase() });
    setNuevo({ ...nuevo, nombre: "", precio: "" });
    refresh();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      
      {/* FORMULARIO FIJO ARRIBA */}
      <div className="mb-6">
        <form onSubmit={agregar} className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-[2rem] flex flex-wrap gap-4 items-end shadow-xl">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 ml-1">Producto</label>
            <input type="text" value={nuevo.nombre} onChange={e=>setNuevo({...nuevo, nombre: e.target.value})} className="input-dark w-full" placeholder="NOMBRE" />
          </div>
          <div className="w-28">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 ml-1">Precio</label>
            <input type="number" value={nuevo.precio} onChange={e=>setNuevo({...nuevo, precio: e.target.value})} className="input-dark w-full" placeholder="$" />
          </div>
          <div className="w-44">
            <label className="text-[10px] font-black text-gray-500 uppercase block mb-2 ml-1">Categoría</label>
            <select value={nuevo.categoria} onChange={e=>setNuevo({...nuevo, categoria: e.target.value})} className="input-dark w-full">
              {Object.keys(productos).map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
            </select>
          </div>
          <button className="bg-orange-500 p-3.5 rounded-xl text-black active:scale-95 transition-transform">
            <PlusCircle/>
          </button>
        </form>
      </div>

      {/* CONTENEDOR CON SCROLL */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10">
        {Object.entries(productos).map(([cat, list]) => (
          <div key={cat} className="space-y-4">
            <h2 className="text-orange-500 font-black uppercase text-[10px] tracking-[0.2em] border-l-2 border-orange-500 pl-3 ml-1 sticky top-0 bg-[#060606] py-2 z-10">
              {cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
              {list.map(p => (
                <ItemMenu key={p.id} producto={p} categoria={cat} refresh={refresh} />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default SeccionCarta;