import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Trash2, Plus, Percent, Zap, Save, AlertCircle } from 'lucide-react';

const SeccionPrecios = ({ configs, refresh }) => {
  const [nuevaAdicion, setNuevaAdicion] = useState({ atributo: "", valor: "" });
  
  // Buscamos la única comisión en el array que viene del padre
  const comisionUnica = configs.find(c => c.tipo === 'comision');
  
  // Estado local para la edición de la comisión
  const [valorComision, setValorComision] = useState("");

  // Sincronizar el valor cuando cargan los datos
  useEffect(() => {
    if (comisionUnica) setValorComision(comisionUnica.valor);
  }, [comisionUnica]);

  const guardarAdicion = async () => {
    if (!nuevaAdicion.atributo || !nuevaAdicion.valor) return;
    await api.updateConfig({ 
      atributo: nuevaAdicion.atributo.toUpperCase(),
      valor: nuevaAdicion.valor,
      tipo: 'adicion' 
    });
    setNuevaAdicion({ atributo: "", valor: "" });
    refresh();
  };

  const actualizarComision = async () => {
    await api.updateConfig({ 
      atributo: comisionUnica?.atributo || "COMISION REPARTO",
      valor: valorComision,
      tipo: 'comision' 
    });
    refresh();
    alert("Comisión actualizada");
  };

  const adiciones = configs.filter(c => c.tipo === 'adicion');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
      
      {/* COLUMNA ADICIONES (Gestión completa) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 ml-1">
          <Zap size={16} className="text-yellow-500" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adiciones / Extras</h3>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-3xl shadow-xl flex gap-2">
          <input 
            type="text" 
            value={nuevaAdicion.atributo} 
            onChange={e => setNuevaAdicion({...nuevaAdicion, atributo: e.target.value})} 
            className="input-dark text-[11px] flex-1" 
            placeholder="EJ: HUEVO FRITO" 
          />
          <input 
            type="number" 
            value={nuevaAdicion.valor} 
            onChange={e => setNuevaAdicion({...nuevaAdicion, valor: e.target.value})} 
            className={`input-dark text-[11px] w-20 ${nuevaAdicion.valor === "0" ? "text-red-500 font-bold" : ""}`} 
            placeholder="$" 
          />
          <button onClick={guardarAdicion} className="bg-yellow-600 text-black p-2 rounded-xl active:scale-90 transition-all">
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {adiciones.map(c => (
            <div key={c.id} className="bg-gray-900/30 border border-white/5 p-3 rounded-2xl flex justify-between items-center group">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase mb-1">{c.atributo}</p>
                <p className={`font-bold tracking-tight ${Number(c.valor) === 0 ? "text-red-500" : "text-white"}`}>
                  $ {c.valor}
                </p>
              </div>
              <button onClick={() => api.deleteConfig(c.id).then(refresh)} className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* COLUMNA COMISIÓN (Sólo edición) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2 ml-1">
          <Percent size={16} className="text-orange-500" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comisión de Reparto Única</h3>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          {/* Alerta de valor 0 */}
          {Number(valorComision) === 0 && (
            <div className="flex items-center gap-2 text-red-500 mb-4 animate-pulse">
              <AlertCircle size={14} />
              <span className="text-[9px] font-black uppercase">Atención: Comisión en $0</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Monto de envío</label>
              <div className="flex gap-2 mt-1">
                <input 
                  type="number" 
                  value={valorComision} 
                  onChange={e => setValorComision(e.target.value)} 
                  className={`input-dark text-xl font-bold flex-1 ${Number(valorComision) === 0 ? "border-red-500/50 text-red-500" : "text-white"}`}
                  placeholder="0.00" 
                />
                <button 
                  onClick={actualizarComision}
                  className="bg-orange-500 text-black px-4 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-orange-400 transition-colors"
                >
                  <Save size={16} />
                  Actualizar
                </button>
              </div>
            </div>
            
            <p className="text-[8px] text-gray-600 uppercase font-medium leading-relaxed">
              * Este valor se aplicará automáticamente a todos los pedidos que requieran envío por parte de los repartidores.
            </p>
          </div>
        </div>

        {/* Si no existe la comisión en la base de datos, mostramos un aviso */}
        {!comisionUnica && (
          <div className="p-4 border border-dashed border-gray-800 rounded-2xl text-center">
             <p className="text-[9px] text-gray-500 uppercase">No se encontró registro de comisión en la base de datos. Use el botón superior para crearla.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default SeccionPrecios;