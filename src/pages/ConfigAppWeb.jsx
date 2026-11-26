import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Globe, Bike, Save, Search, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'bar_los_primos_config_web_v1';
const MENSAJE_DEFECTO = 'Estamos cerrados por el momento. Volvé a intentar más tarde.';

const CATEGORIAS = [
  'hamburguesas',
  'milanesas',
  'lomitos',
  'pizzas',
  'empanadas',
  'papas',
  'platos',
  'bebidas'
];

const leerCacheLocal = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const guardarCacheLocal = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar si el almacenamiento está restringido
  }
};

const crearFirmaEstado = ({ tiendaAbierta, envioActivo, mensajeCierre, idsSet }) =>
  JSON.stringify({
    tiendaAbierta: Boolean(tiendaAbierta),
    envioActivo: Boolean(envioActivo),
    retiroActivo: true,
    mensajeCierre: String(mensajeCierre ?? '').trim(),
    idsPausadosWeb: Array.from(idsSet || []).sort()
  });

const ConfigAppWeb = ({ onEstadoWebChange }) => {
  const cacheInicial = leerCacheLocal();
  const pausaInicial = Array.isArray(cacheInicial?.idsPausadosWeb)
    ? cacheInicial.idsPausadosWeb
    : [];

  const [tiendaAbierta, setTiendaAbierta] = useState(
    typeof cacheInicial?.tiendaAbierta === 'boolean' ? cacheInicial.tiendaAbierta : true
  );
  const [envioActivo, setEnvioActivo] = useState(
    typeof cacheInicial?.envioActivo === 'boolean' ? cacheInicial.envioActivo : true
  );
  const retiroActivo = true;

  const [mensajeCierre, setMensajeCierre] = useState(
    cacheInicial?.mensajeCierre || MENSAJE_DEFECTO
  );
  const [productos, setProductos] = useState([]);
  const [idsPausadosWeb, setIdsPausadosWeb] = useState(() => new Set(pausaInicial));
  const [firmaGuardada, setFirmaGuardada] = useState(() =>
    crearFirmaEstado({
      tiendaAbierta:
        typeof cacheInicial?.tiendaAbierta === 'boolean' ? cacheInicial.tiendaAbierta : true,
      envioActivo:
        typeof cacheInicial?.envioActivo === 'boolean' ? cacheInicial.envioActivo : true,
      mensajeCierre: cacheInicial?.mensajeCierre || MENSAJE_DEFECTO,
      idsSet: pausaInicial
    })
  );

  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargandoMenu, setCargandoMenu] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');

  const firmaActual = useMemo(
    () =>
      crearFirmaEstado({
        tiendaAbierta,
        envioActivo,
        mensajeCierre,
        idsSet: idsPausadosWeb
      }),
    [tiendaAbierta, envioActivo, mensajeCierre, idsPausadosWeb]
  );

  const hayCambiosSinGuardar = firmaActual !== firmaGuardada;

  useEffect(() => {
    let activa = true;

    const cargarDatos = async () => {
      setCargandoMenu(true);
      try {
        const resCfg = await fetch(`${API_URL}/configuracion-web`);
        if (resCfg.ok && activa) {
          const cfg = await resCfg.json();
          const abiertaSrv =
            typeof cfg.tiendaAbierta === 'boolean' ? cfg.tiendaAbierta : tiendaAbierta;
          const envioSrv =
            typeof cfg.envioActivo === 'boolean' ? cfg.envioActivo : envioActivo;
          const mensajeSrv = cfg.mensajeCierre ?? mensajeCierre;
          const pausadosSrv = Array.isArray(cfg.idsPausadosWeb)
            ? cfg.idsPausadosWeb
            : Array.from(idsPausadosWeb);

          setTiendaAbierta(abiertaSrv);
          setEnvioActivo(envioSrv);
          setMensajeCierre(mensajeSrv);
          setIdsPausadosWeb(new Set(pausadosSrv));

          const normalizada = {
            ...cfg,
            tiendaAbierta: abiertaSrv,
            envioActivo: envioSrv,
            retiroActivo: true,
            mensajeCierre: mensajeSrv,
            idsPausadosWeb: pausadosSrv
          };

          guardarCacheLocal(normalizada);
          setFirmaGuardada(
            crearFirmaEstado({
              tiendaAbierta: abiertaSrv,
              envioActivo: envioSrv,
              mensajeCierre: mensajeSrv,
              idsSet: pausadosSrv
            })
          );
        }
      } catch {
        // Usa el estado inicial o la caché local si el endpoint no existe
      }

      const resultados = await Promise.allSettled(
        CATEGORIAS.map(async (clase) => {
          const res = await fetch(`${API_URL}/${clase}`);
          if (!res.ok) return [];
          const data = await res.json();
          const lista = Array.isArray(data) ? data : data?.data || [];
          return lista.map((item) => ({
            ...item,
            id: item.id,
            nombre: item.nombre,
            precio: Number(item.precio) || 0,
            clase
          }));
        })
      );

      if (!activa) return;
      const todos = resultados
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value);
      setProductos(todos);
      setCargandoMenu(false);
    };

    cargarDatos();
    return () => {
      activa = false;
    };
  }, []);

  const claveProducto = useCallback((p) => `${p.clase}-${p.id}`, []);

  const toggleDisponibilidadProducto = (prod) => {
    const clave = claveProducto(prod);
    setAviso('');
    setIdsPausadosWeb((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(clave)) {
        siguiente.delete(clave);
      } else {
        siguiente.add(clave);
      }
      return siguiente;
    });
  };

  const habilitarTodosLosProductos = () => {
    setAviso('');
    setIdsPausadosWeb(new Set());
  };

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const okCat = filtroCategoria === 'todas' || p.clase === filtroCategoria;
      const okBusq = !q || String(p.nombre || '').toLowerCase().includes(q);
      return okCat && okBusq;
    });
  }, [productos, filtroCategoria, busqueda]);

  const guardarConfiguracionWeb = async () => {
    if (!hayCambiosSinGuardar || guardando) return;
    setGuardando(true);
    setAviso('');

    const mensajeLimpio = mensajeCierre.trim();
    const listaPausados = Array.from(idsPausadosWeb);

    const payload = {
      tiendaAbierta,
      envioActivo,
      retiroActivo,
      mensajeCierre: mensajeLimpio,
      idsPausadosWeb: listaPausados
    };

    guardarCacheLocal(payload);

    try {
      const res = await fetch(`${API_URL}/configuracion-web`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al guardar');

      setFirmaGuardada(
        crearFirmaEstado({
          tiendaAbierta,
          envioActivo,
          mensajeCierre: mensajeLimpio,
          idsSet: listaPausados
        })
      );
      onEstadoWebChange?.(tiendaAbierta);
      setAviso('Configuración de la app de clientes guardada.');
    } catch {
      setFirmaGuardada(
        crearFirmaEstado({
          tiendaAbierta,
          envioActivo,
          mensajeCierre: mensajeLimpio,
          idsSet: listaPausados
        })
      );
      onEstadoWebChange?.(tiendaAbierta);
      setAviso('Guardado en este equipo (sin conexión o endpoint PUT /configuracion-web pendiente).');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
            <Globe size={13} /> Canal Online
          </span>
          <h2 className="text-xl font-black uppercase mt-0.5">
            Configuración App de Clientes
          </h2>
          <p className="text-xs text-gray-400">
            Controlá apertura de la tienda web, envíos a domicilio y comidas disponibles.
          </p>
        </div>

        <button
          type="button"
          onClick={guardarConfiguracionWeb}
          disabled={!hayCambiosSinGuardar || guardando}
          className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shrink-0 ${
            hayCambiosSinGuardar && !guardando
              ? 'bg-orange-500 hover:bg-orange-400 text-black ring-2 ring-amber-300/80 shadow-[0_0_24px_rgba(249,115,22,0.75)] animate-pulse scale-[1.02] cursor-pointer'
              : 'bg-white/[0.06] text-gray-500 border border-white/10 opacity-65 cursor-not-allowed'
          }`}
        >
          <Save size={16} />
          <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
          {hayCambiosSinGuardar && !guardando && (
            <span className="w-2 h-2 rounded-full bg-black animate-ping" />
          )}
        </button>
      </div>

      {aviso && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{aviso}</span>
        </div>
      )}

      {/* Interruptores principales de la tienda web */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            setAviso('');
            setTiendaAbierta((v) => !v);
          }}
          className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
            tiendaAbierta
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-red-500/10 border-red-500/40'
          }`}
        >
          <div className="text-[11px] font-black uppercase text-gray-400">
            Estado de la App Web
          </div>
          <div
            className={`text-base font-black uppercase mt-1 ${
              tiendaAbierta ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {tiendaAbierta ? 'Abierta (Recibiendo pedidos)' : 'Cerrada / Pausada'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setAviso('');
            setEnvioActivo((v) => !v);
          }}
          className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
            envioActivo
              ? 'bg-[#111318] border-orange-500/40 text-white'
              : 'bg-[#111318] border-white/10 text-gray-500'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase">
            <Bike size={16} className="text-orange-400" />
            <span>Envío a domicilio</span>
          </div>
          <div className="text-xs font-bold mt-1">
            {envioActivo ? 'Habilitado en la web' : 'Deshabilitado'}
          </div>
        </button>
      </div>

      {/* Mensaje cuando la tienda web está cerrada o pausada */}
      <div className="bg-[#111318] border border-white/10 rounded-2xl p-4">
        <label className="block text-xs font-black uppercase text-gray-400 mb-1.5 flex items-center gap-1.5">
          <AlertCircle size={14} className="text-orange-400" />
          Mensaje mostrado al cliente cuando la web está cerrada o pausada
        </label>
        <input
          type="text"
          value={mensajeCierre}
          onChange={(e) => {
            setAviso('');
            setMensajeCierre(e.target.value);
          }}
          maxLength={180}
          className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500"
        />
      </div>

      {/* Disponibilidad de comidas para la app de clientes */}
      <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase text-white">
              Comidas disponibles en la App Web ({idsPausadosWeb.size} pausadas)
            </h3>
            <p className="text-xs text-gray-400">
              Tocá un producto para pausarlo o habilitarlo en la tienda online.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {idsPausadosWeb.size > 0 && (
              <button
                type="button"
                onClick={habilitarTodosLosProductos}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] font-black uppercase text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw size={13} className="text-orange-400" /> Habilitar todos
              </button>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar comida..."
                className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFiltroCategoria('todas')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase cursor-pointer ${
              filtroCategoria === 'todas'
                ? 'bg-orange-600 text-white'
                : 'bg-black/50 text-gray-400 border border-white/10'
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltroCategoria(cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase cursor-pointer ${
                filtroCategoria === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-black/50 text-gray-400 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {cargandoMenu ? (
          <div className="py-8 text-center text-xs font-bold uppercase text-gray-400">
            Cargando comidas del menú...
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold uppercase text-gray-500">
            No hay comidas que coincidan con el filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {productosFiltrados.map((prod) => {
              const pausado = idsPausadosWeb.has(claveProducto(prod));
              return (
                <button
                  key={claveProducto(prod)}
                  type="button"
                  onClick={() => toggleDisponibilidadProducto(prod)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    pausado
                      ? 'bg-red-500/10 border-red-500/30 text-gray-400'
                      : 'bg-black/40 border-white/10 hover:border-orange-500/40 text-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase text-orange-400">
                      {prod.clase}
                    </div>
                    <div className="text-xs font-black uppercase truncate">
                      {prod.nombre}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${
                      pausado
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {pausado ? 'Pausado' : 'Disponible'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigAppWeb;