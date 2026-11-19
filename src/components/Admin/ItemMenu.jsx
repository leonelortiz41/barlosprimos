import React, { useState } from 'react';
import { api } from '../../services/api';
import { Save, Edit2, X, Trash2 } from 'lucide-react';

const ItemMenu = ({ producto, categoria, refresh }) => {
  const [editando, setEditando] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState(producto.precio);

  const guardarPrecio = async () => {
    try {
      await api.updatePrecio(categoria, producto.id, nuevoPrecio);
      setEditando(false);
      refresh();
    } catch (err) { alert("Error al actualizar"); }
  };

  const eliminarProducto = async () => {
    if (window.confirm(`¿Seguro que quieres borrar ${producto.nombre}?`)) {
      try {
        await api.deleteProducto(categoria, producto.id);
        refresh();
      } catch (err) { alert("Error al borrar"); }
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900/30 border border-gray-800 rounded-xl hover:border-gray-500 transition-all">
      <div className="flex flex-col">
        <span className="text-white font-bold uppercase text-sm">{producto.nombre}</span>
      </div>

      <div className="flex items-center gap-4">
        {editando ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={nuevoPrecio} 
              onChange={(e) => setNuevoPrecio(e.target.value)}
              className="w-24 bg-black border border-orange-500 rounded px-2 py-1 text-white"
            />
            <button onClick={guardarPrecio} className="text-green-500"><Save size={18} /></button>
            <button onClick={() => setEditando(false)} className="text-gray-500"><X size={18} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-black text-white">${producto.precio}</span>
            <button onClick={() => setEditando(true)} className="text-gray-400 hover:text-white"><Edit2 size={16} /></button>
            <button onClick={eliminarProducto} className="text-red-500/50 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemMenu;