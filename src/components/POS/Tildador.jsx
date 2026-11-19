import React, { useEffect } from 'react';
import { Plus, Minus, Check, X, Info } from 'lucide-react';

const Tildador = ({ config, setConfig, onAgregar, adicionalesDB = [] }) => {
  // Si no hay nombre en la configuración, no renderizamos nada
  if (!config.nombre) return null;

  const cerrarTildador = () => {
    setConfig({ ...config, nombre: "" });
  };

  useEffect(() => {
    const handleTeclas = (e) => {
      if (e.key === 'Escape') cerrarTildador();
      if (e.key === 'Enter') {
        e.preventDefault();
        onAgregar();
      }
    };
    window.addEventListener('keydown', handleTeclas);
    return () => window.removeEventListener('keydown', handleTeclas);
  }, [config, onAgregar]);

  const modificarCantidad = (extra, valor) => {
    const actual = config.agregados[extra] || 0;
    if (actual + valor < 0) return;
    setConfig({
      ...config,
      agregados: { ...config.agregados, [extra]: actual + valor }
    });
  };

  const toggleIngrediente = (ing) => {
    setConfig({
      ...config,
      ingredientes: { ...config.ingredientes, [ing]: !config.ingredientes[ing] }
    });
  };

  // --- LÓGICA DE PRECIO DINÁMICA ---
  const calcularTotalAdicionales = () => {
    let extraTotal = 0;
    Object.entries(config.agregados).forEach(([nombreExtra, cantidad]) => {
      // Buscamos el precio en los adicionales que vienen de la DB
      const infoExtra = adicionalesDB.find(
        (a) => a.atributo.toUpperCase() === nombreExtra.toUpperCase()
      );
      const precioUnitario = infoExtra ? parseFloat(infoExtra.valor) : 0;
      extraTotal += precioUnitario * cantidad;
    });
    return extraTotal;
  };

  const precioFinal = Math.floor(config.precioBase) + calcularTotalAdicionales();

  return (
    <div className="bg-[#0a0a0a] border border-orange-500 rounded-2xl flex flex-col h-full shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">

      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/40 flex justify-between items-center">
        <div className="min-w-0">
          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded">
            Personalizando
          </span>
          <h3 className="text-sm font-black text-white uppercase mt-1 truncate">
            {config.nombre}
          </h3>
        </div>
        <button onClick={cerrarTildador} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all">
          <X size={20} />
        </button>
      </div>

      {/* CUERPO */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-black/40">
        {/* SECCIÓN 2: INGREDIENTES PARA QUITAR */}
        {Object.keys(config.ingredientes).length > 0 && (
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest flex items-center gap-2">
              <Info size={12} /> Quitar de la receta
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(config.ingredientes).map(([ing, activo]) => (
                <button
                  key={ing}
                  onClick={() => toggleIngrediente(ing)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-black text-[9px] transition-all active:scale-95 ${activo
                      ? 'border-gray-800 text-gray-600'
                      : 'border-red-900 bg-red-900/20 text-red-500'
                    }`}
                >
                  {activo ? <Check size={10} /> : <X size={10} />}
                  {ing.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* SECCIÓN 1: ADICIONALES DINÁMICOS */}
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase mb-3 tracking-widest flex items-center gap-2">
            <Plus size={12} /> Extras disponibles
          </p>
          <div className="grid grid-cols-1 gap-2">
            {/* Mapeamos los adicionales que vienen de la DB */}
            {adicionalesDB.map((ad) => {
              const cant = config.agregados[ad.atributo] || 0;
              return (
                <div key={ad.id} className="flex justify-between items-center p-2 rounded-xl border border-gray-800/50 bg-gray-900/10 hover:border-gray-700 transition-colors">
                  <div className="flex flex-col ml-2">
                    <span className="text-[11px] font-bold text-gray-300 uppercase leading-none">{ad.atributo}</span>
                    <span className="text-[9px] font-black text-orange-500/60 mt-1">+ ${ad.valor}</span>
                  </div>

                  <div className="flex items-center gap-3 bg-black rounded-lg p-1 border border-gray-800">
                    <button
                      onClick={() => modificarCantidad(ad.atributo, -1)}
                      className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-md"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`text-xs font-black min-w-[15px] text-center ${cant > 0 ? 'text-orange-500' : 'text-gray-700'}`}>
                      {cant}
                    </span>
                    <button
                      onClick={() => modificarCantidad(ad.atributo, 1)}
                      className="w-7 h-7 flex items-center justify-center text-green-500 hover:bg-green-500/10 rounded-md"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/60">
        <button
          onClick={onAgregar}
          className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black py-4 rounded-xl flex justify-between items-center px-6 transition-all active:scale-[0.98]"
        >
          <div className="text-left">
            <span className="text-[10px] uppercase font-black block leading-none tracking-widest">Confirmar</span>
            <span className="text-[9px] uppercase opacity-60 font-bold">Presiona Enter</span>
          </div>
          <span className="text-2xl font-black tracking-tighter">
            ${precioFinal}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Tildador;