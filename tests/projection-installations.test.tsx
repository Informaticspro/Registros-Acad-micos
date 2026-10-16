// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { InstalacionesPantalla } from '../src/modulos/laboratorio/componentes/bitacoras/InstalacionesPantalla';
import { buildBitacoraInput } from '../src/modulos/laboratorio/utilidades/formularios-laboratorio.utilidades';
import { TIPO_INSTALACION_PANTALLA } from '../src/modulos/laboratorio/constantes/laboratorio.constantes';

afterEach(cleanup);

test('records the requester and installation without requiring an inventory item', () => {
  const save = vi.fn();
  render(<InstalacionesPantalla trabajos={[]} responsable="Técnico" isSaving={false} onBack={vi.fn()} onEdit={vi.fn()}
    onSubmit={event => { event.preventDefault(); save(buildBitacoraInput(event.currentTarget)); }} />);
  fireEvent.change(screen.getByLabelText('Solicitante *'), { target: { value: 'Docente' } });
  fireEvent.change(screen.getByLabelText('Aula, departamento o lugar de instalación *'), { target: { value: 'Salón 3H' } });
  fireEvent.change(screen.getByLabelText('Actividad o motivo *'), { target: { value: 'Seminario' } });
  fireEvent.change(screen.getByLabelText('Detalle del trabajo *'), { target: { value: 'Pantalla instalada y probada.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar instalación' }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({
    tipoTrabajo: TIPO_INSTALACION_PANTALLA, equipoId: '', equipoDestino: 'Pantalla de proyección',
    ubicacion: 'Salón 3H', responsable: 'Técnico', estado: 'cerrado',
    descripcion: 'Solicitante: Docente\n\nPantalla instalada y probada.',
  }));
});
