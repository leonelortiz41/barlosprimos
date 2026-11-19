import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { imprimirComanda } from '../../services/PrintService';
import {
    CheckCircle2,
    Receipt,
    Trash2,
    Bike,
    Utensils,
    Wallet,
    Smartphone,
    Edit3
} from 'lucide-react';

const FilaPedido = ({ pedido, refreshData, repartidores = [] }) => {
    const navigate = useNavigate();
    const [mostrarOpcionesPago, setMostrarOpcionesPago] = useState(false);

    // FUNCIÓN DE PARSEO ROBUSTA: Soluciona el error "Unexpected non-whitespace character"
    const parsearContenidoPedido = () => {
        try {
            // El array de objetos puede estar en 'pedido' o en 'detalle'
            let fuente = pedido.pedido || pedido.detalle;
            
            if (!fuente) return [];
            
            // Si ya es un objeto/array (no string), lo devolvemos
            if (typeof fuente !== 'string') {
                return Array.isArray(fuente) ? fuente : [fuente];
            }

            let textoLimpio = fuente.trim();

            // REPARACIÓN DINÁMICA: Si el string tiene objetos separados por coma pero NO tiene corchetes
            // Ej: {"id":1...},{"id":2...} -> Lo convertimos a [{"id":1...},{"id":2...}]
            if (!textoLimpio.startsWith('[')) {
                textoLimpio = `[${textoLimpio}]`;
            }

            return JSON.parse(textoLimpio);
        } catch (e) {
            console.error("Error crítico al parsear pedido para edición:", e);
            return [];
        }
    };

    const obtenerTextoDetalle = () => {
        if (pedido.detalleTicket && pedido.detalleTicket.trim() !== "") {
            return pedido.detalleTicket;
        }
        const data = parsearContenidoPedido();
        if (data.length > 0) {
            return data.map(item => `${item.cantidad}x ${item.hidden_nombre || item.nombre}`).join(', ');
        }
        return pedido.detalle; // Fallback al texto plano si todo falla
    };

    // FUNCIÓN PARA REDIRIGIR AL POS EN MODO EDICIÓN
    const irAEditarAlPOS = () => {
        const productosCarrito = parsearContenidoPedido();
        
        if (productosCarrito.length === 0) {
            alert("No se pudo recuperar el detalle del pedido para editar.");
            return;
        }

        const sesionEdicion = {
            idPedido: pedido.id,
            cliente: pedido.cliente,
            carrito: productosCarrito, // Array de objetos {hidden_nombre, hidden_precio, etc}
            esEdicion: true
        };

        // Guardamos en LocalStorage y navegamos a la raíz (POS)
        localStorage.setItem('carrito_edicion', JSON.stringify(sesionEdicion));
        navigate('/'); 
    };

    const actualizarEstado = async (campos) => {
        try {
            await api.updatePedido(pedido.id, campos);
            refreshData();
            setMostrarOpcionesPago(false);
        } catch (err) {
            console.error("Error al actualizar pedido:", err);
        }
    };

    const manejarImpresion = (tipo) => {
        let dataParaTicket = { ...pedido };
        dataParaTicket.detalleOriginal = obtenerTextoDetalle();
        imprimirComanda(dataParaTicket, tipo);
    };

    const esEntregado = pedido.statu && pedido.statu.startsWith("ENTREGADO_");
    const esPagado = pedido.pagado && pedido.pagado !== "0" && pedido.pagado !== 0;
    const estaDesocupado = esEntregado;

    // ${estaDesocupado ? 'bg-green-800' : 'opacity-100'}
    return (
        <tr className={`
            hover:bg-gray-900/40 transition-all border-b border-gray-800/50
            ${estaDesocupado ? 'opacity-60 bg-green-800' : 'opacity-100'}
            ${esPagado && !estaDesocupado ? 'bg-green-500/5' : ''}
        `}>

            <td className="p-3 text-[10px] font-black text-gray-600 w-12">
                #{pedido.id}
            </td>

            <td className="p-3 min-w-[250px]">
                <div className="text-[12px] font-black text-white uppercase leading-tight break-words">
                    {obtenerTextoDetalle()}
                </div>
            </td>

            <td className="p-3">
                <div className={`text-[12px] font-black uppercase ${estaDesocupado ? 'text-gray-500' : 'text-orange-500'}`}>
                    {pedido.cliente}
                </div>
                {esPagado && !estaDesocupado && (
                    <span className="text-[10px] bg-green-500 text-black px-1 rounded font-black italic mt-1 inline-block uppercase">
                        {pedido.pagado === 1 || pedido.pagado === "1" ? 'PAGADO' : `PAGÓ ${pedido.pagado}`}
                    </span>
                )}
            </td>

            <td className="p-3 w-40">
                <select
                    value={esEntregado ? pedido.statu.replace("ENTREGADO_", "") : (pedido.statu || "0")}
                    onChange={(e) => actualizarEstado({ statu: e.target.value })}
                    disabled={estaDesocupado}
                    className={`bg-black border rounded-lg text-[11px] font-black uppercase p-1.5 outline-none w-full cursor-pointer transition-all ${
                        pedido.statu === "0" ? 'border-gray-800 text-gray-500' : 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
                    }`}
                >
                    <option value="0">🛒 MOSTRADOR</option>
                    {repartidores.map(rep => (
                        <option key={rep.id} value={rep.nombre}>
                            🛵 {rep.nombre.toUpperCase()}
                        </option>
                    ))}
                </select>
            </td>

            <td className="p-3 font-black text-white text-sm text-center">
                ${parseFloat(pedido.importe || 0).toLocaleString()}
            </td>

            <td className="p-3">
                <div className="flex justify-end items-center gap-1.5">
                    <button onClick={() => manejarImpresion('COCINA')} className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500 hover:text-white transition-all" title="Comanda Cocina"><Utensils size={14} /></button>
                    <button onClick={() => manejarImpresion('CLIENTE')} className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-500 hover:text-white transition-all" title="Ticket Cliente"><Receipt size={14} /></button>

                    <div className="w-[1px] h-4 bg-gray-800 mx-1" />

                    <button 
                        onClick={irAEditarAlPOS}
                        disabled={estaDesocupado}
                        className={`p-2 border rounded-lg transition-all ${
                            estaDesocupado 
                            ? 'bg-gray-900 border-gray-800 text-gray-700 cursor-not-allowed' 
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black'
                        }`}
                        title="Editar pedido en POS"
                    >
                        <Edit3 size={14} />
                    </button>

                    <button
                        onClick={() => actualizarEstado({ pj: parseInt(pedido.pj) === 1 ? 0 : 1 })}
                        className={`p-2 rounded-lg border font-black text-[10px] transition-all ${parseInt(pedido.pj) === 1 ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
                    > PJ </button>

                    <div className="relative">
                        <button
                            onClick={() => esPagado ? actualizarEstado({ pagado: 0 }) : setMostrarOpcionesPago(!mostrarOpcionesPago)}
                            className={`p-2 rounded-lg border transition-all ${esPagado ? 'bg-green-600 border-green-400 text-white shadow-lg shadow-green-900/20' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
                            title="Marcar como PAGADO"
                        >
                            <CheckCircle2 size={14} />
                        </button>

                        {mostrarOpcionesPago && (
                            <div className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl p-1.5 flex gap-1 z-50 min-w-[160px] animate-in fade-in zoom-in duration-150">
                                <button
                                    onClick={() => actualizarEstado({ pagado: 'EFECTIVO' })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-black hover:bg-green-600 p-2 rounded-lg text-[11px] font-black text-white transition-all border border-gray-800"
                                >
                                    <Wallet size={12} className="text-green-500" /> EFECTIVO
                                </button>
                                <button
                                    onClick={() => actualizarEstado({ pagado: 'TRANSF' })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-black hover:bg-blue-600 p-2 rounded-lg text-[11px] font-black text-white transition-all border border-gray-800"
                                >
                                    <Smartphone size={12} className="text-blue-400" /> TRANSF
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            const actual = pedido.statu || "0";
                            const nombreLimpio = esEntregado ? actual.replace("ENTREGADO_", "") : actual;

                            if (esEntregado) {
                                actualizarEstado({ statu: nombreLimpio });
                            } else {
                                const metodoPagoFinal = (pedido.pagado && pedido.pagado !== "0" && pedido.pagado !== 0)
                                    ? pedido.pagado
                                    : 'EFECTIVO';

                                actualizarEstado({
                                    statu: `ENTREGADO_${nombreLimpio}`,
                                    pagado: metodoPagoFinal
                                });
                            }
                        }}
                        className={`p-2 rounded-lg border transition-all ${esEntregado ? 'bg-orange-500 border-orange-400 text-black shadow-lg shadow-orange-900/40' : 'bg-gray-900 border-gray-800 text-gray-600 hover:text-orange-500'}`}
                        title="Marcar como ENTREGADO y PAGADO"
                    >
                        <Bike size={14} />
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm(`¿Borrar pedido #${pedido.id}?`)) {
                                try {
                                    await api.deletePedido(pedido.id);
                                    refreshData();
                                } catch (err) {
                                    alert("No se pudo borrar el pedido.");
                                }
                            }
                        }}
                        className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-red-700 hover:bg-red-600 hover:text-white transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default FilaPedido;