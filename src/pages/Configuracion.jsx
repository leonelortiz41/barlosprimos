import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Utensils, Truck, DollarSign } from 'lucide-react';

// Importación de sub-componentes (los creamos abajo)
import SeccionCarta from '../components/Config/SeccionCarta.jsx';
import SeccionRepartidores from '../components/Config/SeccionRepartidores.jsx';
import SeccionPrecios from '../components/Config/SeccionPrecios.jsx';

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState('menu');
  const [datos, setDatos] = useState({
    productos: { milanesas: [], hamburguesas: [], lomitos: [], pizzas: [], papas: [], platos: [], empanadas: [], bebidas: [] },
    repartidores: [],
    configs: []
  });

  const cargarDatos = async () => {
    try {
      const [mila, hamb, lom, pizz, pap, plat,beb, reps, conf] = await Promise.all([
        api.getMilanesas(), api.getHamburguesas(), api.getLomitos(),
        api.getPizzas(), api.getPapas(), api.getPlatos() , api.getBebidas(),
        api.getRepartidores(),
        api.getConfig()
      ]);
      setDatos({
        productos: {
          milanesas: mila.data, hamburguesas: hamb.data, lomitos: lom.data,
          pizzas: pizz.data, papas: pap.data, platos: plat.data, bebidas: beb.data
        },
        repartidores: reps.data || [],
        configs: conf.data || []
      });
    } catch (err) { console.error("Error cargando configuración:", err); }
  };

  useEffect(() => { cargarDatos(); }, []);

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">

      {/* NAVEGACIÓN */}
      <div className="flex gap-2 mb-8 bg-gray-900/50 p-1.5 rounded-2xl border border-gray-800 w-fit mx-auto sticky top-4 z-50 backdrop-blur-md">
        <TabBtn id="menu" label="Carta" icon={<Utensils size={14} />} active={activeTab} setActive={setActiveTab} />
        <TabBtn id="repartidores" label="Repartidores" icon={<Truck size={14} />} active={activeTab} setActive={setActiveTab} />
        <TabBtn id="precios" label="Comisiones/Extras" icon={<DollarSign size={14} />} active={activeTab} setActive={setActiveTab} />
      </div>

      {/* RENDERIZADO CONDICIONAL */}
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {activeTab === 'menu' && (
          <SeccionCarta productos={datos.productos} refresh={cargarDatos} />
        )}

        {activeTab === 'repartidores' && (
          <SeccionRepartidores repartidores={datos.repartidores} refresh={cargarDatos} />
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
    onClick={() => setActive(id)}
    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] transition-all uppercase tracking-widest ${active === id ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/40' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
  >
    {icon} {label}
  </button>
);

export default Configuracion;