import axios from 'axios';

const rawUrl = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_URL = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 6000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getImagenUrl = (ruta) => {
  if (!ruta || typeof ruta !== 'string') return '';
  const limpia = ruta.trim();
  if (!limpia) return '';
  if (/^(https?:\/\/|data:image\/)/i.test(limpia)) return limpia;
  const normalizada = limpia.startsWith('/') ? limpia : `/${limpia}`;
  return `${API_URL}${normalizada}`;
};

export const api = {
  // --- OBTENER PRODUCTOS (GET) ---
  getMilanesas: () => apiClient.get('/milanesas'),
  getHamburguesas: () => apiClient.get('/hamburguesas'),
  getLomitos: () => apiClient.get('/lomitos'),
  getPizzas: () => apiClient.get('/pizzas'),
  getEmpanadas: () => apiClient.get('/empanadas'),
  getPapas: () => apiClient.get('/papas'),
  getPlatos: () => apiClient.get('/platos'),
  getBebidas: () => apiClient.get('/bebidas'),

  // --- GESTIÓN DE PEDIDOS ---
  getPedidos: () => apiClient.get('/pedidos'),
  postPedido: (data) => apiClient.post('/pedidos', data),
  editPedido: (id, data) => apiClient.put(`/pedidos/${id}`, data),

  // --- ACTUALIZACIONES INDIVIDUALES ---
  updateStatu: (id, statu) => apiClient.put(`/statu/${id}`, { statu }),
  updatePagado: (id, pagado) => apiClient.put(`/pagado/${id}`, { pagado }),
  updatePJ: (id, pj) => apiClient.put(`/pj/${id}`, { pj }),

  // --- FUNCIÓN UNIFICADA (Para CardRepartidor y Cuaderno) ---
  updatePedido: async (id, campos) => {
    const promesas = [];
    if (Object.prototype.hasOwnProperty.call(campos, 'statu')) {
      promesas.push(apiClient.put(`/statu/${id}`, { statu: campos.statu }));
    }
    if (Object.prototype.hasOwnProperty.call(campos, 'pagado')) {
      promesas.push(apiClient.put(`/pagado/${id}`, { pagado: campos.pagado }));
    }
    if (Object.prototype.hasOwnProperty.call(campos, 'pj')) {
      promesas.push(apiClient.put(`/pj/${id}`, { pj: campos.pj }));
    }
    return Promise.all(promesas);
  },

  deletePedido: (id) => apiClient.delete(`/pedidos/${id}`),
  deleteAllPedidos: () => apiClient.delete('/pedidos'),

  // --- GESTIÓN DE FECHA ---
  getDate: () => apiClient.get('/date'),
  postDate: (fecha) => apiClient.post('/date', { fecha }),
  deleteDate: () => apiClient.delete('/date'),

  // --- GESTIÓN DE CARTA (PRECIOS, FOTOS, ALTAS Y BAJAS) ---
  updatePrecio: (categoria, id, nuevoPrecio) =>
    apiClient.put(`/${categoria}/${id}`, { precio: nuevoPrecio }),

  updateProducto: (categoria, id, data) =>
    apiClient.put(`/${categoria}/${id}`, data, { timeout: 20000 }),

  addProducto: (categoria, data) =>
    apiClient.post(`/${categoria}`, data, { timeout: 20000 }),

  deleteProducto: (categoria, id) =>
    apiClient.delete(`/${categoria}/${id}`),

  // --- GESTIÓN DE REPARTIDORES ---
  getRepartidores: () => apiClient.get('/repartidores'),

  addRepartidor: (data) =>
    apiClient.post('/repartidores', data),

  deleteRepartidor: (id) =>
    apiClient.delete(`/repartidores/${id}`),

  updateRepartidor: (id, nombre) =>
    apiClient.put(`/repartidores/${id}`, { nombre }),

  // --- CONFIGURACIÓN GENERAL (COMISIONES Y EXTRAS) ---
  getConfig: () => apiClient.get('/configuracion'),

  updateConfig: (data) =>
    apiClient.post('/configuracion', data),

  deleteConfig: (id) =>
    apiClient.delete(`/configuracion/${id}`),

  // --- CONFIGURACIÓN APP DE CLIENTES ---
  getConfigWeb: () => apiClient.get('/configuracion-web'),

  updateConfigWeb: (data) =>
    apiClient.put('/configuracion-web', data),

  /**
   * Envía el reporte de cierre de caja por email
   * @param {Object} data - Contiene { pdfBase64, fecha }
   */
  enviarReporteEmail: async (data) => {
    try {
      const response = await apiClient.post('/enviar-reporte', data, { timeout: 20000 });
      return response.data;
    } catch (error) {
      console.error('Error en la API al enviar el mail:', error);
      throw error;
    }
  },
};

export { API_URL };
export default api;