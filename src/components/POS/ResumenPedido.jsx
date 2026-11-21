import React from 'react';
import { Trash2, Plus, Minus, User, ShoppingBag, Save, Send } from 'lucide-react';

const ResumenPedido = ({
  cliente,
  setCliente,
  carrito,
  setCarrito,
  onConfirmar,
  esEdicion = false,
  procesando = false
}) => {
  // Modifica cantidad y actualiza el subtotal proporcionalmente sin perder precisión por redondeo
  const modificarCantidadCarrito = (id, delta) => {
    setCarrito((prevCarrito) =>
      prevCarrito
        .map((item) => {
          if (item.id !== id) return item;

          const cantActual = item.cantidad || 1;
          const nuevaCant = cantActual + delta;

          if (nuevaCant <= 0) return null;

          const precioUnitario =
            typeof item.precioUnitario === 'number'
              ? item.precioUnitario
              : (Number(item.hidden_precio) || 0) / cantActual;

          return {
            ...item,
            cantidad: nuevaCant,
            precioUnitario,
            hidden_precio: Math.round(precioUnitario * nuevaCant)
          };
        })
        .filter(Boolean)
    );
  };

  const eliminarItem = (id) => {
    setCarrito((prevCarrito) => prevCarrito.filter((item) => item.id !== id));
  };

  const totalPedido = carrito.reduce(
    (acc, item) => acc + (Number(item.hidden_precio) || 0),
    0
  );

  const totalUnidades = carrito.reduce(
    (acc, item) => acc + (item.cantidad || 1),
    0
  );

  const puedeConfirmar =
    carrito.length > 0 && Boolean(cliente && cliente.trim()) && !procesando;

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl relative">
      
      {/* SECCIÓN CLIENTE / MESA */}
      <div className="p-4 border-b border-gray-800 bg-gray-900/20 flex-shrink-0">
        <div className="relative group">
          <User
            className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              esEdicion
                ? 'text-blue-500'
                : 'text-gray-600 group-focus-within:text-orange-500'
            }`}
            size={16}
          />
          <input
            type="text"
            placeholder="NOMBRE DEL CLIENTE / MESA"
            className={`w-full bg-black border rounded-xl py-3 pl-10 pr-4 text-[11px] font-black outline-none placeholder:text-gray-800 uppercase transition-all ${
              esEdicion
                ? 'border-blue-500/50 text-blue-400 focus:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'border-gray-700 text-orange-500 focus:border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
            }`}
            value={cliente}
            onChange={(e) => setCliente(e.target.value.toUpperCase())}
          />
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {carrito.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-800 space-y-2 opacity-30">
            <ShoppingBag size={40} strokeWidth={1} />
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">
              Esperando Pedido
            </p>
          </div>
        ) : (
          carrito.map((item) => {
            const cantidad = item.cantidad || 1;
            const subtotal = Math.round(Number(item.hidden_precio) || 0);

            return (
              <div
                key={item.id}
                className={`bg-gray-900/10 border border-gray-800/60 rounded-xl p-3 hover:bg-gray-900/30 transition-colors group ${
                  esEdicion
                    ? 'hover:border-blue-900/50'
                    : 'hover:border-orange-900/50'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-300 leading-tight uppercase break-words">
                      {item.hidden_nombre}
                    </p>
                    <p
                      className={`${
                        esEdicion ? 'text-blue-400' : 'text-orange-500'
                      } font-black text-sm mt-1`}
                    >
                      ${subtotal.toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarItem(item.id)}
                    aria-label={`Eliminar ${item.hidden_nombre}`}
                    title="Eliminar ítem"
                    className="p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-800/40">
                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
                    Cantidad
                  </span>
                  <div className="flex items-center gap-1 bg-black rounded-lg p-0.5 border border-gray-800">
                    <button
                      type="button"
                      onClick={() => modificarCantidadCarrito(item.id, -1)}
                      aria-label="Restar unidad"
                      title="Restar unidad"
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <div className="w-8 text-center text-xs font-black text-white">
                      {cantidad}
                    </div>
                    <button
                      type="button"
                      onClick={() => modificarCantidadCarrito(item.id, 1)}
                      aria-label="Sumar unidad"
                      title="Sumar unidad"
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER - TOTALES Y ACCIÓN */}
      <div className="p-4 border-t-2 border-gray-800 bg-black flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
              Total a Pagar
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-gray-500 font-bold text-sm">$</span>
              <span className="text-3xl font-black text-white tracking-tighter">
                {Math.round(totalPedido).toLocaleString()}
              </span>
            </div>
          </div>

          <div
            className={`${
              esEdicion
                ? 'bg-blue-500/10 border-blue-500/20'
                : 'bg-orange-500/10 border-orange-500/20'
            } px-3 py-1 rounded-full border`}
          >
            <span
              className={`text-[10px] font-black uppercase ${
                esEdicion ? 'text-blue-400' : 'text-orange-500'
              }`}
            >
              {totalUnidades} {totalUnidades === 1 ? 'Unidad' : 'Unidades'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirmar}
          disabled={!puedeConfirmar}
          className={`w-full py-4 rounded-xl flex flex-col justify-center items-center transition-all active:scale-95 shadow-xl ${
            puedeConfirmar
              ? esEdicion
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40'
                : 'bg-orange-500 text-black hover:bg-orange-400 shadow-orange-900/40'
              : 'bg-gray-900 text-gray-700 cursor-not-allowed border border-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {esEdicion ? <Save size={18} /> : <Send size={18} />}
            <span className="uppercase font-black text-[13px] tracking-widest">
              {procesando
                ? 'Procesando...'
                : esEdicion
                ? 'Actualizar Pedido'
                : 'Finalizar Venta'}
            </span>
          </div>
          <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter mt-0.5">
            {esEdicion
              ? 'Se guardarán los cambios realizados'
              : 'Imprimir Comanda y Guardar en BD'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ResumenPedido;