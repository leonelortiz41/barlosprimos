import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { imprimirComanda } from '../../services/PrintService';
import { registrarPedidoBorrado } from '../../services/historialBorrados';
import {
    CheckCircle2,
    Receipt,
    Trash2,
    Bike,
    Utensils,
    Wallet,
    Smartphone,
    Edit3,
    X,
    User
} from 'lucide-react';

const parsearContenidoPedido = (pedido) => {
    try {
        const fuente = pedido?.pedido ?? pedido?.detalle;
        if (!fuente) return [];

        if (typeof fuente !== 'string') {
            return Array.isArray(fuente) ? fuente : [fuente];
        }

        const textoLimpio = fuente.trim();
        if (!textoLimpio) return [];

        if (textoLimpio.startsWith('[') || textoLimpio.startsWith('{')) {
            const normalizado = textoLimpio.includes('}{')
                ? `[${textoLimpio.replace(/\}\s*\{/g, '},{')}]`
                : textoLimpio.startsWith('[')
                ? textoLimpio
                : `[${textoLimpio}]`;

            const parsed = JSON.parse(normalizado);
            return Array.isArray(parsed) ? parsed : [parsed];
        }

        return [];
    } catch (e) {
        console.error('Error crítico al parsear pedido:', e);
        return [];
    }
};

const limpiarNombreCliente = (rawCliente = '') => {
    return String(rawCliente)
        .replace(/^\[(?:WEB|MESA(?:\s*#?\s*\d+)?)\]\s*/i, '')
        .replace(/^[·|\s]+/, '')
        .split('(')[0]
        .trim();
};

const FilaPedido = ({ pedido, refreshData, repartidores = [] }) => {
    const navigate = useNavigate();
    const [mostrarOpcionesPago, setMostrarOpcionesPago] = useState(false);
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);

    const itemsParseados = useMemo(() => parsearContenidoPedido(pedido), [pedido]);

    const textoDetalle = useMemo(() => {
        if (pedido?.detalleTicket && pedido.detalleTicket.trim() !== '') {
            return pedido.detalleTicket;
        }
        if (itemsParseados.length > 0) {
            return itemsParseados
                .map((item) => `${item.cantidad || 1}x ${item.hidden_nombre || item.nombre || 'producto'}`)
                .join(', ');
        }
        return pedido?.detalle || '';
    }, [pedido, itemsParseados]);

    const esWeb = useMemo(() => {
        const marca = `${pedido?.pj ?? ''} ${pedido?.detalleTicket ?? ''} ${pedido?.cliente ?? ''}`.toUpperCase();
        return marca.includes('[WEB]') || marca.includes('WEB');
    }, [pedido]);

    const nombreMostrar = useMemo(() => {
        const limpio = limpiarNombreCliente(pedido?.cliente || 'CLIENTE') || 'CLIENTE';
        return esWeb ? `[WEB] ${limpio}` : limpio;
    }, [pedido?.cliente, esWeb]);

    const clienteCompletoRaw = useMemo(() => {
        const raw = String(pedido?.cliente || '').trim();
        return raw || nombreMostrar;
    }, [pedido?.cliente, nombreMostrar]);

    const irAEditarAlPOS = () => {
        if (itemsParseados.length === 0) {
            alert('No se pudo recuperar el detalle del pedido para editar.');
            return;
        }

        const carritoNormalizado = itemsParseados.map((item, idx) => {
            const cant = item.cantidad || 1;
            const subtotal = Number(item.hidden_precio ?? item.precio ?? 0) || 0;
            return {
                ...item,
                id: item.id || `${pedido.id}-${idx}`,
                cantidad: cant,
                precioUnitario:
                    typeof item.precioUnitario === 'number'
                        ? item.precioUnitario
                        : subtotal / cant,
                hidden_precio: Math.round(subtotal)
            };
        });

        const sesionEdicion = {
            idPedido: pedido.id,
            cliente: pedido.cliente || '',
            carrito: carritoNormalizado,
            esEdicion: true
        };

        localStorage.setItem('carrito_edicion', JSON.stringify(sesionEdicion));
        navigate('/');
    };

    const actualizarEstado = async (campos) => {
        try {
            await api.updatePedido(pedido.id, campos);
            setMostrarOpcionesPago(false);
            if (refreshData) {
                refreshData();
            }
        } catch (err) {
            console.error('Error al actualizar pedido:', err);
        }
    };

    const manejarImpresion = (tipo) => {
        const dataParaTicket = {
            ...pedido,
            pedido: itemsParseados.length > 0 ? itemsParseados : pedido.pedido,
            detalle: textoDetalle || pedido.detalle
        };
        imprimirComanda(dataParaTicket, tipo);
    };

    const manejarBorrarPedido = async () => {
        const motivo = window.prompt(
            `¿Borrar pedido #${pedido.id} de ${nombreMostrar}?\nIndicá el motivo (opcional):`
        );
        if (motivo === null) return;

        try {
            registrarPedidoBorrado(pedido, textoDetalle, motivo);
            await api.deletePedido(pedido.id);
            if (refreshData) {
                refreshData();
            }
        } catch (err) {
            console.error('Error al borrar pedido:', err);
            alert('No se pudo borrar el pedido.');
        }
    };

    const esEntregado = Boolean(pedido?.statu && String(pedido.statu).startsWith('ENTREGADO_'));
    const esPagado = Boolean(pedido?.pagado && pedido.pagado !== '0' && pedido.pagado !== 0);
    const estaDesocupado = esEntregado;
    const valorSelectViaje = esEntregado
        ? String(pedido.statu).replace('ENTREGADO_', '')
        : (pedido?.statu || '0');

    const etiquetaMedioPago =
        pedido?.pagado === 'TRANSF'
            ? 'transf'
            : pedido?.pagado === 'EFECTIVO' || pedido?.pagado === 1 || pedido?.pagado === '1'
            ? 'efec'
            : esPagado
            ? String(pedido.pagado).toLowerCase()
            : '';

    return (
        <>
            <tr
                className={`
                    hover:bg-gray-900/40 transition-all border-b border-gray-800/50
                    ${estaDesocupado ? 'opacity-60 bg-green-800/40' : 'opacity-100'}
                    ${esPagado && !estaDesocupado ? 'bg-green-500/5' : ''}
                `}
            >
                <td className="p-3 text-[10px] font-black text-gray-600 w-12">
                    #{pedido.id}
                </td>

                <td className="p-3 min-w-[220px]">
                    <div className="text-[12px] font-black text-white uppercase leading-tight break-words">
                        <span className="text-orange-400 mr-1.5">[#{pedido.id}]</span>
                        {textoDetalle}
                    </div>
                </td>

                <td className="p-3 w-44 max-w-[190px]">
                    <button
                        type="button"
                        onClick={() => setModalClienteAbierto(true)}
                        className="text-left w-full group cursor-pointer focus:outline-none"
                        title="Tocá para ver datos completos del cliente"
                    >
                        <div
                            className={`text-[12px] font-black uppercase leading-snug break-words line-clamp-3 group-hover:underline ${
                                estaDesocupado ? 'text-gray-400' : 'text-orange-500'
                            }`}
                        >
                            {nombreMostrar}
                        </div>
                    </button>
                    {esPagado && !estaDesocupado && (
                        <span className="text-[10px] bg-green-500 text-black px-1 rounded font-black italic mt-1 inline-block uppercase">
                            {pedido.pagado === 1 || pedido.pagado === '1'
                                ? 'PAGADO'
                                : `PAGÓ ${pedido.pagado}`}
                        </span>
                    )}
                </td>

                <td className="p-3 w-40">
                    <select
                        value={valorSelectViaje}
                        onChange={(e) => actualizarEstado({ statu: e.target.value })}
                        disabled={estaDesocupado}
                        className={`bg-black border rounded-lg text-[11px] font-black uppercase p-1.5 outline-none w-full cursor-pointer transition-all ${
                            pedido.statu === '0'
                                ? 'border-gray-800 text-gray-500'
                                : 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
                        }`}
                    >
                        <option value="0">🛒 MOSTRADOR</option>
                        {repartidores.map((rep) => (
                            <option key={rep.id ?? rep.nombre} value={rep.nombre}>
                                🛵 {String(rep.nombre).toUpperCase()}
                            </option>
                        ))}
                    </select>
                </td>

                <td className="p-3 font-black text-white text-sm text-center whitespace-nowrap">
                    ${(parseFloat(pedido.importe) || 0).toLocaleString()}
                </td>

                <td className="p-3">
                    <div className="flex justify-end items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => manejarImpresion('COCINA')}
                            className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                            title="Comanda Cocina"
                        >
                            <Utensils size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={() => manejarImpresion('CLIENTE')}
                            className="p-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-500 hover:text-white transition-all"
                            title="Ticket Cliente"
                        >
                            <Receipt size={14} />
                        </button>

                        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

                        <button
                            type="button"
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
                            type="button"
                            onClick={() =>
                                actualizarEstado({ pj: parseInt(pedido.pj, 10) === 1 ? 0 : 1 })
                            }
                            title="Pago justo"
                            className={`p-2 rounded-lg border font-black text-[10px] transition-all ${
                                parseInt(pedido.pj, 10) === 1
                                    ? 'bg-blue-600 border-blue-400 text-white'
                                    : 'bg-gray-900 border-gray-800 text-gray-600'
                            }`}
                        >
                            PJ
                        </button>

                        <div className="relative inline-flex items-center justify-center">
                            {esPagado && etiquetaMedioPago && (
                                <span
                                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] font-black lowercase leading-none px-1 py-[1px] rounded tracking-tight pointer-events-none whitespace-nowrap z-10 ${
                                        pedido?.pagado === 'TRANSF'
                                            ? 'text-blue-300 bg-blue-950/90 border border-blue-500/40'
                                            : 'text-emerald-300 bg-emerald-950/90 border border-emerald-500/40'
                                    }`}
                                >
                                    {etiquetaMedioPago}
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    esPagado
                                        ? actualizarEstado({ pagado: 0 })
                                        : setMostrarOpcionesPago((prev) => !prev)
                                }
                                className={`p-2 rounded-lg border transition-all ${
                                    esPagado
                                        ? 'bg-green-600 border-green-400 text-white shadow-lg shadow-green-900/20'
                                        : 'bg-gray-900 border-gray-800 text-gray-600'
                                }`}
                                title={esPagado ? 'Quitar marca de pagado' : 'Marcar como PAGADO'}
                            >
                                <CheckCircle2 size={14} />
                            </button>

                            {mostrarOpcionesPago && (
                                <div className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl p-1.5 flex gap-1 z-50 min-w-[160px]">
                                    <button
                                        type="button"
                                        onClick={() => actualizarEstado({ pagado: 'EFECTIVO' })}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-black hover:bg-green-600 p-2 rounded-lg text-[11px] font-black text-white transition-all border border-gray-800"
                                    >
                                        <Wallet size={12} className="text-green-500" /> EFECTIVO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => actualizarEstado({ pagado: 'TRANSF' })}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-black hover:bg-blue-600 p-2 rounded-lg text-[11px] font-black text-white transition-all border border-gray-800"
                                    >
                                        <Smartphone size={12} className="text-blue-400" /> TRANSF
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const actual = pedido.statu || '0';
                                const nombreLimpio = esEntregado
                                    ? String(actual).replace('ENTREGADO_', '')
                                    : actual;

                                if (esEntregado) {
                                    actualizarEstado({ statu: nombreLimpio });
                                } else {
                                    const metodoPagoFinal = esPagado ? pedido.pagado : 'EFECTIVO';
                                    actualizarEstado({
                                        statu: `ENTREGADO_${nombreLimpio}`,
                                        pagado: metodoPagoFinal
                                    });
                                }
                            }}
                            className={`p-2 rounded-lg border transition-all ${
                                esEntregado
                                    ? 'bg-orange-500 border-orange-400 text-black shadow-lg shadow-orange-900/40'
                                    : 'bg-gray-900 border-gray-800 text-gray-600 hover:text-orange-500'
                            }`}
                            title="Marcar como ENTREGADO y PAGADO"
                        >
                            <Bike size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={manejarBorrarPedido}
                            title="Borrar pedido (queda registrado)"
                            className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-red-700 hover:bg-red-600 hover:text-white transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>

            {modalClienteAbierto && (
                <div
                    className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setModalClienteAbierto(false)}
                >
                    <div
                        className="bg-[#111318] border border-gray-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                        Datos del Cliente · Pedido #{pedido.id}
                                    </h3>
                                    <p className="text-[11px] text-gray-400">
                                        Monto: ${(parseFloat(pedido.importe) || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalClienteAbierto(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                                    Cliente / Referencia completa
                                </span>
                                <p className="bg-black/60 border border-gray-800 rounded-xl p-3 font-bold text-orange-400 break-words">
                                    {clienteCompletoRaw}
                                </p>
                            </div>

                            {textoDetalle && (
                                <div>
                                    <span className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                                        Detalle del pedido
                                    </span>
                                    <p className="bg-black/60 border border-gray-800 rounded-xl p-3 text-gray-200 break-words">
                                        {textoDetalle}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => setModalClienteAbierto(false)}
                                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FilaPedido;