import React, { useState, useEffect } from 'react';
import {
  X, Printer, FileDown, Trash2, Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../../services/api.js';
import { obtenerPedidosBorrados } from '../../services/historialBorrados.js';

const formatoPesos = (valor) => `$${(parseFloat(valor) || 0).toLocaleString('es-AR')}`;

const obtenerMedioPago = (p) => {
  if (!p?.pagado || p.pagado === '0' || p.pagado === 0) return 'PENDIENTE';
  if (p.pagado === 'TRANSF') return '[TRANSF]';
  if (p.pagado === 'EFECTIVO' || p.pagado === 1 || p.pagado === '1') return 'EFECTIVO';
  return String(p.pagado).toUpperCase();
};

const ordenarPedidosAscendente = (lista = []) => {
  return [...lista].sort((a, b) => {
    const idA = parseInt(a?.id, 10);
    const idB = parseInt(b?.id, 10);
    if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
      return idA - idB;
    }
    return 0;
  });
};

const ordenarBorradosAscendente = (lista = []) => {
  return [...lista].sort((a, b) => {
    const idA = parseInt(a?.id, 10);
    const idB = parseInt(b?.id, 10);
    if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
      return idA - idB;
    }
    const tsA = parseInt(String(a?.uid || '').split('-').pop(), 10) || 0;
    const tsB = parseInt(String(b?.uid || '').split('-').pop(), 10) || 0;
    return tsA - tsB;
  });
};

const BotonCierreCaja = ({ pedidos = [], onBorrarTodo }) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaManual, setFechaManual] = useState(new Date().toISOString().split('T')[0]);
  const [valorComisionBase, setValorComisionBase] = useState(0);
  const [enviandoPDF, setEnviandoPDF] = useState(false);
  const [pedidosBorrados, setPedidosBorrados] = useState([]);

  // 1. CARGAR COMISIÓN DE REPARTIDORES DESDE DB Y BORRADOS LOCALES
  useEffect(() => {
    if (modalAbierto) {
      setPedidosBorrados(obtenerPedidosBorrados());

      const cargarConfig = async () => {
        try {
          const res = await api.getConfig();
          const listaConfigs = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          const config = listaConfigs.find((c) => c.tipo === 'comision');
          if (config) setValorComisionBase(parseFloat(config.valor) || 0);
        } catch (err) {
          console.error('Error cargando comisión repartidores:', err);
        }
      };
      cargarConfig();
    }
  }, [modalAbierto]);

  // 2. LÓGICA DE DINERO Y TRANSFERENCIAS
  const esPagado = (p) => p.pagado && p.pagado !== '0' && p.pagado !== 0;
  const pedidosPagados = pedidos.filter(esPagado);
  const pedidosTransf = pedidos.filter((p) => p.pagado === 'TRANSF');

  const montoEfectivo = pedidosPagados
    .filter((p) => p.pagado === 'EFECTIVO' || p.pagado === 1 || p.pagado === '1')
    .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const montoTransf = pedidosTransf
    .reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);

  const totalCaja = montoEfectivo + montoTransf;
  const totalImportesPedidos = pedidos.reduce((acc, p) => acc + (parseFloat(p.importe) || 0), 0);
  const pendienteCobro = Math.max(0, totalImportesPedidos - totalCaja);
  const totalAnuladoBorrados = pedidosBorrados.reduce(
    (acc, b) => acc + (parseFloat(b.importe) || 0),
    0
  );

  const parsearDetalle = (detalleRaw) => {
    if (!detalleRaw) return [];
    if (Array.isArray(detalleRaw)) return detalleRaw;
    if (typeof detalleRaw !== 'string') return [];

    const limpio = detalleRaw.trim();
    if (!limpio) return [];

    try {
      const normalizado = limpio.includes('}{')
        ? `[${limpio.replace(/\}\s*\{/g, '},{')}]`
        : limpio.startsWith('[')
        ? limpio
        : `[${limpio}]`;
      const data = JSON.parse(normalizado);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const obtenerTextoDetallePedido = (p) => {
    const items = parsearDetalle(p.pedido ?? p.detalle);
    if (items.length > 0) {
      return items
        .map((i) => `${i.cantidad || 1}x ${i.hidden_nombre || i.nombre || 'Ítem'}`)
        .join(', ');
    }
    return typeof p.detalle === 'string' && p.detalle.trim() !== '' ? p.detalle : '-';
  };

  // 3. GENERACIÓN DE PDF (DETALLE DE PEDIDOS PRIMERO EN ORDEN ASCENDENTE)
  const descargarPDFReporte = async () => {
    if (enviandoPDF) return;
    setEnviandoPDF(true);

    try {
      const pedidosAscendentes = ordenarPedidosAscendente(pedidos);
      const borradosAscendentes = ordenarBorradosAscendente(obtenerPedidosBorrados());
      const totalAnuladoActual = borradosAscendentes.reduce(
        (acc, b) => acc + (parseFloat(b.importe) || 0),
        0
      );

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // --- ENCABEZADO EN ALTO CONTRASTE (B/N) ---
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, pageWidth, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(19);
      doc.setFont(undefined, 'bold');
      doc.text('BAR LOS PRIMOS - CIERRE DE CAJA', 14, 16);

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(240, 240, 240);
      doc.text(`Fecha: ${fechaManual}`, 14, 26);
      doc.text(`Comisión viaje: ${formatoPesos(valorComisionBase)}`, 74, 26);
      doc.text(`Pedidos: ${pedidosAscendentes.length}`, 154, 26);

      doc.setTextColor(0, 0, 0);

      // --- RESUMEN FINANCIERO ---
      autoTable(doc, {
        startY: 42,
        head: [['EFECTIVO', 'TRANSFERENCIAS', 'TOTAL CAJA', 'VENTA / PENDIENTE']],
        body: [[
          formatoPesos(montoEfectivo),
          `${formatoPesos(montoTransf)} (${pedidosTransf.length})`,
          formatoPesos(totalCaja),
          `${formatoPesos(totalImportesPedidos)} (${formatoPesos(pendienteCobro)})`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 10.5, fontStyle: 'bold', textColor: [0, 0, 0], halign: 'center' }
      });

      // --- 1. DETALLE DE PEDIDOS (ORDEN ASCENDENTE) ---
      let yActual = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(11.5);
      doc.setFont(undefined, 'bold');
      doc.text('1. DETALLE DE PEDIDOS', 14, yActual);

      const filasPedidos = pedidosAscendentes.map((p) => {
        let entrega = 'S/D';
        if (p.statu === 'ENTREGADO_0') {
          entrega = 'MOSTRADOR';
        } else if (p.statu?.startsWith('ENTREGADO_')) {
          entrega = p.statu.replace('ENTREGADO_', '');
        }

        const detalleTexto = obtenerTextoDetallePedido(p);
        const medioPago = obtenerMedioPago(p);

        return [
          `#${p.id ?? 'S/N'} / ${p.cliente || 'S/N'}`,
          detalleTexto || '-',
          entrega,
          medioPago,
          formatoPesos(p.importe)
        ];
      });

      if (filasPedidos.length > 0) {
        filasPedidos.push([
          'TOTAL',
          `${pedidosAscendentes.length} pedidos (${pedidosTransf.length} TRANSF)`,
          '',
          '',
          formatoPesos(totalImportesPedidos)
        ]);
      }

      autoTable(doc, {
        startY: yActual + 3,
        head: [['PEDIDO / CLIENTE', 'DETALLE', 'ENTREGA', 'PAGO', 'IMPORTE']],
        body: filasPedidos.length > 0 ? filasPedidos : [['-', 'Sin pedidos en esta jornada', '-', '-', formatoPesos(0)]],
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 9.5, textColor: [0, 0, 0], overflow: 'linebreak', cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 34 },
          1: { cellWidth: 68 },
          2: { cellWidth: 26 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 29, halign: 'right' }
        },
        didParseCell: (data) => {
          const esFilaTotal = filasPedidos.length > 0 && data.row.index === filasPedidos.length - 1;
          if (esFilaTotal) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [235, 235, 235];
            return;
          }

          if (data.section === 'body') {
            const pagoVal = data.row.raw?.[3];
            if (pagoVal === '[TRANSF]') {
              data.cell.styles.fontStyle = 'bold';
              if (data.column.index === 3 || data.column.index === 4) {
                data.cell.styles.fillColor = [242, 242, 242];
              }
            } else if (pagoVal === 'PENDIENTE' && data.column.index === 3) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // --- 2. LOGÍSTICA DE REPARTIDORES ---
      const logistica = {};
      let viajesMostrador = 0;
      let totalViajesReparto = 0;
      let totalPagarRepartidores = 0;

      pedidosAscendentes.forEach((p) => {
        if (p.statu === 'ENTREGADO_0') {
          viajesMostrador++;
        } else if (p.statu?.startsWith('ENTREGADO_')) {
          const repartidor = p.statu.replace('ENTREGADO_', '').trim() || 'Sin nombre';
          if (!logistica[repartidor]) logistica[repartidor] = { viajes: 0, pagosExtras: 0 };
          logistica[repartidor].viajes++;
          logistica[repartidor].pagosExtras += parseFloat(p.pago_repartidor) || 0;
        }
      });

      const filasLogistica = Object.entries(logistica).map(([nom, d]) => {
        const pagoTotal = (d.viajes * valorComisionBase) + d.pagosExtras;
        totalViajesReparto += d.viajes;
        totalPagarRepartidores += pagoTotal;
        return [nom, d.viajes, formatoPesos(pagoTotal)];
      });

      if (filasLogistica.length > 0) {
        filasLogistica.push(['TOTAL REPARTIDORES', totalViajesReparto, formatoPesos(totalPagarRepartidores)]);
      }

      yActual = doc.lastAutoTable.finalY + 13;
      doc.setFontSize(11.5);
      doc.setFont(undefined, 'bold');
      doc.text('2. REPARTIDORES', 14, yActual);

      autoTable(doc, {
        startY: yActual + 3,
        head: [['REPARTIDOR', 'VIAJES', 'TOTAL A PAGAR']],
        body: filasLogistica.length > 0 ? filasLogistica : [['Sin repartos registrados', 0, formatoPesos(0)]],
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 9.5, textColor: [0, 0, 0], cellPadding: 2.5 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (filasLogistica.length > 0 && data.row.index === filasLogistica.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [235, 235, 235];
          }
        }
      });

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`Pedidos retirados por mostrador: ${viajesMostrador}`, 14, doc.lastAutoTable.finalY + 7);

      // --- 3. VENTAS POR CATEGORÍA (MAYOR A MENOR) ---
      const stats = {};
      let totalUnidades = 0;

      pedidosAscendentes.forEach((p) => {
        parsearDetalle(p.pedido ?? p.detalle).forEach((item) => {
          const cat = (item.hidden_clase || item.clase || 'OTROS').toUpperCase();
          const cant = parseInt(item.cantidad, 10) || 1;
          stats[cat] = (stats[cat] || 0) + cant;
          totalUnidades += cant;
        });
      });

      const categoriasOrdenadas = Object.entries(stats).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });

      const filasCategorias = categoriasOrdenadas.map(([k, v]) => [k, v]);
      if (filasCategorias.length > 0) {
        filasCategorias.push(['TOTAL UNIDADES', totalUnidades]);
      }

      yActual = doc.lastAutoTable.finalY + 14;
      doc.setFontSize(11.5);
      doc.setFont(undefined, 'bold');
      doc.text('3. UNIDADES VENDIDAS POR CATEGORÍA', 14, yActual);

      autoTable(doc, {
        startY: yActual + 3,
        head: [['CATEGORÍA', 'UNIDADES VENDIDAS']],
        body: filasCategorias.length > 0 ? filasCategorias : [['Sin ítems registrados', 0]],
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 9.5, textColor: [0, 0, 0], cellPadding: 2.5 },
        columnStyles: {
          1: { halign: 'center' }
        },
        didParseCell: (data) => {
          if (filasCategorias.length > 0 && data.row.index === filasCategorias.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [235, 235, 235];
          }
        }
      });

      // --- 4. PEDIDOS BORRADOS (ORDEN ASCENDENTE) ---
      yActual = doc.lastAutoTable.finalY + 14;
      doc.setFontSize(11.5);
      doc.setFont(undefined, 'bold');
      doc.text('4. PEDIDOS BORRADOS', 14, yActual);

      const filasBorrados = borradosAscendentes.map((b) => [
        `#${b.id ?? 'S/N'}`,
        b.cliente || 'S/N',
        b.detalle || '-',
        b.motivo || 'Sin motivo',
        formatoPesos(b.importe)
      ]);

      if (filasBorrados.length > 0) {
        filasBorrados.push([
          'TOTAL ANULADO',
          `${borradosAscendentes.length} borrados`,
          '',
          '',
          formatoPesos(totalAnuladoActual)
        ]);
      }

      autoTable(doc, {
        startY: yActual + 3,
        head: [['PEDIDO', 'CLIENTE', 'DETALLE', 'MOTIVO', 'IMPORTE']],
        body: filasBorrados.length > 0
          ? filasBorrados
          : [['-', '-', 'Sin pedidos borrados registrados', '-', formatoPesos(0)]],
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 9, textColor: [0, 0, 0], overflow: 'linebreak', cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 33 },
          2: { cellWidth: 56 },
          3: { cellWidth: 40 },
          4: { cellWidth: 29, halign: 'right' }
        },
        didParseCell: (data) => {
          if (filasBorrados.length > 0 && data.row.index === filasBorrados.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [235, 235, 235];
          }
        }
      });

      // --- PIE DE PÁGINA EN TODAS LAS HOJAS ---
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(
          `Bar Los Primos • Cierre ${fechaManual} • Página ${i} de ${totalPages}`,
          14,
          pageHeight - 8
        );
      }

      // Descarga local inmediata como respaldo
      doc.save(`CIERRE_PRIMOS_${fechaManual}.pdf`);

      // Envío por email al dueño
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      try {
        await api.enviarReporteEmail({
          pdfBase64,
          fecha: fechaManual
        });
        alert('✅ Reporte enviado al dueño por email con éxito.');
      } catch (err) {
        console.error('Error al enviar email:', err);
        alert('⚠️ El PDF se descargó pero no se pudo enviar por mail. Revisa el servidor.');
      }
    } finally {
      setEnviandoPDF(false);
    }
  };

  // 4. IMPRESIÓN RÁPIDA DE TICKET
  const imprimirTicketRapido = () => {
    const ventana = window.open('', '_blank', 'height=500,width=300');
    if (!ventana) return;

    ventana.document.write(`
      <html>
        <body style="font-family:monospace; text-align:center; font-weight:900; text-transform:uppercase; padding:10px;">
          <h3>BAR LOS PRIMOS</h3>
          <p>CIERRE: ${fechaManual}</p>
          <hr>
          <p style="text-align:left;">Venta Total: ${formatoPesos(totalImportesPedidos)}</p>
          <hr>
          <p style="text-align:left;">EFECTIVO: ${formatoPesos(montoEfectivo)}</p>
          <p style="text-align:left;">TRANSF (${pedidosTransf.length}): ${formatoPesos(montoTransf)}</p>
          <p style="text-align:left;">BORRADOS (${pedidosBorrados.length}): ${formatoPesos(totalAnuladoBorrados)}</p>
          <div style="border:3px solid #000; font-size:20px; margin:10px 0; padding:5px;">
            TOTAL CAJA: ${formatoPesos(totalCaja)}
          </div>
          <script>window.onload=()=>{window.print();window.close();}</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAbierto(true)}
        className="bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] hover:bg-orange-500 transition-all shadow-lg flex items-center gap-2 uppercase tracking-widest active:scale-95 shrink-0"
      >
        <Printer size={14} /> finalizar día
      </button>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl font-black">

            <div className="p-6 pb-2 flex justify-between items-center">
              <h3 className="text-white uppercase text-[9px] tracking-[0.2em] opacity-50">resumen de jornada</h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 pt-4 space-y-6">
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                  <Calendar size={18} className="text-orange-500" />
                  <input
                    type="date"
                    value={fechaManual}
                    onChange={(e) => setFechaManual(e.target.value)}
                    className="bg-transparent text-white outline-none w-full text-sm font-black uppercase"
                  />
                </div>
                <div className="flex justify-between px-2">
                  <span className="text-[9px] text-gray-500 uppercase">Comisión Repartos:</span>
                  <span className="text-[9px] text-white uppercase">{formatoPesos(valorComisionBase)} c/u</span>
                </div>
                <div className="flex justify-between px-2">
                  <span className="text-[9px] text-gray-500 uppercase">Transferencias ({pedidosTransf.length}):</span>
                  <span className="text-[9px] text-blue-400 uppercase">{formatoPesos(montoTransf)}</span>
                </div>
                <div className="flex justify-between px-2">
                  <span className="text-[9px] text-gray-500 uppercase">Pedidos Borrados ({pedidosBorrados.length}):</span>
                  <span className="text-[9px] text-red-400 uppercase">{formatoPesos(totalAnuladoBorrados)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={imprimirTicketRapido}
                  disabled={enviandoPDF}
                  className="bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase flex flex-col items-center gap-2 hover:bg-orange-500 transition-all disabled:opacity-50"
                >
                  <Printer size={18} /> Ticket Rápido
                </button>
                <button
                  type="button"
                  onClick={descargarPDFReporte}
                  disabled={enviandoPDF}
                  className="bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase flex flex-col items-center gap-2 hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  <FileDown size={18} /> {enviandoPDF ? 'Enviando...' : 'Reporte PDF'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ ¿BORRAR TODO EL CUADERNO?\n\nSe eliminarán todos los pedidos para empezar un nuevo día.')) {
                    onBorrarTodo();
                    setModalAbierto(false);
                  }
                }}
                disabled={enviandoPDF}
                className="w-full bg-red-600/10 text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-3 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-lg disabled:opacity-50"
              >
                <Trash2 size={16} /> Reiniciar Día
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BotonCierreCaja;