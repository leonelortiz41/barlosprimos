const STORAGE_KEY = 'historial_pedidos_borrados';

export const obtenerPedidosBorrados = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    console.error('Error al leer pedidos borrados:', e);
    return [];
  }
};

export const registrarPedidoBorrado = (pedido, detalleTexto, motivo = '') => {
  try {
    const actuales = obtenerPedidosBorrados();
    const registro = {
      uid: `${pedido?.id ?? 'sin-id'}-${Date.now()}`,
      id: pedido?.id ?? 'S/N',
      cliente: String(pedido?.cliente || 'SIN NOMBRE').toUpperCase(),
      detalle: detalleTexto || pedido?.detalle || 'Sin detalle',
      importe: parseFloat(pedido?.importe) || 0,
      statu: pedido?.statu || '0',
      pagado: pedido?.pagado || 0,
      motivo: String(motivo || '').trim() || 'Sin motivo especificado',
      fechaHora: new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([registro, ...actuales]));
    return registro;
  } catch (e) {
    console.error('Error al guardar pedido borrado:', e);
    return null;
  }
};

export const limpiarPedidosBorrados = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error al limpiar pedidos borrados:', e);
  }
};