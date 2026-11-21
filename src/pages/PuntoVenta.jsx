import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
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

const INGREDIENTES_BASE_POR_DEFECTO = {
    aji: false,
    mayonesa: true,
    mostaza: true,
    tomate: true,
    lechuga: true
};

const generarIdItem = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const extraerIdObjeto = (obj) => {
    if (!obj || typeof obj !== 'object') return undefined;
    return (
        obj.id ??
        obj.id_pedido ??
        obj.idPedido ??
        obj.nro ??
        obj.numero ??
        obj.codigo ??
        obj.insertId
    );
};

const extraerListaPedidos = (resPedidos) => {
    const body = resPedidos?.data ?? resPedidos;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.pedidos)) return body.pedidos;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.rows)) return body.rows;
    return [];
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
    const [procesando, setProcesando] = useState(false);

    const [config, setConfig] = useState({
        nombre: "",
        precioBase: 0,
        clase: "",
        agregados: {},
        ingredientes: { ...INGREDIENTES_BASE_POR_DEFECTO }
    });

    const adicionalesDB = useMemo(
        () => configs.filter((c) => c.tipo === 'adicion'),
        [configs]
    );

    // 1. CARGA INICIAL Y DETECCIÓN DE EDICIÓN
    useEffect(() => {
        const cargarTodo = async () => {
            try {
                const [mila, hamb, lom, pizz, pap, beb, pla, resConfigs] = await Promise.all([
                    api.getMilanesas(),
                    api.getHamburguesas(),
                    api.getLomitos(),
                    api.getPizzas(),
                    api.getPapas(),
                    api.getBebidas(),
                    api.getPlatos(),
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
                        const carritoNormalizado = data.carrito.map((item) => {
                            const cant = item.cantidad || 1;
                            const subtotal = Number(item.hidden_precio) || 0;
                            return {
                                ...item,
                                id: item.id || generarIdItem(),
                                cantidad: cant,
                                precioUnitario:
                                    typeof item.precioUnitario === 'number'
                                        ? item.precioUnitario
                                        : subtotal / cant,
                                hidden_precio: Math.round(subtotal)
                            };
                        });

                        setIdEdicion(data.idPedido);
                        setCliente(data.cliente || "");
                        setCarrito(carritoNormalizado);
                    }
                }
            } catch (err) {
                console.error("Error cargando datos", err);
            }
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
        const precioUnitario = Math.floor(Number(p.precio) || 0);

        if (!reglas.adicionales && !reglas.ingredientes) {
            setCarrito((prev) => [
                ...prev,
                {
                    id: generarIdItem(),
                    hidden_nombre: p.nombre.toUpperCase(),
                    precioUnitario,
                    hidden_precio: precioUnitario,
                    hidden_clase: clase,
                    cantidad: 1
                }
            ]);
            setFiltro("");
            inputBusquedaRef.current?.focus();
            return;
        }

        let ingredientesBase = {};
        if (reglas.ingredientes) {
            const esEspecial = p.nombre.toUpperCase().includes("ESPECIAL");
            ingredientesBase = {
                ...INGREDIENTES_BASE_POR_DEFECTO,
                ...(esEspecial && { queso: true, huevo: true, jamon: true })
            };
        }

        const agregadosIniciales = {};
        if (reglas.adicionales) {
            adicionalesDB.forEach((ad) => {
                agregadosIniciales[ad.atributo] = 0;
            });
        }

        setConfig({
            nombre: p.nombre,
            precioBase: p.precio,
            clase,
            agregados: agregadosIniciales,
            ingredientes: ingredientesBase
        });
    };

    const agregarAlCarrito = () => {
        const reglas = REGLAS_MENU[config.clase] || { adicionales: false, ingredientes: false };
        let extrasTxt = [];
        if (reglas.adicionales) {
            extrasTxt = Object.entries(config.agregados)
                .filter(([, cant]) => cant > 0)
                .map(([nom, cant]) => `${cant} ${nom.toUpperCase()}`);
        }

        const precioExtraTotal = Object.entries(config.agregados).reduce((acc, [nombre, cant]) => {
            const infoAd = adicionalesDB.find((c) => c.atributo === nombre);
            return acc + cant * (infoAd ? parseFloat(infoAd.valor) || 0 : 0);
        }, 0);

        let detalleFinal = config.nombre.toUpperCase();
        if (extrasTxt.length > 0) {
            detalleFinal += ` + ${extrasTxt.join(' / ')}`;
        }

        if (reglas.ingredientes) {
            const sacados = Object.entries(config.ingredientes)
                .filter(([nom, activo]) => !activo && nom.toLowerCase() !== 'aji')
                .map(([nom]) => `SIN ${nom.toUpperCase()}`);
            const estadoAji = config.ingredientes.aji ? "CON AJI" : "SIN AJI";
            detalleFinal += ` (${[estadoAji, ...sacados].join(', ')})`;
        }

        const precioUnitario = Math.floor(Number(config.precioBase) || 0) + precioExtraTotal;

        setCarrito((prev) => [
            ...prev,
            {
                id: generarIdItem(),
                hidden_nombre: detalleFinal,
                precioUnitario,
                hidden_precio: Math.round(precioUnitario),
                hidden_clase: config.clase,
                cantidad: 1
            }
        ]);

        setConfig((prev) => ({ ...prev, nombre: "" }));
        setFiltro("");
    };

    const finalizarVenta = async () => {
        const clienteLimpio = cliente.trim().toUpperCase();
        if (carrito.length === 0 || !clienteLimpio || procesando) {
            return alert("FALTAN DATOS");
        }

        setProcesando(true);
        try {
            const importeTotal = carrito.reduce(
                (acc, i) => acc + Math.round(Number(i.hidden_precio) || 0),
                0
            );
            const cantidadTotal = carrito.reduce(
                (acc, i) => acc + (i.cantidad || 1),
                0
            );

            const pedidoFinal = {
                cliente: clienteLimpio,
                pedido: carrito,
                detalle: carrito
                    .map((i) => `${i.cantidad || 1}x ${i.hidden_nombre}`)
                    .join(', '),
                importe: importeTotal,
                cantidad: cantidadTotal,
                statu: "0",
                pagado: 0,
                pj: 0
            };

            if (idEdicion) {
                await api.editPedido(idEdicion, pedidoFinal);
                localStorage.removeItem('carrito_edicion');
                setIdEdicion(null);
            } else {
                const respuesta = await api.postPedido(pedidoFinal);

                let idGenerado =
                    extraerIdObjeto(respuesta?.data) ??
                    extraerIdObjeto(respuesta?.data?.data) ??
                    extraerIdObjeto(respuesta?.data?.pedido) ??
                    extraerIdObjeto(respuesta);

                if (idGenerado === undefined || idGenerado === null || String(idGenerado).trim() === "") {
                    const resPedidos = await api.getPedidos();
                    const listaPedidos = extraerListaPedidos(resPedidos);

                    if (listaPedidos.length > 0) {
                        const idsNumericos = listaPedidos
                            .map((p) => parseInt(extraerIdObjeto(p), 10))
                            .filter((n) => !Number.isNaN(n) && n > 0);

                        if (idsNumericos.length > 0) {
                            idGenerado = Math.max(...idsNumericos);
                        } else {
                            const ultimoPedido = listaPedidos[listaPedidos.length - 1];
                            idGenerado = extraerIdObjeto(ultimoPedido) ?? listaPedidos.length;
                        }
                    }
                }

                imprimirComanda({ ...pedidoFinal, id: idGenerado ?? "S/N" });

                const sumaPanSan = carrito
                    .filter((i) =>
                        ['milanesas', 'hamburguesas', 'lomitos'].includes(i.hidden_clase)
                    )
                    .reduce((acc, i) => acc + (i.cantidad || 1), 0);

                const sumapPapas = carrito
                    .filter((i) => i.hidden_nombre?.includes('PAPAS'))
                    .reduce((acc, i) => acc + (i.cantidad || 1), 0);

                descontarStock({ sumaPanSan, sumapPapas });
            }

            setCarrito([]);
            setCliente("");
            setFiltro("");
            setTimeout(() => inputBusquedaRef.current?.focus(), 50);
        } catch (err) {
            console.error("Error en finalizarVenta:", err);
            alert("ERROR AL PROCESAR OPERACIÓN");
        } finally {
            setProcesando(false);
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
                        type="button"
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
                            adicionalesDB={adicionalesDB}
                        />
                    ) : (
                        <ResumenPedido
                            cliente={cliente}
                            setCliente={setCliente}
                            carrito={carrito}
                            setCarrito={setCarrito}
                            onConfirmar={finalizarVenta}
                            esEdicion={!!idEdicion}
                            procesando={procesando}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PuntoVenta;