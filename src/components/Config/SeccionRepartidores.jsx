import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { Trash2, Edit2, Check, X } from 'lucide-react';

const SeccionRepartidores = ({ repartidores, refresh }) => {
  const [nombre, setNombre] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");

  const agregar = async () => {
    if (!nombre.trim()) return;
    try {
      await api.addRepartidor({ nombre: nombre.toUpperCase() });
      setNombre("");
      refresh();
    } catch (error) {
      console.error("Error al agregar repartidor:", error);
    }
  };

  const iniciarEdicion = (repartidor) => {
    setEditandoId(repartidor.id);
    setNombreEditado(repartidor.nombre);
  };

  const guardarEdicion = async (id) => {
    if (!nombreEditado.trim()) return;
    try {
      await api.updateRepartidor(id, nombreEditado.toUpperCase());
      setEditandoId(null);
      refresh();
    } catch (error) {
      console.error("Error al editar:", error);
    }
  };

  const eliminar = async (id) => {
    if (window.confirm("¿Eliminar repartidor?")) {
      await api.deleteRepartidor(id);
      refresh();
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* CARD DE ALTA */}
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-[2rem] shadow-xl">
        <label className="text-[10px] font-black text-gray-500 uppercase block mb-3 ml-1">Alta de personal</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            className="input-dark flex-1" 
            placeholder="NOMBRE DEL REPARTIDOR"
            onKeyDown={(e) => e.key === 'Enter' && agregar()}
          />
          <button onClick={agregar} className="bg-white text-black px-6 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">
            Agregar
          </button>
        </div>
      </div>

      {/* LISTADO */}
      <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
        {repartidores.map(r => (
          <div key={r.id} className="bg-gray-900/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-gray-900/60 transition-all">
            
            {editandoId === r.id ? (
              // VISTA EDICIÓN
              <div className="flex gap-2 flex-1 mr-4">
                <input 
                  autoFocus
                  type="text" 
                  value={nombreEditado} 
                  onChange={e => setNombreEditado(e.target.value)}
                  className="bg-gray-800 border border-orange-500/50 rounded-lg px-3 py-1 text-sm text-white w-full outline-none"
                />
                <button onClick={() => guardarEdicion(r.id)} className="text-green-500 hover:scale-110 transition-transform">
                  <Check size={18}/>
                </button>
                <button onClick={() => setEditandoId(null)} className="text-gray-500 hover:scale-110 transition-transform">
                  <X size={18}/>
                </button>
              </div>
            ) : (
              // VISTA NORMAL
              <>
                <span className="font-bold text-white uppercase text-sm tracking-wide">
                  {r.nombre}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => iniciarEdicion(r)} 
                    className="text-gray-500 hover:text-orange-500 p-2"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button 
                    onClick={() => eliminar(r.id)} 
                    className="text-gray-500 hover:text-red-500 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeccionRepartidores;