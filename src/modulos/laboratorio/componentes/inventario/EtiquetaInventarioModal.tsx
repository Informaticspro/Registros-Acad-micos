import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Clipboard, Download, XCircle } from 'lucide-react';

import { EquipoLaboratorio } from '@/tipos/dominio';
import { getEstadoEquipoLabel, splitMarcaModelo } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

const code39Patterns: Record<string, string> = {
  '0': '101001101101',
  '1': '110100101011',
  '2': '101100101011',
  '3': '110110010101',
  '4': '101001101011',
  '5': '110100110101',
  '6': '101100110101',
  '7': '101001011011',
  '8': '110100101101',
  '9': '101100101101',
  A: '110101001011',
  B: '101101001011',
  C: '110110100101',
  D: '101011001011',
  E: '110101100101',
  F: '101101100101',
  G: '101010011011',
  H: '110101001101',
  I: '101101001101',
  J: '101011001101',
  K: '110101010011',
  L: '101101010011',
  M: '110110101001',
  N: '101011010011',
  O: '110101101001',
  P: '101101101001',
  Q: '101010110011',
  R: '110101011001',
  S: '101101011001',
  T: '101011011001',
  U: '110010101011',
  V: '100110101011',
  W: '110011010101',
  X: '100101101011',
  Y: '110010110101',
  Z: '100110110101',
  '-': '100101011011',
  '.': '110010101101',
  ' ': '100110101101',
  '$': '100100100101',
  '/': '100100101001',
  '+': '100101001001',
  '%': '101001001001',
  '*': '100101101101',
};

type EtiquetaInventarioModalProps = {
  equipo: EquipoLaboratorio;
  estadoNombre: string;
  onClose: () => void;
};

function normalizeBarcodeValue(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ./$+%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || 'SIN INVENTARIO';
}

function buildBarcodeSegments(value: string) {
  const fullValue = `*${normalizeBarcodeValue(value)}*`;
  const moduleWidth = 2;
  const height = 72;
  const quietZone = 14;
  let x = quietZone;
  const rects: Array<{ x: number; width: number }> = [];

  fullValue.split('').forEach((char) => {
    const pattern = code39Patterns[char] ?? code39Patterns[' '];
    pattern.split('').forEach((bit) => {
      const width = bit === '1' ? moduleWidth * 2 : moduleWidth;
      if (bit === '1') rects.push({ x, width });
      x += width;
    });
    x += moduleWidth;
  });

  return { rects, width: x + quietZone, height };
}

function downloadSvg(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hasUsefulIdentifier(value?: string | null) {
  const normalized = (value ?? '').trim().toUpperCase();
  return Boolean(normalized) && !['N/A', 'NA', 'S/N', 'SN', 'SIN INVENTARIO', 'SIN SERIE'].includes(normalized);
}

export function EtiquetaInventarioModal({ equipo, estadoNombre, onClose }: EtiquetaInventarioModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const { marca, modelo } = splitMarcaModelo(equipo.marcaModelo);
  const inventoryDisplay = hasUsefulIdentifier(equipo.codigo) ? equipo.codigo : 'Sin inventario';
  const serialDisplay = hasUsefulIdentifier(equipo.serie) ? equipo.serie : 'Sin serie';
  const labelIdentifier = hasUsefulIdentifier(equipo.codigo)
    ? equipo.codigo
    : hasUsefulIdentifier(equipo.serie)
      ? equipo.serie
      : equipo.nombre;
  const barcodeValue = normalizeBarcodeValue(labelIdentifier);
  const barcode = useMemo(() => buildBarcodeSegments(barcodeValue), [barcodeValue]);
  const expedienteUrl = `${window.location.origin}/laboratorio/equipos/${equipo.id}`;
  const detalleEquipo = [
    `Expediente: ${expedienteUrl}`,
    `Inventario: ${inventoryDisplay}`,
    `Equipo: ${equipo.nombre || 'No indicado'}`,
    `Categoria: ${equipo.categoria || 'No indicada'}`,
    `Marca: ${marca}`,
    `Modelo: ${modelo}`,
    `Serie: ${serialDisplay}`,
    `Ubicacion: ${equipo.ubicacion || 'Sin ubicacion'}`,
    `Estado: ${estadoNombre || getEstadoEquipoLabel(equipo.estado)}`,
  ].join('\n');

  useEffect(() => {
    void QRCode.toDataURL(expedienteUrl, { margin: 2, width: 260 }).then(setQrDataUrl);
  }, [expedienteUrl]);

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${barcode.width}" height="${barcode.height + 34}" viewBox="0 0 ${barcode.width} ${barcode.height + 34}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${barcode.rects.map((rect) => `<rect x="${rect.x}" y="10" width="${rect.width}" height="${barcode.height}" fill="#111"/>`).join('')}
  <text x="${barcode.width / 2}" y="${barcode.height + 26}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700">${escapeSvgText(barcodeValue)}</text>
</svg>`;
  const labelBarcodeScale = Math.min(1.6, 440 / barcode.width);
  const labelBarcodeHeight = barcode.height * labelBarcodeScale;
  const labelBarcodeRects = barcode.rects
    .map((rect) => `<rect x="${42 + rect.x * labelBarcodeScale}" y="212" width="${rect.width * labelBarcodeScale}" height="${labelBarcodeHeight}" fill="#111"/>`)
    .join('');
  const labelSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="420" viewBox="0 0 760 420">
  <rect width="760" height="420" rx="24" fill="#ffffff"/>
  <rect x="18" y="18" width="724" height="384" rx="18" fill="#f8fbf3" stroke="#163d2d" stroke-width="4"/>
  <text x="380" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#082016">FACULTAD DE ECONOMIA</text>
  <text x="380" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#315543">UNIVERSIDAD AUTONOMA DE CHIRIQUI</text>
  <text x="42" y="126" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="#082016">${escapeSvgText(equipo.nombre || 'Equipo')}</text>
  <text x="42" y="152" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#315543">Inventario: ${escapeSvgText(inventoryDisplay)} | Serie: ${escapeSvgText(serialDisplay)}</text>
  <text x="42" y="176" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#315543">Ubicacion: ${escapeSvgText(equipo.ubicacion || 'Sin ubicacion')} | Estado: ${escapeSvgText(estadoNombre)}</text>
  <rect x="42" y="202" width="450" height="126" rx="12" fill="#fff" stroke="#d3dfc8"/>
  ${labelBarcodeRects}
  <text x="267" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="800" fill="#111">${escapeSvgText(barcodeValue)}</text>
  ${qrDataUrl ? `<image href="${qrDataUrl}" x="536" y="128" width="160" height="160"/>` : ''}
  <text x="616" y="316" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#082016">Escanee para ver detalle</text>
  <text x="380" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#315543">Registros Academicos - Inventario tecnico</text>
</svg>`;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article className="modal-panel lab-label-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="lab-catalog-modal-header">
          <div>
            <span className="eyebrow">Etiqueta de inventario</span>
            <h2>{equipo.nombre}</h2>
            <p>{inventoryDisplay} | Serie: {serialDisplay} | {equipo.ubicacion || 'Sin ubicacion'}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar etiqueta" onClick={onClose}>
            <XCircle size={18} />
          </button>
        </header>

        <section className="inventory-label-preview">
          <div className="inventory-label-heading">
            <strong>Universidad Autonoma de Chiriqui</strong>
            <span>Facultad de Economia</span>
            <small>Inventario tecnico</small>
          </div>
          <div className="inventory-label-body">
            <div className="barcode-box" dangerouslySetInnerHTML={{ __html: svgContent }} />
            {qrDataUrl ? <img src={qrDataUrl} alt="QR con detalle del equipo" /> : null}
          </div>
          <dl>
            <div><dt>Equipo</dt><dd>{equipo.nombre}</dd></div>
            <div><dt>Inventario</dt><dd>{inventoryDisplay}</dd></div>
            <div><dt>Serie</dt><dd>{serialDisplay}</dd></div>
            <div><dt>Ubicacion</dt><dd>{equipo.ubicacion || 'Sin ubicacion'}</dd></div>
          </dl>
        </section>

        <div className="lab-equipment-detail-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => downloadSvg(labelSvgContent, `etiqueta-inventario-${barcodeValue.replace(/\s+/g, '-')}.svg`)}
          >
            <Download size={18} />
            Descargar etiqueta completa
          </button>
          <button className="primary-button" type="button" onClick={() => downloadSvg(svgContent, `codigo-barra-${barcodeValue.replace(/\s+/g, '-')}.svg`)}>
            <Download size={18} />
            Descargar codigo de barras
          </button>
          {qrDataUrl ? (
            <a className="secondary-button" href={qrDataUrl} download={`qr-inventario-${barcodeValue.replace(/\s+/g, '-')}.png`}>
              <Download size={18} />
              Descargar QR
            </a>
          ) : null}
          <button className="secondary-button" type="button" onClick={() => void navigator.clipboard?.writeText(detalleEquipo)}>
            <Clipboard size={18} />
            Copiar detalle
          </button>
        </div>
      </article>
    </div>
  );
}
