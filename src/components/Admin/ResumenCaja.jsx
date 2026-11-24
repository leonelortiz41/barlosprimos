import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Wallet,
  ClipboardList,
  CircleDollarSign,
  Smartphone,
  History,
  X
} from 'lucide-react';
import BotonCierreCaja from './BotonCierreCaja';
import { obtenerPedidosBorrados } from '../../services/historialBorrados';

const ResumenCaja = ({ pedidos = [], onBorrarTodo, tickBorrados = 0 }) => {
  const [mostrarMontos, setMostrarMontos] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [borrados, setBorrados] = useState([]);

  const cargarBorrados = () => {
    setBorrados(obtenerPedidosBorrados());
  };

  useEffect(() => {
    cargarBorrados();
  }, [tickBorrados, pedidos]);

  const abrirModalBorrados = () => {
    cargarBorrados();
    setModalAbierto(true);
  };

  const esPagado = (p) => p.pagado && p.pagado !== '0' && p.pagado !== 0;
  const pedidosPagados = pedidos.filter(esPagado);

  const totalBruto = pedidos.reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const totalEfectivo = pedidosPagados
    .filter((p) => p.pagado === 'EFECTIVO' || p.pagado === 1 || p.pagado === '1')
    .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const totalTransf = pedidosPagados
    .filter((p) => p.pagado === 'TRANSF')
    .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const totalBorrados = borrados.reduce((acc, b) => acc + (parseFloat(b.importe) || 0), 0);
  const totalPedidos = pedidos.length;

  return (
    <>
      <div className="w-full flex items-center justify-between gap-2 h-full px-1 overflow-x-auto custom-scrollbar">
        {/* SECCIÓN DINERO: BRUTO | EFECTIVO | TRANSFERENCIA */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          {/* Venta Total */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20 shrink-0">
              <CircleDollarSign className="text-blue-500" size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-500 uppercase leading-none mb-1 tracking-tight whitespace-nowrap">
                venta total
              </p>
              <h2 className="text-sm font-black text-white tracking-tight leading-none whitespace-nowrap">
                {mostrarMontos ? `$${totalBruto.toLocaleString('es-AR')}` : '••••••'}
              </h2>
            </div>
          </div>

          {/* Efectivo Caja */}
          <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
            <div className="bg-green-500/10 p-1.5 rounded-lg border border-green-500/20 shrink-0">
              <Wallet className="text-green-500" size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-green-500 uppercase leading-none mb-1 tracking-tight whitespace-nowrap">
                efectivo
              </p>
              <h2 className="text-sm font-black text-white tracking-tight leading-none whitespace-nowrap">
                {mostrarMontos ? `$${totalEfectivo.toLocaleString('es-AR')}` : '••••••'}
              </h2>
            </div>
          </div>

          {/* Transferencias */}
          <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
            <div className="bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/20 shrink-0">
              <Smartphone className="text-purple-500" size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-purple-500 uppercase leading-none mb-1 tracking-tight whitespace-nowrap">
                transferencia
              </p>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-white tracking-tight leading-none whitespace-nowrap">
                  {mostrarMontos ? `$${totalTransf.toLocaleString('es-AR')}` : '••••••'}
                </h2>
                <button
                  type="button"
                  onClick={() => setMostrarMontos(!mostrarMontos)}
                  className="text-gray-500 hover:text-white transition-colors p-0.5 cursor-pointer shrink-0"
                  title={mostrarMontos ? 'Ocultar montos' : 'Mostrar montos'}
                >
                  {mostrarMontos ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MÉTRICAS DE ESTADO Y BORRADOS */}
        <div className="flex items-center gap-2.5 border-x border-gray-800 px-3 py-1 shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <ClipboardList size={13} className="text-gray-500 shrink-0" />
            <span className="text-xs font-black text-white">
              {totalPedidos}{' '}
              <span className="text-[10px] text-gray-500 uppercase font-bold">
                pedidos
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={abrirModalBorrados}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 transition-all whitespace-nowrap cursor-pointer"
            title="Ver registro de pedidos borrados (guardado local)"
          >
            <History size={12} className="shrink-0" />
            <span className="text-[10px] font-black uppercase">
              Borrados ({borrados.length})
            </span>
          </button>
        </div>

        {/* BOTÓN FINALIZAR DÍA */}
        <div className="shrink-0">
          <BotonCierreCaja
            pedidos={pedidos}
            onBorrarTodo={onBorrarTodo}
          />
        </div>
      </div>

      {/* MODAL REGISTRO DE PEDIDOS BORRADOS */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-900/40">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <History size={16} className="text-red-400" />
                  Registro de Pedidos Borrados (Local)
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Guardado en este navegador · Total anulado:{' '}
                  <strong className="text-red-400">
                    ${totalBorrados.toLocaleString('es-AR')}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {borrados.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs font-bold uppercase">
                  No hay pedidos borrados registrados en este navegador.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="py-2.5 px-3">Pedido</th>
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Detalle</th>
                      <th className="py-2.5 px-3">Motivo</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50 text-xs">
                    {borrados.map((b) => (
                      <tr key={b.uid} className="hover:bg-gray-900/40">
                        <td className="py-2.5 px-3 font-black text-orange-400">
                          #{b.id}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                          {b.fechaHora}
                        </td>
                        <td className="py-2.5 px-3 font-black text-white uppercase">
                          {b.cliente}
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 uppercase max-w-xs break-words">
                          {b.detalle}
                        </td>
                        <td className="py-2.5 px-3 text-amber-400/90 italic">
                          {b.motivo}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-red-400 whitespace-nowrap">
                          ${(parseFloat(b.importe) || 0).toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResumenCaja;