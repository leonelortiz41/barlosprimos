import React, { useState } from 'react';
import { Eye, EyeOff, Wallet, CheckCircle2, ClipboardList, CircleDollarSign, Package, Smartphone } from 'lucide-react';
import BotonCierreCaja from './BotonCierreCaja';

const ResumenCaja = ({ pedidos,onBorrarTodo }) => {
  const [mostrarMontos, setMostrarMontos] = useState(false);

  // 1. Lógica de filtrado y cálculos
  const esPagado = (p) => p.pagado && p.pagado !== "0" && p.pagado !== 0;
  const pedidosPagados = pedidos.filter(esPagado);

  const totalBruto = pedidos.reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const totalEfectivo = pedidosPagados
    .filter(p => p.pagado === 'EFECTIVO' || p.pagado === 1 || p.pagado === "1")
    .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const totalTransf = pedidosPagados
    .filter(p => p.pagado === 'TRANSF')
    .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  // 2. Métricas de cantidades
  const totalPedidos = pedidos.length;
  const cantidadPagados = pedidosPagados.length;
  const cantidadEntregados = pedidos.filter(p => p.statu?.startsWith('ENTREGADO_')).length;

  return (
    <div className="w-full flex items-center justify-between gap-4 h-full px-4">

      {/* SECCIÓN DINERO: BRUTO | EFECTIVO | TRANSFERENCIA */}
      <div className="flex items-center gap-5">

        {/* Venta Total */}
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
            <CircleDollarSign className="text-blue-500" size={16} />
          </div>
          <div>
            <p className="text-[11px] font-black text-gray-500 uppercase leading-none mb-1 tracking-tighter">venta total</p>
            <h2 className="text-base font-black text-white tracking-tighter leading-none">
              {mostrarMontos ? `$${totalBruto.toLocaleString()}` : "••••••"}
            </h2>
          </div>
        </div>

        {/* Efectivo Caja */}
        <div className="flex items-center gap-2.5 border-l border-gray-800 pl-5">
          <div className="bg-green-500/10 p-2 rounded-xl border border-green-500/20">
            <Wallet className="text-green-500" size={16} />
          </div>
          <div>
            <p className="text-[11px] font-black text-green-500 uppercase leading-none mb-1 tracking-tighter">efectivo</p>
            <h2 className="text-base font-black text-white tracking-tighter leading-none">
              {mostrarMontos ? `$${totalEfectivo.toLocaleString()}` : "••••••"}
            </h2>
          </div>
        </div>

        {/* Transferencias */}
        <div className="flex items-center gap-2.5 border-l border-gray-800 pl-5">
          <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20">
            <Smartphone className="text-purple-500" size={16} />
          </div>
          <div>
            <p className="text-[11px] font-black text-purple-500 uppercase leading-none mb-1 tracking-tighter">transferencia</p>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tighter leading-none">
                {mostrarMontos ? `$${totalTransf.toLocaleString()}` : "••••••"}
              </h2>
              <button onClick={() => setMostrarMontos(!mostrarMontos)} className="text-gray-600 hover:text-white transition-colors">
                {mostrarMontos ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MÉTRICAS DE ESTADO */}
      <div className="flex items-center gap-6 border-x border-gray-800 px-6 py-1">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-gray-500" />
          <span className="text-xs font-black text-white">{totalPedidos} <span className="text-[11px] text-gray-500 uppercase font-bold">pedidos</span></span>
        </div>
        {/* <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-500" />
          <span className="text-xs font-black text-white">{cantidadPagados} <span className="text-[11px] text-gray-500 uppercase font-bold">pagados</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Package size={14} className="text-blue-400" />
          <span className="text-xs font-black text-white">{cantidadEntregados} <span className="text-[11px] text-gray-500 uppercase font-bold">entregados</span></span>
        </div> */}
      </div>

      {/* BOTÓN FINALIZAR DÍA */}
      <BotonCierreCaja
        pedidos={pedidos}
        onBorrarTodo={onBorrarTodo} 
      />
    </div>
  );
};

export default ResumenCaja;