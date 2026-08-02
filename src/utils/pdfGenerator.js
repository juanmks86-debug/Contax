import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper to draw common header
function drawHeader(doc, title, config) {
  const businessName = config?.businessName || 'Contax';
  const logo = config?.logo || '💼';
  const currency = config?.currency || '$';
  
  // Header background banner
  doc.setFillColor(55, 138, 221); // #378ADD
  doc.rect(0, 0, 210, 25, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${logo} ${title.toUpperCase()}`, 14, 17);
  
  // Business name & Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(businessName, 196, 11, { align: 'right' });
  
  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha: ${todayStr}`, 196, 18, { align: 'right' });
}

// Helper to draw footer
function drawFooter(doc, pageCount) {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
    doc.text('Generado por Contax PWA', 14, 285);
  }
}

export function generateInventarioValorado(productos, sectores, config) {
  const doc = new jsPDF();
  const currency = config?.currency || '$';
  
  drawHeader(doc, 'Reporte de Inventario Valorado', config);
  
  // Calculations
  let totalCost = 0;
  let totalSale = 0;
  let totalQty = 0;
  
  const tableBody = productos.map((p) => {
    const cat = sectores.find(c => c.id === p.catId) || { name: 'Sin sector', icon: '📦' };
    const salePrice = p.saleManual > 0 ? p.saleManual : p.cost * (1 + p.margin / 100);
    const costVal = p.cost * p.qty;
    const saleVal = salePrice * p.qty;
    
    totalCost += costVal;
    totalSale += saleVal;
    totalQty += p.qty;
    
    return [
      p.sku || 'N/A',
      p.name,
      `${cat.icon} ${cat.name}`,
      `${p.qty} ${p.unit || 'uds'}`,
      `${currency}${p.cost.toFixed(2)}`,
      `${currency}${salePrice.toFixed(2)}`,
      `${currency}${costVal.toFixed(2)}`,
      `${currency}${saleVal.toFixed(2)}`
    ];
  });
  
  const totalProfit = totalSale - totalCost;
  
  // Summary Section (cards style)
  doc.setFillColor(245, 245, 240);
  doc.rect(14, 30, 182, 22, 'F');
  
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE INVENTARIO', 18, 36);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Items: ${productos.length}  |  Cant. Total: ${totalQty.toFixed(1)}`, 18, 44);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Valor Costo: ${currency}${totalCost.toFixed(2)}`, 90, 36);
  doc.text(`Valor Venta: ${currency}${totalSale.toFixed(2)}`, 90, 44);
  
  doc.setTextColor(39, 80, 10); // green text
  doc.setFontSize(10);
  doc.text(`GANANCIA POTENCIAL: ${currency}${totalProfit.toFixed(2)}`, 140, 41);
  
  // Table
  doc.autoTable({
    startY: 57,
    head: [['SKU', 'Producto', 'Sector', 'Stock', 'Costo Unit.', 'Venta Unit.', 'Val. Costo', 'Val. Venta']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [55, 138, 221], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' }
    }
  });
  
  drawFooter(doc, doc.internal.getNumberOfPages());
  doc.save(`inventario_valorado_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateCierreVentas(ventas, desde, hasta, config) {
  const doc = new jsPDF();
  const currency = config?.currency || '$';
  
  drawHeader(doc, 'Reporte de Ventas y Ganancias', config);
  
  let totalVentas = 0;
  let totalProfit = 0;
  let totalQty = 0;
  
  const tableBody = ventas.map((v) => {
    totalVentas += v.total;
    totalProfit += v.totalProfit;
    totalQty += v.qty;
    
    const dateStr = new Date(v.fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return [
      dateStr,
      v.prodSku || 'N/A',
      v.prodName,
      `${v.qty} ${v.unit || 'uds'}`,
      `${currency}${v.saleUnit.toFixed(2)}`,
      `${currency}${v.total.toFixed(2)}`,
      `${currency}${v.totalProfit.toFixed(2)}`
    ];
  });
  
  // Date Range Display
  const desdeStr = new Date(desde).toLocaleDateString('es-ES');
  const hastaStr = new Date(hasta).toLocaleDateString('es-ES');
  
  doc.setFillColor(245, 245, 240);
  doc.rect(14, 30, 182, 22, 'F');
  
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`CIERRE DE VENTAS (${desdeStr} al ${hastaStr})`, 18, 36);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Transacciones: ${ventas.length}  |  Cant. Vendida: ${totalQty.toFixed(1)}`, 18, 44);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(12, 68, 124); // blue text
  doc.text(`INGRESOS TOTALES: ${currency}${totalVentas.toFixed(2)}`, 90, 41);
  
  doc.setTextColor(39, 80, 10); // green text
  doc.setFontSize(10);
  doc.text(`GANANCIA NETA: ${currency}${totalProfit.toFixed(2)}`, 140, 41);
  
  // Table
  doc.autoTable({
    startY: 57,
    head: [['Fecha', 'SKU', 'Producto', 'Cant.', 'Precio Unit.', 'Total Cobrado', 'Ganancia']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [55, 138, 221] },
    columnStyles: {
      0: { cellWidth: 28 },
      3: { halign: 'right', cellWidth: 15 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' }
    }
  });
  
  drawFooter(doc, doc.internal.getNumberOfPages());
  doc.save(`cierre_ventas_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateListaCompras(listaCompras, config) {
  const doc = new jsPDF();
  
  drawHeader(doc, 'Lista de Compras Sugerida', config);
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Esta lista contiene productos que están por debajo de su stock mínimo.', 14, 33);
  doc.text('Las cantidades sugeridas cubren las ventas estimadas de 30 días.', 14, 38);
  
  const tableBody = listaCompras.map((c) => {
    return [
      c.sku || 'N/A',
      c.nombre,
      c.icono || '📦',
      `${c.actual} ${c.unidad}`,
      `+${c.sugerido} ${c.unidad}`,
      c.prioridad.toUpperCase(),
      '[   ] Comprado'
    ];
  });
  
  doc.autoTable({
    startY: 45,
    head: [['SKU', 'Producto', 'Sec.', 'Stock Act.', 'Compra Sug.', 'Prioridad', 'Estado']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [55, 138, 221] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 20 },
      6: { cellWidth: 28 }
    }
  });
  
  drawFooter(doc, doc.internal.getNumberOfPages());
  doc.save(`lista_compras_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateVencimientos(vencimientos, config) {
  const doc = new jsPDF();
  
  drawHeader(doc, 'Reporte de Próximos Vencimientos', config);
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.text('Detalle de productos vencidos o próximos a vencer en los siguientes 30 días.', 14, 33);
  doc.text('Ordenados por nivel de urgencia para facilitar su liquidación rápida.', 14, 38);
  
  const tableBody = vencimientos.map((v) => {
    const vencDateStr = new Date(v.fecha).toLocaleDateString('es-ES');
    let diasText = '';
    if (v.dias <= 0) {
      diasText = 'VENCIDO';
    } else if (v.dias === 1) {
      diasText = '1 día';
    } else {
      diasText = `${v.dias} días`;
    }
    
    return [
      v.nombre,
      v.icono || '📦',
      vencDateStr,
      `${v.qty} ${v.unidad}`,
      diasText,
      v.estado.toUpperCase()
    ];
  });
  
  doc.autoTable({
    startY: 45,
    head: [['Producto', 'Sec.', 'Vencimiento', 'Stock', 'Días Restantes', 'Estado']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [55, 138, 221] },
    columnStyles: {
      1: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'center' }
    }
  });
  
  drawFooter(doc, doc.internal.getNumberOfPages());
  doc.save(`vencimientos_${new Date().toISOString().split('T')[0]}.pdf`);
}
