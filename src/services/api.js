import axios from 'axios';

// La URL apunta a tu servidor local
const API_URL = 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // --- OBTENER PRODUCTOS (GET) ---
  getMilanesas: () => apiClient.get('/milanesas'),
  getHamburguesas: () => apiClient.get('/hamburguesas'),
  getLomitos: () => apiClient.get('/lomitos'),
  getPizzas: () => apiClient.get('/pizzas'),
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
    if (campos.hasOwnProperty('statu')) {
      promesas.push(apiClient.put(`/statu/${id}`, { statu: campos.statu }));
    }
    if (campos.hasOwnProperty('pagado')) {
      promesas.push(apiClient.put(`/pagado/${id}`, { pagado: campos.pagado }));
    }
    if (campos.hasOwnProperty('pj')) {
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

  // --- GESTIÓN DE CARTA (PRECIOS, ALTAS Y BAJAS) ---
  updatePrecio: (categoria, id, nuevoPrecio) =>
    apiClient.put(`/${categoria}/${id}`, { precio: nuevoPrecio }),

  addProducto: (categoria, data) =>
    apiClient.post(`/${categoria}`, data),

  deleteProducto: (categoria, id) =>
    apiClient.delete(`/${categoria}/${id}`),

  // --- NUEVO: GESTIÓN DE REPARTIDORES ---
  getRepartidores: () => apiClient.get('/repartidores'),

  addRepartidor: (data) =>
    apiClient.post('/repartidores', data), // data: { nombre: 'JUAN' }

  deleteRepartidor: (id) =>
    apiClient.delete(`/repartidores/${id}`),
  // Agrega esto en tu objeto api dentro de api.js
  updateRepartidor: (id, nombre) => apiClient.put(`/repartidores/${id}`, { nombre }),

  // --- CONFIGURACIÓN (COMISIONES Y EXTRAS) ---
  // Obtiene todos los ajustes (id, atributo, valor, tipo)
  getConfig: () => apiClient.get('/configuracion'),

  // Agrega o actualiza una configuración
  // data: { atributo: 'COMISION', valor: '500', tipo: 'adicion' }
  updateConfig: (data) =>
    apiClient.post('/configuracion', data),

  // Elimina una configuración específica
  deleteConfig: (id) =>
    apiClient.delete(`/configuracion/${id}`),

  /**
   * Envía el reporte de cierre de caja por email
   * @param {Object} data - Contiene { pdfBase64, fecha }
   */
  enviarReporteEmail: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/enviar-reporte`, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error en la API al enviar el mail:", error);
      throw error;
    }
  },
};

export default api;