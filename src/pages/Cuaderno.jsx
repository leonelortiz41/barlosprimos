import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import FilaPedido from '../components/Admin/FilaPedido';
import CardRepartidor from '../components/Admin/CardRepartidor';
import ResumenCaja from '../components/Admin/ResumenCaja';
import HeaderAdmin from '../components/Admin/HeaderAdmin';
import { LayoutDashboard, Users } from 'lucide-react';

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

const Cuaderno = () => {
  const [pedidos, setPedidos] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  // --- CARGA INTEGRAL DE DATOS ---
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
    }, 30000);
    return () => clearInterval(interval);
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
      setPedidos([]);
      alert('Caja reiniciada. Los pedidos han sido archivados/borrados.');
    } catch (err) {
      console.error('Error al reiniciar el día:', err);
      alert('Hubo un error al intentar borrar los pedidos.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] bg-[#050505] text-white p-2 gap-2 overflow-hidden font-sans">
      <div className="flex flex-1 gap-2 min-h-0 overflow-hidden">
        {/* COLUMNA IZQUIERDA: TABLA + RESUMEN */}
        <div className="flex-[3] flex flex-col min-h-0 gap-2 h-full">
          <main className="flex-1 min-h-0 bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-inner">
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0a0a0a] z-20 shadow-xl border-b border-gray-800">
                  <tr className="text-[11px] font-black text-gray-500 uppercase tracking-widest bg-gray-900/60">
                    <th className="p-3 w-14">ID</th>
                    <th className="p-3">Detalle</th>
                    <th className="p-3 w-40">Cliente</th>
                    <th className="p-3 w-32 text-center">Viaje</th>
                    <th className="p-3 w-24 text-center text-orange-500">Monto</th>
                    <th className="p-3 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {pedidosFiltrados.map((p) => (
                    <FilaPedido
                      key={p.id}
                      pedido={p}
                      refreshData={() => fetchData({ silencioso: true })}
                      repartidores={repartidores}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </main>

          <section className="h-[90px] shrink-0 bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex items-center px-4">
            <ResumenCaja
              pedidos={pedidos}
              onBorrarTodo={handleBorrarTodo}
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
    </div>
  );
};

export default Cuaderno;