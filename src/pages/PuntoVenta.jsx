import React, { useState, useEffect, useContext, useRef } from 'react';
import { api } from '../services/api';
import { StockContext } from '../context/StockContext';
import { imprimirComanda } from '../services/PrintService';
import { XCircle } from 'lucide-react';

// Componentes
import ListaProductos from '../components/POS/ListaProductos';
import Tildador from '../components/POS/Tildador';
import ResumenPedido from '../components/POS/ResumenPedido';

const REGLAS_MENU = {
    milanesas: { adicionales: true, ingredientes: true },
    hamburguesas: { adicionales: true, ingredientes: true },
    lomitos: { adicionales: true, ingredientes: true },
    papas: { adicionales: true, ingredientes: false },
    pizzas: { adicionales: false, ingredientes: false },
    bebidas: { adicionales: false, ingredientes: false },
    platos: { adicionales: false, ingredientes: false },
    empanadas: { adicionales: false, ingredientes: false }
};

const PuntoVenta = () => {
    const { descontarStock } = useContext(StockContext);
    const inputBusquedaRef = useRef(null);

    // Estados
    const [productos, setProductos] = useState({});
    const [configs, setConfigs] = useState([]);
    const [cliente, setCliente] = useState("");
    const [carrito, setCarrito] = useState([]);
    const [filtro, setFiltro] = useState("");
    const [idEdicion, setIdEdicion] = useState(null);

    const [config, setConfig] = useState({
        nombre: "", precioBase: 0, clase: "",
        agregados: {},
        ingredientes: { aji: true, mayonesa: true, mostaza: true, tomate: true, lechuga: true }
    });

    // 1. CARGA INICIAL Y DETECCIÓN DE EDICIÓN
    useEffect(() => {
        const cargarTodo = async () => {
            try {
                const [mila, hamb, lom, pizz, pap, beb, pla, resConfigs] = await Promise.all([
                    api.getMilanesas(), api.getHamburguesas(), api.getLomitos(),
                    api.getPizzas(), api.getPapas(), api.getBebidas(), api.getPlatos(),
                    api.getConfig()
                ]);

                setProductos({
                    milanesas: mila.data || [],
                    hamburguesas: hamb.data || [],
                    lomitos: lom.data || [],
                    pizzas: pizz.data || [],
                    papas: pap.data || [],
                    bebidas: beb.data || [],
                    platos: pla.data || []
                });
                setConfigs(resConfigs.data || resConfigs || []);
                
                // REVISAR SI VENIMOS DE LA PANTALLA DE PEDIDOS PARA EDITAR
                const edicionGuardada = localStorage.getItem('carrito_edicion');
                if (edicionGuardada) {
                    const data = JSON.parse(edicionGuardada);
                    if (Array.isArray(data.carrito)) {
                        setIdEdicion(data.idPedido);
                        setCliente(data.cliente || "");
                        setCarrito(data.carrito);
                    }
                }
            } catch (err) { console.error("Error cargando datos", err); }
        };
        cargarTodo();
    }, []);

    const cancelarEdicion = () => {
        localStorage.removeItem('carrito_edicion');
        setIdEdicion(null);
        setCarrito([]);
        setCliente("");
        setFiltro("");
    };

    const seleccionarProducto = (p, clase) => {
        const reglas = REGLAS_MENU[clase] || { adicionales: false, ingredientes: false };
        if (!reglas.adicionales && !reglas.ingredientes) {
            setCarrito([...carrito, {
                id: Date.now(),
                hidden_nombre: p.nombre.toUpperCase(),
                hidden_precio: Math.floor(p.precio),
                hidden_clase: clase,
                cantidad: 1
            }]);
            setFiltro("");
            inputBusquedaRef.current?.focus();
            return;
        }

        let ingredientesBase = {};
        if (reglas.ingredientes) {
            const esEspecial = p.nombre.toUpperCase().includes("ESPECIAL");
            ingredientesBase = {
                aji: false, mayonesa: true, mostaza: true, tomate: true, lechuga: true,
                ...(esEspecial && { queso: true, huevo: true, jamon: true })
            };
        }
        const agregadosIniciales = {};
        if (reglas.adicionales) {
            configs.filter(c => c.tipo === 'adicion').forEach(ad => {
                agregadosIniciales[ad.atributo] = 0;
            });
        }

        setConfig({
            nombre: p.nombre, precioBase: p.precio, clase: clase,
            agregados: agregadosIniciales, ingredientes: ingredientesBase
        });
    };

    const agregarAlCarrito = () => {
        const reglas = REGLAS_MENU[config.clase] || { adicionales: false, ingredientes: false };
        let extrasTxt = [];
        if (reglas.adicionales) {
            extrasTxt = Object.entries(config.agregados)
                .filter(([_, cant]) => cant > 0)
                .map(([nom, cant]) => `${cant} ${nom.toUpperCase()}`);
        }

        const precioExtraTotal = Object.entries(config.agregados).reduce((acc, [nombre, cant]) => {
            const infoAd = configs.find(c => c.atributo === nombre && c.tipo === 'adicion');
            return acc + (cant * (infoAd ? parseFloat(infoAd.valor) : 0));
        }, 0);

        let detalleFinal = config.nombre.toUpperCase();
        if (extrasTxt.length > 0) detalleFinal += ` + ${extrasTxt.join(' / ')}`;

        if (reglas.ingredientes) {
            const sacados = Object.entries(config.ingredientes)
                .filter(([nom, activo]) => !activo && nom.toLowerCase() !== 'aji')
                .map(([nom]) => `SIN ${nom.toUpperCase()}`);
            const estadoAji = config.ingredientes.aji ? "CON AJI" : "SIN AJI";
            detalleFinal += ` (${[estadoAji, ...sacados].join(', ')})`;
        }

        setCarrito([...carrito, {
            id: Date.now(),
            hidden_nombre: detalleFinal,
            hidden_precio: Math.floor(config.precioBase) + precioExtraTotal,
            hidden_clase: config.clase,
            cantidad: 1
        }]);

        setConfig({ ...config, nombre: "" });
        setFiltro("");
    };

    const finalizarVenta = async () => {
        if (carrito.length === 0 || !cliente) return alert("FALTAN DATOS");

        try {
            // 1. Calcular Datos del Pedido (Sin Stringify para evitar el error de guardado)
            const pedidoFinal = {
                cliente: cliente.toUpperCase(),
                pedido: carrito, // Mandamos el array directo como antes
                detalle: carrito.map(i => `${i.cantidad}x ${i.hidden_nombre}`).join(', '),
                importe: carrito.reduce((acc, i) => acc + i.hidden_precio, 0),
                cantidad: carrito.length,
                statu: "0",
                pagado: 0,
                pj: 0
            };

            if (idEdicion) {
                // MODO EDICIÓN
                await api.editPedido(idEdicion, pedidoFinal);
                localStorage.removeItem('carrito_edicion');
                setIdEdicion(null);
            } else {
                // MODO NUEVO: Lógica de ID para Ticket
                const res = await api.getPedidos();
                const listaPedidos = res.data || res;
                let proximoId = 1;
                if (listaPedidos && listaPedidos.length > 0) {
                    const maxId = Math.max(...listaPedidos.map(p => parseInt(p.id)));
                    proximoId = maxId + 1;
                }

                await api.postPedido(pedidoFinal);
                imprimirComanda({ ...pedidoFinal, id: proximoId });
            }

            // 2. Descontar Stock
            descontarStock({
                sumaPanSan: carrito.filter(i => ['milanesas', 'hamburguesas', 'lomitos'].includes(i.hidden_clase)).length,
                sumapPapas: carrito.filter(i => i.hidden_nombre.includes('PAPAS')).length
            });

            // 3. Limpiar Interfaz
            setCarrito([]);
            setCliente("");
            setFiltro("");
            setTimeout(() => inputBusquedaRef.current?.focus(), 50);

        } catch (err) {
            console.error("Error en finalizarVenta:", err);
            alert("ERROR AL PROCESAR OPERACIÓN");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] p-4 bg-black overflow-hidden font-sans">
            
            {idEdicion && (
                <div className="flex items-center justify-between bg-blue-600/20 border border-blue-500/30 px-4 py-2 mb-3 rounded-xl">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        MODO EDICIÓN: Pedido #{idEdicion}
                    </span>
                    <button 
                        onClick={cancelarEdicion}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black transition-all"
                    >
                        <XCircle size={14} /> CANCELAR EDICIÓN
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 h-full overflow-hidden">
                <div className="flex-1 h-full overflow-hidden">
                    <ListaProductos
                        productos={productos}
                        filtro={filtro}
                        setFiltro={setFiltro}
                        onSeleccionar={seleccionarProducto}
                        inputRef={inputBusquedaRef}
                    />
                </div>

                <div className="w-full md:w-[400px] h-full relative">
                    {config.nombre ? (
                        <Tildador
                            config={config}
                            setConfig={setConfig}
                            onAgregar={agregarAlCarrito}
                            adicionalesDB={configs.filter(c => c.tipo === 'adicion')}
                        />
                    ) : (
                        <ResumenPedido
                            cliente={cliente} setCliente={setCliente}
                            carrito={carrito} setCarrito={setCarrito}
                            onConfirmar={finalizarVenta}
                            esEdicion={!!idEdicion}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PuntoVenta;