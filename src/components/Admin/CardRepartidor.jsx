import React from 'react';
import { Bike, Printer, CheckCircle, ChevronRight, Package, DollarSign, ListOrdered, Check, CheckCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { imprimirHojaRuta } from '../../services/PrintService';

const CardRepartidor = ({ nombre, pedidos, configs, refreshData }) => {
  // 1. Buscamos el valor de la comisión en las configs (si no existe, usamos 0)
  const valorComisionBase = Number(configs?.find(c => c.tipo === 'comision')?.valor || 0);

  const pedidosEnRuta = pedidos.filter(p => p.statu === nombre);

  // --- FUNCIÓN PARA CONTAR ITEMS REALES ---
  const contarItemsReales = (listaDePedidos) => {
    return listaDePedidos.reduce((totalAcc, p) => {
      let itemsDelPedido = 0;
      try {
        if (p.detalle) {
          const rawDetalle = p.detalle.trim();
          const jsonValid = rawDetalle.startsWith('[') ? rawDetalle : `[${rawDetalle}]`;
          const itemsArray = JSON.parse(jsonValid);
          itemsDelPedido = itemsArray.reduce((acc, item) => acc + (parseInt(item.cantidad) || 1), 0);
        } else {
          itemsDelPedido = parseInt(p.cantidad) || 0;
        }
      } catch (e) {
        itemsDelPedido = parseInt(p.cantidad) || 0;
      }
      return totalAcc + itemsDelPedido;
    }, 0);
  };

  // Items en viaje actualmente
  const itemsEnViaje = contarItemsReales(pedidosEnRuta);

  // Items entregados históricamente
  const pedidosEntregados = pedidos.filter(p => p.statu === `ENTREGADO_${nombre}`);
  const totalItemsEntregados = contarItemsReales(pedidosEntregados);

  // --- CÁLCULO DE COMISIÓN DINÁMICO ---
  // Calculamos en base al valor de la DB (ej: 500 o 1000)
  const comisionAcumulada = totalItemsEntregados * valorComisionBase;
  
  const tienePedidos = pedidosEnRuta.length > 0;

  const finalizarEntrega = async (pedido) => {
    try {
      const pagoAsignado = (pedido.pagado && pedido.pagado !== "0" && pedido.pagado !== 0) 
          ? pedido.pagado 
          : 'EFECTIVO';

      await api.updatePedido(pedido.id, { 
          statu: `ENTREGADO_${nombre}`,
          pagado: pagoAsignado
      });
      refreshData();
    } catch (err) { console.error(err); }
  };

  const entregarTodo = async () => {
    if (pedidosEnRuta.length === 0) return;
    if (window.confirm(`¿Finalizar todos los pedidos de ${nombre}?`)) {
      try {
        await Promise.all(pedidosEnRuta.map(p => {
          const pagoAsignado = (p.pagado && p.pagado !== "0" && p.pagado !== 0) 
              ? p.pagado 
              : 'EFECTIVO';

          return api.updatePedido(p.id, { 
              statu: `ENTREGADO_${nombre}`,
              pagado: pagoAsignado
          });
        }));
        refreshData();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <div className={`p-1.5 rounded-xl border transition-all flex flex-col gap-1 ${tienePedidos ? 'bg-orange-500/5 border-orange-500/30 shadow-lg shadow-orange-500/5' : 'bg-gray-900/10 border-gray-800/40 opacity-40'}`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-md ${tienePedidos ? 'bg-orange-500/20' : 'bg-gray-800'}`}>
            <Bike size={10} className={tienePedidos ? 'text-orange-500' : 'text-gray-600'} />
          </div>
          <h3 className="font-black text-white uppercase text-[12px] tracking-tight truncate w-16">{nombre}</h3>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => imprimirHojaRuta(nombre, pedidosEnRuta)} disabled={!tienePedidos} className="p-1 text-blue-500 hover:text-blue-400 disabled:hidden"><Printer size={19} /></button>
          <button onClick={entregarTodo} disabled={!tienePedidos} className="p-1 text-green-500 hover:text-green-400 disabled:hidden"><CheckCircle size={19} /></button>
        </div>
      </div>

      {/* LISTA DE PEDIDOS */}
      <div className="flex flex-col gap-0.5 max-h-[90px] overflow-y-auto custom-scrollbar">
        {pedidosEnRuta.map((p) => {
          const cantReal = contarItemsReales([p]);
          const estaPagado = p.pagado && p.pagado !== "0" && p.pagado !== 0;

          return (
            <div key={p.id} className="flex items-center justify-between bg-black/40 p-1 px-2 rounded-md border border-white/5 group/item">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1 h-1 rounded-full ${estaPagado ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'}`} />
                <span className="text-[12px] font-bold text-gray-300 truncate uppercase">{p.cliente}</span>
                <span className="text-[12px] font-black text-orange-500/80">x{cantReal}</span>
              </div>
              <button onClick={() => finalizarEntrega(p)} className="ml-1 text-gray-700 group-hover/item:text-green-500 transition-colors">
                <CheckCircle2 size={17} strokeWidth={3}/>
              </button>
            </div>
          );
        })}
      </div>

      {/* PIE DE CARD: MÉTRICAS DINÁMICAS */}
      <div className="grid grid-cols-3 gap-1 mt-0.5">
        <div className="bg-black/40 border border-gray-800 p-1 rounded-lg flex flex-col items-center">
          <span className="text-[12px] font-bold text-gray-500 uppercase leading-none mb-1 tracking-tighter">En Ruta</span>
          <div className="flex items-center gap-1">
            <ListOrdered size={8} className="text-blue-400" />
            <span className="text-[12px] font-black text-white">{pedidosEnRuta.length}</span>
          </div>
        </div>

        <div className="bg-black/40 border border-gray-800 p-1 rounded-lg flex flex-col items-center">
          <span className="text-[12px] font-bold text-gray-500 uppercase leading-none mb-1 tracking-tighter">Items Ent.</span>
          <div className="flex items-center gap-1">
            <Package size={8} className="text-orange-500" />
            <span className="text-[12px] font-black text-white">{totalItemsEntregados}</span>
          </div>
        </div>

        <div className={`border p-1 rounded-lg flex flex-col items-center ${valorComisionBase === 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <span className={`text-[12px] font-bold uppercase leading-none mb-1 tracking-tighter ${valorComisionBase === 0 ? 'text-red-500' : 'text-orange-500'}`}>
            Comisión
          </span>
          <div className="flex items-center gap-0.5">
            <DollarSign size={8} className={valorComisionBase === 0 ? 'text-red-500' : 'text-orange-500'} />
            <span className={`text-[12px] font-black ${valorComisionBase === 0 ? 'text-red-500' : 'text-orange-500'} `}>
              {/* Mostramos el valor real formateado */}
              {comisionAcumulada}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardRepartidor;