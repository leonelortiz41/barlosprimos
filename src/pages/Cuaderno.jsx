import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { limpiarPedidosBorrados } from '../services/historialBorrados';
import FilaPedido from '../components/Admin/FilaPedido';
import CardRepartidor from '../components/Admin/CardRepartidor';
import ResumenCaja from '../components/Admin/ResumenCaja';
import HeaderAdmin from '../components/Admin/HeaderAdmin';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  BellRing,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  UtensilsCrossed
} from 'lucide-react';

const CONFIRMADOS_KEY = 'bar_los_primos_pedidos_confirmados_v1';

const extraerArray = (respuesta, clavesPosibles = ['data', 'pedidos', 'repartidores', 'rows']) => {
  const base = respuesta?.data ?? respuesta;
  if (Array.isArray(base)) return base;
  if (base && typeof base === 'object') {
    for (const clave of clavesPosibles) {
      if (Array.isArray(base[clave])) return base[clave];
    }
  }
  return [];
};

const parsearImporte = (valor) => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const limpio = String(valor ?? '0').replace(/[^\d.-]/g, '');
  const num = Number.parseFloat(limpio);
  return Number.isFinite(num) ? num : 0;
};

const leerConfirmadosGuardados = () => {
  try {
    const raw = localStorage.getItem(CONFIRMADOS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
};

const guardarConfirmados = (ids) => {
  try {
    localStorage.setItem(CONFIRMADOS_KEY, JSON.stringify(ids.map(String)));
  } catch {
    // Ignorar si localStorage no está disponible
  }
};

const extraerNumeroMesa = (pedido = {}) => {
  if (pedido?.mesa != null && String(pedido.mesa).trim() !== '') {
    const n = Number.parseInt(String(pedido.mesa).replace(/\D/g, ''), 10);
    if (Number.isInteger(n) && n > 0) return n;
  }
  const fuente = `${pedido?.cliente ?? ''} ${pedido?.detalleTicket ?? ''}`;
  const match = fuente.match(/\[?\s*MESA\s*#?\s*(\d+)\s*\]?/i);
  if (match?.[1]) {
    const n = Number.parseInt(match[1], 10);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
};

const esPedidoMesa = (pedido = {}) => {
  if (String(pedido?.tipoEntrega || '').toUpperCase() === 'MESA') return true;
  if (String(pedido?.origen || '').toUpperCase().includes('MESA')) return true;
  return extraerNumeroMesa(pedido) !== null;
};

const extraerNombreLimpio = (rawCliente = '') => {
  const sinPrefijo = String(rawCliente)
    .replace(/^\[(?:WEB|MESA(?:\s*#?\s*\d+)?)\]\s*/i, '')
    .replace(/^[·|\s]+/, '')
    .trim();
  const soloNombre = sinPrefijo.split(/[·|]/)[0].trim();
  return soloNombre || 'Cliente';
};

const extraerDireccionPedido = (pedido = {}) => {
  if (esPedidoMesa(pedido)) return '';

  if (pedido?.direccion && String(pedido.direccion).trim()) {
    return String(pedido.direccion).trim();
  }

  const partesCliente = String(pedido?.cliente || '')
    .replace(/^\[(?:WEB|MESA(?:\s*#?\s*\d+)?)\]\s*/i, '')
    .replace(/^[·|\s]+/, '')
    .split(/[·|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const parte of partesCliente.slice(1)) {
    const sinEtiqueta = parte
      .replace(/^(?:DIR(?:ECCION|ECCIÓN)?|DOMICILIO|ENV[ÍI]O)[:\s-]*/i, '')
      .trim();
    const esSoloTel = /^(?:TEL[:\s]*|WHATSAPP[:\s]*|\+?54\s*9?\s*)?\d{7,}$/i.test(parte);
    const esRetiro = /^RETIRO(?:\s+EN\s+LOCAL)?$/i.test(sinEtiqueta);
    const esMesaTxt = /^MESA\s*#?\s*\d+$/i.test(sinEtiqueta);
    if (sinEtiqueta && !esSoloTel && !esRetiro && !esMesaTxt) {
      return sinEtiqueta;
    }
  }

  const ticket = String(pedido?.detalleTicket || '');
  const matchDir = ticket.match(
    /(?:DIR(?:ECCION|ECCIÓN)?|DOMICILIO|ENV[ÍI]O)[:\s]+([^·|\n]+?)(?=\s*(?:·|\||TEL[:\s]|WHATSAPP[:\s]|PAGO[:\s]|TOTAL[:\s]|$))/i
  );
  if (matchDir?.[1]) {
    const candidata = matchDir[1].trim();
    if (!/^RETIRO(?:\s+EN\s+LOCAL)?$/i.test(candidata)) {
      return candidata;
    }
  }

  return '';
};

const extraerTelefonoPedido = (pedido) => {
  if (esPedidoMesa(pedido)) return '';
  const directo = pedido?.telefono || pedido?.celular || pedido?.whatsapp;
  if (directo) {
    return String(directo).replace(/\D/g, '');
  }
  const fuente = `${pedido?.cliente ?? ''} ${pedido?.detalleTicket ?? ''}`;
  const matchTel = fuente.match(/(?:TEL[:\s]*|WHATSAPP[:\s]*|\+?54\s*9?\s*)?(\d{10,13})/i);
  if (!matchTel) return '';
  return matchTel[1].replace(/\D/g, '');
};

const esPedidoWeb = (pedido) => {
  if (esPedidoMesa(pedido)) return true;
  const origen = String(pedido?.origen || '').toUpperCase();
  if (origen === 'WEB' || origen === 'MESA_QR') return true;
  const clienteStr = String(pedido?.cliente ?? '').toUpperCase();
  if (clienteStr.includes('[WEB]')) return true;
  return Boolean(extraerTelefonoPedido(pedido));
};

const formatearTelefonoLegible = (pedido = {}) => {
  const digitos = extraerTelefonoPedido(pedido);
  if (!digitos) return '';
  if (digitos.startsWith('549') && digitos.length > 10) {
    return digitos.slice(3);
  }
  if (digitos.startsWith('54') && digitos.length > 10) {
    return digitos.slice(2);
  }
  return digitos;
};

const construirClienteConfirmado = (pedido = {}) => {
  const nombre = extraerNombreLimpio(pedido?.cliente || 'Cliente');
  const numMesa = extraerNumeroMesa(pedido);

  if (esPedidoMesa(pedido)) {
    return numMesa ? `${nombre} · Mesa #${numMesa}` : `${nombre} · Mesa`;
  }

  const direccion = extraerDireccionPedido(pedido);
  const telefono = formatearTelefonoLegible(pedido);

  const partes = [nombre];

  if (direccion && !nombre.toUpperCase().includes(direccion.toUpperCase())) {
    partes.push(direccion);
  }

  if (telefono && !partes.join(' ').includes(telefono)) {
    partes.push(`Tel: ${telefono}`);
  }

  return partes.join(' · ');
};

const construirUrlWhatsApp = (pedido) => {
  let digitos = extraerTelefonoPedido(pedido);
  if (!digitos) return '';

  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (digitos.startsWith('54') && !digitos.startsWith('549') && digitos.length >= 12) {
    digitos = `549${digitos.slice(2)}`;
  } else if (!digitos.startsWith('54')) {
    if (digitos.length >= 11 && digitos.slice(3, 5) === '15') {
      digitos = `549${digitos.slice(0, 3)}${digitos.slice(5)}`;
    } else if (digitos.length === 10) {
      digitos = `549${digitos}`;
    } else {
      digitos = `54${digitos}`;
    }
  }

  const clienteLimpio = extraerNombreLimpio(pedido?.cliente || 'cliente');
  const importe = parsearImporte(pedido?.importe).toLocaleString('es-AR');
  const resumen = String(pedido?.detalleTicket || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  const mensaje = [
    `Hola ${clienteLimpio}, te escribimos de *Bar Los Primos*.`,
    `Tu pedido ya fue confirmado y lo estamos preparando.`,
    resumen ? `Detalle: ${resumen}` : '',
    `Total: $${importe}.`,
    `¿Cómo vas a abonar, en efectivo o transferencia?.`
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
};

const reproducirAvisoPedido = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignorar si el navegador bloquea el audio automático
  }
};

const Cuaderno = ({ onPendientesChange = () => {} }) => {
  const [pedidos, setPedidos] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [tickBorrados, setTickBorrados] = useState(0);
  const [confirmadosIds, setConfirmadosIds] = useState(() => leerConfirmadosGuardados());
  const [desplegableAbierto, setDesplegableAbierto] = useState(false);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [confirmandoTodos, setConfirmandoTodos] = useState(false);

  const idsConocidosRef = useRef(null);

  const fetchData = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) {
      setLoading(true);
    }
    try {
      const [resPedidos, resRepartidores, resConfigs] = await Promise.all([
        api.getPedidos(),
        api.getRepartidores(),
        api.getConfig()
      ]);

      const listaPedidos = extraerArray(resPedidos, ['pedidos', 'data', 'rows']);
      const ordenados = [...listaPedidos].sort(
        (a, b) => (parseInt(b?.id, 10) || 0) - (parseInt(a?.id, 10) || 0)
      );

      const idsActuales = new Set(
        ordenados.map((p) => String(p?.id ?? '')).filter(Boolean)
      );

      if (idsConocidosRef.current !== null && silencioso) {
        const nuevos = ordenados.filter(
          (p) => p?.id != null && !idsConocidosRef.current.has(String(p.id))
        );
        if (nuevos.length > 0) {
          reproducirAvisoPedido();
        }
      }

      idsConocidosRef.current = idsActuales;
      setPedidos(ordenados);

      setRepartidores(extraerArray(resRepartidores, ['repartidores', 'data', 'rows']));
      setConfigs(extraerArray(resConfigs, ['configuracion', 'configs', 'data', 'rows']));
    } catch (err) {
      console.error('Error al sincronizar datos:', err);
    } finally {
      if (!silencioso) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData({ silencioso: false });
    const interval = setInterval(() => {
      fetchData({ silencioso: true });
    }, 10000);

    const handleFocus = () => fetchData({ silencioso: true });
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

  const pedidosPorConfirmar = useMemo(() => {
    const setConfirmados = new Set(confirmadosIds.map(String));
    return pedidos.filter(
      (p) =>
        p?.id != null &&
        !String(p?.statu || '').startsWith('ENTREGADO_') &&
        !setConfirmados.has(String(p.id)) &&
        esPedidoWeb(p)
    );
  }, [pedidos, confirmadosIds]);

  useEffect(() => {
    onPendientesChange(pedidosPorConfirmar.length);
  }, [pedidosPorConfirmar.length, onPendientesChange]);

  useEffect(() => {
    if (pedidosPorConfirmar.length === 0) {
      setDesplegableAbierto(false);
    }
  }, [pedidosPorConfirmar.length]);

  const ejecutarConfirmacionPedido = async (pedido, { mostrarAlerta = true } = {}) => {
    const idStr = String(pedido.id);
    const clienteFormateado = construirClienteConfirmado(pedido);
    const direccionExtraida = extraerDireccionPedido(pedido);
    setConfirmandoId(idStr);

    try {
      let itemsArray = [];
      if (Array.isArray(pedido.pedido)) {
        itemsArray = pedido.pedido;
      } else if (typeof pedido.detalle === 'string' && pedido.detalle.trim()) {
        try {
          const normalizado = pedido.detalle.trim().startsWith('[')
            ? pedido.detalle.trim()
            : `[${pedido.detalle.trim().replace(/\}\s*\{/g, '},{')}]`;
          const parsed = JSON.parse(normalizado);
          itemsArray = Array.isArray(parsed) ? parsed : [];
        } catch {
          itemsArray = [];
        }
      }

      const importeNumerico = parsearImporte(pedido.importe);

      await api.editPedido(pedido.id, {
        cantidad: pedido.cantidad ?? itemsArray.length,
        cliente: clienteFormateado,
        direccion: pedido.direccion || direccionExtraida || '',
        detalle: pedido.detalle ?? '',
        detalleTicket: pedido.detalleTicket ?? '',
        importe: importeNumerico,
        pedido: itemsArray,
        statu: pedido.statu ?? '0',
        pagado: pedido.pagado ?? 0,
        pj: pedido.pj ?? 0
      });

      setPedidos((prev) =>
        prev.map((item) =>
          String(item.id) === idStr
            ? {
                ...item,
                cliente: clienteFormateado,
                direccion: item.direccion || direccionExtraida || ''
              }
            : item
        )
      );

      setConfirmadosIds((prev) => {
        const siguiente = Array.from(new Set([...prev, idStr]));
        guardarConfirmados(siguiente);
        return siguiente;
      });
      return true;
    } catch (err) {
      console.error('Error al confirmar y actualizar datos del pedido:', err);
      if (mostrarAlerta) {
        alert('No se pudo actualizar los datos del pedido en el servidor.');
      }
      return false;
    } finally {
      setConfirmandoId(null);
    }
  };

  const confirmarPedidoYLimpiarNombre = async (pedido) => {
    await ejecutarConfirmacionPedido(pedido, { mostrarAlerta: true });
  };

  const confirmarTodosPendientes = async () => {
    if (confirmandoTodos || pedidosPorConfirmar.length === 0) return;
    setConfirmandoTodos(true);
    let fallos = 0;

    try {
      for (const ped of pedidosPorConfirmar) {
        const ok = await ejecutarConfirmacionPedido(ped, { mostrarAlerta: false });
        if (!ok) fallos += 1;
      }
      if (fallos > 0) {
        alert(`Se confirmaron algunos pedidos, pero ${fallos} no se pudieron actualizar.`);
      }
      setDesplegableAbierto(false);
    } finally {
      setConfirmandoTodos(false);
    }
  };

  const handleRefreshFila = useCallback(() => {
    setTickBorrados((prev) => prev + 1);
    fetchData({ silencioso: true });
  }, [fetchData]);

  const filtroNormalizado = filtro.trim().toLowerCase();
  const pedidosFiltrados = pedidos.filter((p) => {
    if (!filtroNormalizado) return true;
    const clienteMatch = String(p?.cliente ?? '').toLowerCase().includes(filtroNormalizado);
    const idMatch = String(p?.id ?? '').toLowerCase().includes(filtroNormalizado);
    return clienteMatch || idMatch;
  });

  const handleBorrarTodo = async () => {
    const confirmado = window.confirm(
      '¿Seguro que querés borrar todos los pedidos y reiniciar la caja?'
    );
    if (!confirmado) return;

    try {
      await api.deleteAllPedidos();
      limpiarPedidosBorrados();
      idsConocidosRef.current = new Set();
      setConfirmadosIds([]);
      guardarConfirmados([]);
      setDesplegableAbierto(false);
      setPedidos([]);
      setTickBorrados((prev) => prev + 1);
      alert('Caja reiniciada. Los pedidos y el registro de borrados del día han sido limpiados.');
    } catch (err) {
      console.error('Error al reiniciar el día:', err);
      alert('Hubo un error al intentar borrar los pedidos.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] bg-[#050505] text-white p-2 gap-2 overflow-hidden font-sans relative">
      <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
        {/* COLUMNA IZQUIERDA: TABLA + RESUMEN */}
        <div className="flex-[3] flex flex-col min-h-0 gap-2 h-full">
          <main className="flex-1 min-h-0 bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-inner">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a0a0a] z-20 shadow-xl border-b border-gray-800">
                  <tr className="text-[11px] font-black text-gray-500 uppercase tracking-widest bg-gray-900/60">
                    <th className="p-3 w-10">ID</th>
                    <th className="p-3">Detalle</th>
                    <th className="p-3 w-40">Cliente</th>
                    <th className="p-3 w-36 text-center">Viaje</th>
                    <th className="p-3 w-24 text-center text-orange-500">Monto</th>
                    <th className="p-3 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {loading && pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-bold uppercase text-gray-500">
                        Cargando pedidos...
                      </td>
                    </tr>
                  ) : pedidosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-bold uppercase text-gray-500">
                        No hay pedidos para mostrar.
                      </td>
                    </tr>
                  ) : (
                    pedidosFiltrados.map((p) => (
                      <FilaPedido
                        key={p.id}
                        pedido={p}
                        refreshData={handleRefreshFila}
                        repartidores={repartidores}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>

          <section className="h-[90px] shrink-0 bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex items-center px-4">
            <ResumenCaja
              pedidos={pedidos}
              onBorrarTodo={handleBorrarTodo}
              tickBorrados={tickBorrados}
            />
          </section>
        </div>

        {/* COLUMNA DERECHA: LOGÍSTICA DINÁMICA */}
        <aside className="flex-1 min-w-[300px] max-w-[330px] flex flex-col gap-2 min-h-0 h-full">
          <div className="flex flex-col p-3 bg-gradient-to-br from-gray-900/40 to-black border border-gray-800 rounded-2xl shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-500 p-1 rounded-lg">
                <LayoutDashboard size={14} className="text-black" />
              </div>
              <h1 className="text-[11px] font-black uppercase tracking-tighter">
                Panel de Control
              </h1>
            </div>
            <HeaderAdmin
              filtro={filtro}
              setFiltro={setFiltro}
              fetchPedidos={() => fetchData({ silencioso: false })}
              loading={loading}
            />
          </div>

          {/* ÁREA DE REPARTIDORES MAPEADOS */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2 py-1 opacity-50">
              <Users size={10} className="text-gray-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                Personal en Servicio
              </span>
            </div>

            {repartidores.length > 0 ? (
              repartidores.map((rep) => (
                <CardRepartidor
                  key={rep.id ?? rep.nombre}
                  nombre={rep.nombre}
                  pedidos={pedidos}
                  configs={configs}
                  refreshData={() => fetchData({ silencioso: true })}
                />
              ))
            ) : (
              <div className="p-4 text-center border border-dashed border-gray-800 rounded-2xl">
                <span className="text-[12px] font-bold text-gray-600 uppercase">
                  Sin repartidores activos
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* FLOTANTE DESPLEGABLE DE PEDIDOS POR CONFIRMAR */}
      {pedidosPorConfirmar.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 max-w-sm w-[calc(100vw-2rem)]">
          {desplegableAbierto && (
            <div className="w-full bg-[#111318] border border-orange-500/50 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-orange-600/20 border-b border-orange-500/30 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase text-orange-300">
                  Pedidos por confirmar ({pedidosPorConfirmar.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={confirmandoTodos}
                    onClick={confirmarTodosPendientes}
                    className="text-[10px] font-black uppercase bg-emerald-600/20 hover:bg-emerald-600 disabled:opacity-50 text-emerald-300 hover:text-white border border-emerald-500/40 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {confirmandoTodos ? 'Confirmando...' : 'Confirmar todos'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesplegableAbierto(false)}
                    className="p-1 rounded-lg text-gray-300 hover:bg-white/10 cursor-pointer"
                    title="Cerrar lista"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-white/10">
                {pedidosPorConfirmar.map((ped) => {
                  const esMesa = esPedidoMesa(ped);
                  const numMesa = extraerNumeroMesa(ped);
                  const waUrl = construirUrlWhatsApp(ped);
                  const nombreLimpio = extraerNombreLimpio(ped?.cliente || '');
                  const direccionPedido = extraerDireccionPedido(ped);
                  const telefonoLegible = formatearTelefonoLegible(ped);

                  return (
                    <div key={ped.id} className="p-3 space-y-2 hover:bg-white/[0.03]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-black uppercase text-white truncate">
                          <span className="text-orange-400 mr-1">#{ped.id}</span>
                          {nombreLimpio}
                        </div>
                        <span className="text-xs font-black text-orange-400 shrink-0">
                          ${parsearImporte(ped.importe).toLocaleString('es-AR')}
                        </span>
                      </div>

                      {esMesa && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                          <UtensilsCrossed size={12} />
                          <span>{numMesa ? `Mesa #${numMesa}` : 'Consumo en Mesa'}</span>
                        </div>
                      )}

                      {!esMesa && (direccionPedido || telefonoLegible) && (
                        <div className="text-[11px] text-gray-300 space-y-0.5">
                          {direccionPedido && (
                            <p className="truncate">
                              <span className="text-gray-500 font-bold uppercase mr-1">Dir:</span>
                              {direccionPedido}
                            </p>
                          )}
                          {telefonoLegible && (
                            <p className="truncate">
                              <span className="text-gray-500 font-bold uppercase mr-1">Cel:</span>
                              {telefonoLegible}
                            </p>
                          )}
                        </div>
                      )}

                      {ped.detalleTicket && (
                        <p className="text-[11px] text-gray-400 line-clamp-2">
                          {ped.detalleTicket}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {esMesa ? (
                          <span className="text-[10px] font-black uppercase text-amber-300/90">
                            Pedido en salón
                          </span>
                        ) : waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-colors"
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-bold">
                            Sin teléfono
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={confirmandoId === String(ped.id) || confirmandoTodos}
                          onClick={() => confirmarPedidoYLimpiarNombre(ped)}
                          className="inline-flex items-center gap-1 text-[11px] font-black uppercase bg-white/10 hover:bg-emerald-600 disabled:opacity-50 text-emerald-300 hover:text-white border border-white/15 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          <Check size={13} />
                          <span>{confirmandoId === String(ped.id) ? 'Guardando...' : 'Confirmado'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDesplegableAbierto((prev) => !prev)}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-2xl shadow-[0_0_24px_rgba(234,88,12,0.55)] border border-orange-300/40 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-transform active:scale-95 animate-pulse"
          >
            <BellRing size={16} className="shrink-0" />
            <span>
              {pedidosPorConfirmar.length}{' '}
              {pedidosPorConfirmar.length === 1 ? 'pedido por confirmar' : 'pedidos por confirmar'}
            </span>
            {desplegableAbierto ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};

export default Cuaderno;