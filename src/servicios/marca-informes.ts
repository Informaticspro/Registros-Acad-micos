import { utils, type WorkBook } from 'xlsx-js-style';
import type { jsPDF } from 'jspdf';

export const MARCA_INFORMES = '© Registros FADECO';
export const ORIGEN_INFORMES = 'Generado por Registros FADECO · Facultad de Economía · UNACHI';

export function marcarLibroInformes(libro: WorkBook) {
  libro.Props = { ...libro.Props, Author: 'Registros FADECO', Company: 'UNACHI · Facultad de Economía' };
  for (const nombre of libro.SheetNames) {
    const hoja = libro.Sheets[nombre];
    const rango = utils.decode_range(hoja['!ref'] || 'A1');
    const fila = rango.e.r + 2;
    utils.sheet_add_aoa(hoja, [[ORIGEN_INFORMES], [MARCA_INFORMES]], { origin: { r: fila, c: 0 } });
    for (const r of [fila, fila + 1]) {
      if (rango.e.c > 0) (hoja['!merges'] ||= []).push({ s: { r, c: 0 }, e: { r, c: rango.e.c } });
      hoja[utils.encode_cell({ r, c: 0 })].s = {
        font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: '37634F' } },
        alignment: { wrapText: true, vertical: 'center' },
      };
      (hoja['!rows'] ||= [])[r] = { hpt: 30 };
    }
  }
  // Include the signature in explicitly configured print areas.
  for (const nombre of libro.Workbook?.Names || []) {
    if (nombre.Name !== '_xlnm.Print_Area' || nombre.Sheet === undefined) continue;
    const hoja = libro.Sheets[libro.SheetNames[nombre.Sheet]];
    const final = utils.decode_range(hoja['!ref'] || 'A1').e.r + 1;
    nombre.Ref = nombre.Ref.replace(/(\$?[A-Z]+\$?)\d+$/, (_, columna: string) => columna + final);
  }
}

export async function marcarPdfInforme(pdf: jsPDF) {
  const respuesta = await fetch('/logo-registros-academicos.png');
  if (!respuesta.ok) throw new Error('No se pudo cargar el logo del informe.');
  const blob = await respuesta.blob();
  const logo = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el logo.'));
    reader.readAsDataURL(blob);
  });
  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina);
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    pdf.addImage(logo, 'PNG', 14, 6, 10, 10);
    pdf.setFontSize(9); pdf.setTextColor(30, 70, 50);
    pdf.text('Registros FADECO · Facultad de Economía · UNACHI', 28, 12);
    pdf.setDrawColor(200, 215, 205); pdf.line(14, alto - 17, ancho - 14, alto - 17);
    pdf.setFontSize(8);
    pdf.text(ORIGEN_INFORMES, 14, alto - 12);
    pdf.text(MARCA_INFORMES, 14, alto - 7);
    pdf.text(pagina + ' / ' + paginas, ancho - 14, alto - 7, { align: 'right' });
  }
}
