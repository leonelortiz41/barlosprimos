export const imprimirComanda = (pedidoData, tipo = 'COCINA') => {
  const ventanaImpresion = window.open('', '_blank');
  const esCliente = tipo === 'CLIENTE';

  let itemsArray = [];
  try {
    if (pedidoData.pedido && Array.isArray(pedidoData.pedido)) {
      itemsArray = pedidoData.pedido;
    } else if (pedidoData.detalle) {
      const rawDetalle = pedidoData.detalle.trim();
      const jsonValid = rawDetalle.startsWith('[') ? rawDetalle : `[${rawDetalle}]`;
      itemsArray = JSON.parse(jsonValid);
    }
  } catch (e) { console.error(e); }

  // --- CORRECCIÓN: El importe ya es el total acumulado del pedido ---
  // Usamos el importe directo del pedidoData o sumamos los subtotales directamente
  const totalCalculado = pedidoData.importe || itemsArray.reduce((acc, item) => {
    return acc + parseFloat(item.hidden_precio || item.precio || 0);
  }, 0);

  const limpiarNombre = (nombre) => {
    if (!nombre) return "producto";
    return nombre.trim().toLowerCase(); 
  };

  const textoPago = (pedidoData.pagado === 'TRANSF') ? 'PAGADO (TRANSF)' : 
                    (pedidoData.pagado === 'EFECTIVO' || pedidoData.pagado === 1 || pedidoData.pagado === "1") ? 'PAGADO (EFECTIVO)' : 
                    'PENDIENTE';

  const contenido = `
    <html>
      <head>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 175px; padding: 2px; margin: 0; 
            color: #000; background: #fff;
            text-transform: lowercase; font-weight: 900;
          }
          .header { text-align: center; border-bottom: 2px dashed #000; margin-bottom: 8px; padding-bottom: 4px; }
          .info-interna { text-align: center; border: 2px solid #000; margin: 5px 0; padding: 4px; display: ${esCliente ? 'none' : 'block'}; }
          .tabla { width: 100%; border-collapse: collapse; }
          .item-row { border-bottom: 1px dotted #000; }
          .col-cant { font-size: 17px; width: 35px; vertical-align: top; }
          .nom-prod { font-size: 16px; }
          .total-box { margin-top: 10px; border: 2px solid #000; text-align: right; padding: 5px; }
          .metodo-pago { font-size: 10px; text-align: center; margin-top: 5px; display: ${esCliente ? 'block' : 'none'}; }
        </style>
      </head>
      <body>
        <div class="header"><strong><span style="font-size: 18px;">Bar Los Primos</span></strong></div>
        <div class="info-interna"><strong>${pedidoData.id}</strong><br><strong>${pedidoData.cliente?.toLowerCase()}</strong></div>
        
        <table class="tabla">
          <tbody>
            ${itemsArray.map(item => {
              const cant = parseInt(item.cantidad || 1);
              // El precio que viene es el SUB TOTAL de esa línea
              const subtotal = parseFloat(item.hidden_precio || item.precio || 0);
              // CALCULAMOS el precio unitario real dividiendo por la cantidad
              const precioUnitario = subtotal / cant;

              return `
                <tr class="item-row">
                  <td class="col-cant"><strong>${cant}x</strong></td>
                  <td class="nom-prod">
                    <strong>${limpiarNombre(item.hidden_nombre || item.nombre)}</strong>
                    ${esCliente ? `<br><small><strong>pu: $${precioUnitario.toFixed(0)}</strong></small>` : ''}
                  </td>
                  <td style="text-align:right;"><strong>${esCliente ? '$' + subtotal : ''}</strong></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>

        ${esCliente ? `
          <div class="total-box">
            <small>total a pagar</small><br>
            <span style="font-size: 26px;">$${totalCalculado}</span>
          </div>
          <div class="metodo-pago">*** ${textoPago} ***</div>
        ` : ''}

        <script>
          window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }
        </script>
      </body>
    </html>
  `;
  ventanaImpresion.document.write(contenido);
  ventanaImpresion.document.close();
};
// --- 2. FUNCIÓN PARA HOJA DE RUTA (REPARTIDOR) ---
export const imprimirHojaRuta = (nombreRepartidor, pedidos) => {
  const ventanaImpresion = window.open('', '_blank');
  
  const totalEfectivo = pedidos.reduce((acc, p) => {
    const estaPagado = p.pagado && p.pagado !== "0" && p.pagado !== 0;
    return estaPagado ? acc : acc + parseFloat(p.importe || 0);
  }, 0);

  const contenido = `
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; width: 175px; padding: 2px; text-transform: lowercase; color: #000; font-weight: 900; }
          .header { text-align: center; border-bottom: 2px dashed #000; margin-bottom: 10px; }
          .pedido { border-bottom: 1px dotted #000; padding: 8px 0; }
          .aviso-bebida { 
            margin-top: 5px;
            padding: 4px;
            border: 2px solid #000;
            background-color: #fff;
            text-align: left;
          }
          .alerta-titulo { 
            display: block; 
            text-align: center; 
            font-size: 12px; 
            border-bottom: 1px solid #000;
            margin-bottom: 3px;
          }
          .bebida-item { font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header"><strong>${nombreRepartidor.toLowerCase()}</strong></div>

        ${pedidos.map(p => {
          const estaPagado = p.pagado && p.pagado !== "0" && p.pagado !== 0;
          const esPagoJusto = parseInt(p.pj) === 1;
          const metodo = p.pagado === 'TRANSF' ? 'ya pagó (transf)' : 'ya pagó (efec)';

          // --- LÓGICA DE DETECCIÓN Y LISTADO DE BEBIDAS ---
let listaBebidas = [];
try {
    const datosRaw = p.pedido || p.detalle;
    let productos = [];

    if (Array.isArray(datosRaw)) {
        productos = datosRaw;
    } else if (typeof datosRaw === 'string' && datosRaw.trim() !== "") {
        let str = datosRaw.trim();
        
        // CORRECCIÓN PARA EL ERROR DE SINTAXIS:
        // Si hay múltiples objetos pegados: {"id":1}{"id":2} 
        // los convertimos en un array válido: [{"id":1},{"id":2}]
        if (str.includes('}{')) {
            str = '[' + str.replace(/}{/g, '},{') + ']';
        } else if (!str.startsWith('[')) {
            // Si es un solo objeto sin corchetes, lo envolvemos
            str = '[' + str + ']';
        }

        productos = JSON.parse(str);
    }

    // Filtramos los productos que pertenecen a bebidas
    listaBebidas = productos.filter(item => 
        (item.hidden_clase && item.hidden_clase.toLowerCase() === 'bebidas') ||
        (item.clase && item.clase.toLowerCase() === 'bebidas')
    );

} catch (e) {
    console.error("Error crítico al parsear productos del pedido " + p.id, e);
    // Fallback: si falla todo, buscamos la palabra en el texto plano
    if (p.detalle && p.detalle.toUpperCase().includes("BEBIDA")) {
        listaBebidas = [{ cantidad: "", hidden_nombre: "revisar bebidas (error de lectura)" }];
    }
}
          return `
            <div class="pedido">
              <strong>${p.cliente?.toLowerCase()}</strong><br>
              ${estaPagado 
                ? `<strong>*** ${metodo} ***</strong>` 
                : `<strong><span style="font-size: 18px;">cobrar: $${p.importe} ${esPagoJusto ? '(pj)' : ''}</span></strong>`
              }
              
              ${listaBebidas.length > 0 ? `
                <div class="aviso-bebida">
                  <strong class="alerta-titulo">⚠️ lleva bebida ⚠️</strong>
                  ${listaBebidas.map(b => `
                    <div class="bebida-item">${b.cantidad}x ${b.hidden_nombre.toLowerCase()}</div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}

        <div style="text-align: right; margin-top: 10px; border: 2px solid #000; padding: 5px;">
          <small>total efectivo a entregar:</small><br>
          <span style="font-size: 22px;">$${totalEfectivo}</span>
        </div>

        <script>
          window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }
        </script>
      </body>
    </html>
  `;
  ventanaImpresion.document.write(contenido);
  ventanaImpresion.document.close();
};