// Usaremos una ventana emergente para enviar el HTML limpio a la impresora térmica
const printHTML = (html) => {
  const windowPrint = window.open('', '', 'width=800,height=600');
  windowPrint.document.write(`
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 300px; padding: 10px; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          @media print { @page { margin: 0; } body { margin: 0.5cm; } }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  windowPrint.document.close();
  windowPrint.focus();
  // Pequeño delay para asegurar que el contenido cargue antes de imprimir
  setTimeout(() => {
    windowPrint.print();
    windowPrint.close();
  }, 250);
};

export const imprimirCocina = (pedido) => {
  const detalles = JSON.parse(pedido.detalle); // Parseamos el array de productos
  const html = `
    <div class="text-center">
      <h2 class="bold text-center">COCINA</h2>
      <p>Pedido #${pedido.id}</p>
      <p class="bold">Cliente: ${pedido.cliente}</p>
      <div class="divider"></div>
      ${detalles.map(item => `
        <div class="item">
          <span>${item.hidden_nombre}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      <p class="text-center">${new Date().toLocaleTimeString()}</p>
    </div>
  `;
  printHTML(html);
};

export const imprimirTicketCliente = (pedido) => {
  const detalles = JSON.parse(pedido.detalle);
  const html = `
    <div class="text-center">
      <h1 class="bold">BAR LOS PRIMOS</h1>
      <p>Ticket No Fiscal</p>
      <div class="divider"></div>
      <p>Cliente: ${pedido.cliente}</p>
      <div class="divider"></div>
      ${detalles.map(item => `
        <div class="item">
          <span>1x ${item.hidden_nombre}</span>
          <span>$${item.hidden_precio}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      <div class="item bold">
        <span>TOTAL:</span>
        <span>$${pedido.importe}</span>
      </div>
      <p class="text-center">¡Gracias por su compra!</p>
    </div>
  `;
  printHTML(html);
};