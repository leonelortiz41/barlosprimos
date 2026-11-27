import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { Utensils, Truck, DollarSign } from 'lucide-react';

import SeccionCarta from '../components/Config/SeccionCarta.jsx';
import SeccionRepartidores from '../components/Config/SeccionRepartidores.jsx';
import SeccionPrecios from '../components/Config/SeccionPrecios.jsx';

const PRODUCTOS_INICIALES = {
  milanesas: [],
  hamburguesas: [],
  lomitos: [],
  pizzas: [],
  empanadas: [],
  papas: [],
  platos: [],
  bebidas: []
};

const extraerLista = (resultado) => {
  if (resultado.status !== 'fulfilled') return [];
  const raw = resultado.value?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState('menu');
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState({
    productos: PRODUCTOS_INICIALES,
    repartidores: [],
    configs: []
  });

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [mila, hamb, lom, pizz, emp, pap, plat, beb, reps, conf] =
        await Promise.allSettled([
          api.getMilanesas(),
          api.getHamburguesas(),
          api.getLomitos(),
          api.getPizzas(),
          api.getEmpanadas(),
          api.getPapas(),
          api.getPlatos(),
          api.getBebidas(),
          api.getRepartidores(),
          api.getConfig()
        ]);

      setDatos({
        productos: {
          milanesas: extraerLista(mila),
          hamburguesas: extraerLista(hamb),
          lomitos: extraerLista(lom),
          pizzas: extraerLista(pizz),
          empanadas: extraerLista(emp),
          papas: extraerLista(pap),
          platos: extraerLista(plat),
          bebidas: extraerLista(beb)
        },
        repartidores: extraerLista(reps),
        configs: extraerLista(conf)
      });
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      {/* NAVEGACIÓN */}
      <div className="flex gap-2 mb-8 bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800 w-fit mx-auto sticky top-4 z-50 backdrop-blur-md">
        <TabBtn
          id="menu"
          label="Carta"
          icon={<Utensils size={14} />}
          active={activeTab}
          setActive={setActiveTab}
        />
        <TabBtn
          id="repartidores"
          label="Repartidores"
          icon={<Truck size={14} />}
          active={activeTab}
          setActive={setActiveTab}
        />
        <TabBtn
          id="precios"
          label="Comisiones/Extras"
          icon={<DollarSign size={14} />}
          active={activeTab}
          setActive={setActiveTab}
        />
      </div>

      {/* RENDERIZADO CONDICIONAL */}
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {activeTab === 'menu' && (
          <>
            {cargando && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 text-center">
                Actualizando carta...
              </p>
            )}
            <SeccionCarta
              productos={datos.productos}
              cargando={cargando}
              refresh={cargarDatos}
            />
          </>
        )}

        {activeTab === 'repartidores' && (
          <SeccionRepartidores
            repartidores={datos.repartidores}
            refresh={cargarDatos}
          />
        )}

        {activeTab === 'precios' && (
          <SeccionPrecios configs={datos.configs} refresh={cargarDatos} />
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ id, label, icon, active, setActive }) => (
  <button
    type="button"
    onClick={() => setActive(id)}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest cursor-pointer ${
      active === id
        ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/40'
        : 'text-gray-500 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon} {label}
  </button>
);

export default Configuracion;