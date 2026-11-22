const escaparHtml = (valor) => {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const limpiarNombre = (nombre) => {
  if (!nombre) return 'producto';
  return escaparHtml(String(nombre).trim().toLowerCase());
};

const parsearItemsPedido = (pedidoData) => {
  const fuente = pedidoData?.pedido ?? pedidoData?.detalle;

  if (Array.isArray(fuente)) {
    return fuente;
  }

  if (typeof fuente === 'string' && fuente.trim() !== '') {
    const str = fuente.trim();
    if (str.startsWith('[') || str.startsWith('{')) {
      try {
        const normalizado = str.includes('}{')
          ? `[${str.replace(/\}\s*\{/g, '},{')}]`
          : str.startsWith('[')
          ? str
          : `[${str}]`;
        const parsed = JSON.parse(normalizado);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error al parsear items del pedido:', e);
      }
    }
  }

  return [];
};

const esPedidoPagado = (pagado) => {
  return ['TRANSF', 'EFECTIVO', 1, '1', true].includes(pagado);
};

const abrirYImprimirHtml = (html) => {
  const ancho = window.screen?.availWidth || 1280;
  const alto = window.screen?.availHeight || 800;

  const ventanaImpresion = window.open(
    '',
    '_blank',
    `width=${ancho},height=${alto},top=0,left=0,scrollbars=yes,resizable=yes`
  );

  if (!ventanaImpresion) {
    alert('Permití las ventanas emergentes en el navegador para imprimir la comanda.');
    return;
  }

  try {
    ventanaImpresion.moveTo(0, 0);
    ventanaImpresion.resizeTo(ancho, alto);
    ventanaImpresion.focus();
  } catch (e) {
    // Ignorado si el navegador restringe moveTo/resizeTo
  }

  ventanaImpresion.document.open();
  ventanaImpresion.document.write(html);
  ventanaImpresion.document.close();
};

const ESTILOS_BASE_TERMICA = `
  @page { margin: 0; }
  body {
    font-family: 'Courier New', monospace;
    width: 175px;
    padding: 2px;
    margin: 0;
    color: #000;
    background: #fff;
    text-transform: lowercase;
    font-weight: 900;
  }
  .header {
    text-align: center;
    border-bottom: 2px dashed #000;
    margin-bottom: 8px;
    padding-bottom: 4px;
  }
`;

const SCRIPT_IMPRESION = `
  <script>
    window.onload = () => {
      window.onafterprint = () => {
        setTimeout(() => window.close(), 200);
      };
      window.print();
      setTimeout(() => {
        if (!window.closed) window.close();
      }, 3000);
    };
  </script>
`;

export const imprimirComanda = (pedidoData, tipo = 'COCINA') => {
  if (!pedidoData) return;

  const esCliente = tipo === 'CLIENTE';
  const itemsArray = parsearItemsPedido(pedidoData);

  const totalCalculado =
    Number(
      pedidoData.importe ??
        itemsArray.reduce(
          (acc, item) => acc + (parseFloat(item.hidden_precio ?? item.precio ?? 0) || 0),
          0
        )
    ) || 0;

  const textoPago =
    pedidoData.pagado === 'TRANSF'
      ? 'PAGADO (TRANSF)'
      : pedidoData.pagado === 'EFECTIVO' || pedidoData.pagado === 1 || pedidoData.pagado === '1'
      ? 'PAGADO (EFECTIVO)'
      : 'PENDIENTE';

  const filasProductos =
    itemsArray.length > 0
      ? itemsArray
          .map((item) => {
            const cant = Math.max(1, parseInt(item.cantidad || 1, 10));
            const subtotal = parseFloat(item.hidden_precio ?? item.precio ?? 0) || 0;
            const precioUnitario = subtotal / cant;
            const nombreItem = limpiarNombre(item.hidden_nombre ?? item.nombre);

            return `
              <tr class="item-row">
                <td class="col-cant"><strong>${cant}x</strong></td>
                <td class="nom-prod">
                  <strong>${nombreItem}</strong>
                  ${
                    esCliente
                      ? `<br><small><strong>pu: $${Math.round(precioUnitario)}</strong></small>`
                      : ''
                  }
                </td>
                <td style="text-align:right;">
                  <strong>${esCliente ? `$${Math.round(subtotal)}` : ''}</strong>
                </td>
              </tr>
            `;
          })
          .join('')
      : pedidoData.detalle
      ? `
          <tr class="item-row">
            <td class="nom-prod" colspan="3">
              <strong>${limpiarNombre(pedidoData.detalle)}</strong>
            </td>
          </tr>
        `
      : '';

  const idCrudo =
    pedidoData.id ??
    pedidoData.id_pedido ??
    pedidoData.idPedido ??
    pedidoData.nro ??
    pedidoData.numero;

  const numeroPedido =
    idCrudo !== undefined && idCrudo !== null && String(idCrudo).trim() !== ''
      ? escaparHtml(idCrudo)
      : 'S/N';

  const contenido = `
    <html>
      <head>
        <style>
          ${ESTILOS_BASE_TERMICA}
          .info-interna {
            text-align: center;
            border: 2px solid #000;
            margin: 5px 0;
            padding: 4px;
            display: ${esCliente ? 'none' : 'block'};
          }
          .tabla { width: 100%; border-collapse: collapse; }
          .item-row { border-bottom: 1px dotted #000; }
          .col-cant { font-size: 17px; width: 35px; vertical-align: top; }
          .nom-prod { font-size: 16px; }
          .total-box {
            margin-top: 10px;
            border: 2px solid #000;
            text-align: right;
            padding: 5px;
          }
          .metodo-pago {
            font-size: 10px;
            text-align: center;
            margin-top: 5px;
            display: ${esCliente ? 'block' : 'none'};
          }
        </style>
      </head>
      <body>
        <div class="header">
          <strong><span style="font-size: 18px;">Bar Los Primos</span></strong>
        </div>
        <div class="info-interna">
          <strong>#${numeroPedido}</strong><br>
          <strong>${limpiarNombre(pedidoData.cliente)}</strong>
        </div>

        <table class="tabla">
          <tbody>
            ${filasProductos}
          </tbody>
        </table>

        ${
          esCliente
            ? `
          <div class="total-box">
            <small>total a pagar</small><br>
            <span style="font-size: 26px;">$${Math.round(totalCalculado)}</span>
          </div>
          <div class="metodo-pago">*** ${escaparHtml(textoPago)} ***</div>
        `
            : ''
        }

        ${SCRIPT_IMPRESION}
      </body>
    </html>
  `;

  abrirYImprimirHtml(contenido);
};

// --- 2. FUNCIÓN PARA HOJA DE RUTA (REPARTIDOR) ---
export const imprimirHojaRuta = (nombreRepartidor, pedidos = []) => {
  const listaPedidos = Array.isArray(pedidos) ? pedidos : [];

  const totalEfectivo = listaPedidos.reduce((acc, p) => {
    return esPedidoPagado(p.pagado) ? acc : acc + (parseFloat(p.importe) || 0);
  }, 0);

  const contenido = `
    <html>
      <head>
        <style>
          ${ESTILOS_BASE_TERMICA}
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
        <div class="header"><strong>${limpiarNombre(nombreRepartidor)}</strong></div>

        ${listaPedidos
          .map((p) => {
            const pagado = esPedidoPagado(p.pagado);
            const esPagoJusto = parseInt(p.pj, 10) === 1;
            const metodo = p.pagado === 'TRANSF' ? 'ya pagó (transf)' : 'ya pagó (efec)';

            let listaBebidas = [];
            const productos = parsearItemsPedido(p);

            if (productos.length > 0) {
              listaBebidas = productos.filter((item) => {
                const clase = String(item.hidden_clase ?? item.clase ?? '').toLowerCase();
                return clase === 'bebidas';
              });
            } else if (typeof p.detalle === 'string' && p.detalle.toUpperCase().includes('BEBIDA')) {
              listaBebidas = [
                { cantidad: '', hidden_nombre: 'revisar bebidas (error de lectura)' }
              ];
            }

            return `
              <div class="pedido">
                <strong>${limpiarNombre(p.cliente)}</strong><br>
                ${
                  pagado
                    ? `<strong>*** ${escaparHtml(metodo)} ***</strong>`
                    : `<strong><span style="font-size: 18px;">cobrar: $${Math.round(
                        parseFloat(p.importe) || 0
                      )} ${esPagoJusto ? '(pj)' : ''}</span></strong>`
                }

                ${
                  listaBebidas.length > 0
                    ? `
                  <div class="aviso-bebida">
                    <strong class="alerta-titulo">⚠️ lleva bebida ⚠️</strong>
                    ${listaBebidas
                      .map((b) => {
                        const cantTexto = b.cantidad ? `${escaparHtml(b.cantidad)}x ` : '';
                        const nomBebida = limpiarNombre(b.hidden_nombre ?? b.nombre);
                        return `<div class="bebida-item">${cantTexto}${nomBebida}</div>`;
                      })
                      .join('')}
                  </div>
                `
                    : ''
                }
              </div>
            `;
          })
          .join('')}

        <div style="text-align: right; margin-top: 10px; border: 2px solid #000; padding: 5px;">
          <small>total efectivo a entregar:</small><br>
          <span style="font-size: 22px;">$${Math.round(totalEfectivo)}</span>
        </div>

        ${SCRIPT_IMPRESION}
      </body>
    </html>
  `;

  abrirYImprimirHtml(contenido);
};