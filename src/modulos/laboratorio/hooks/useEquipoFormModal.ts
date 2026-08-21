import { useState } from 'react';
import type { EquipoLaboratorio, AsignacionComponenteLaboratorio } from '@/tipos/dominio';
import type { ComponenteNuevoDraft } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

function createComponenteNuevoDraft(tipo: AsignacionComponenteLaboratorio['tipo'] = 'monitor'): ComponenteNuevoDraft {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tipo };
}

function useEquipoFormModal() {
  const [editingEquipo, setEditingEquipo] = useState<EquipoLaboratorio | null>(null);
  const [showEquipoFormModal, setShowEquipoFormModal] = useState(false);
  const [componentesNuevoEquipo, setComponentesNuevoEquipo] = useState<ComponenteNuevoDraft[]>([]);

  function openNuevoEquipoModal() {
    setEditingEquipo(null);
    setComponentesNuevoEquipo([]);
    setShowEquipoFormModal(true);
  }

  function openEditarEquipoModal(equipo: EquipoLaboratorio) {
    setEditingEquipo(equipo);
    setComponentesNuevoEquipo([]);
    setShowEquipoFormModal(true);
  }

  function closeEquipoFormModal() {
    setShowEquipoFormModal(false);
    setEditingEquipo(null);
    setComponentesNuevoEquipo([]);
  }

  function addComponenteNuevo(tipo: AsignacionComponenteLaboratorio['tipo'] = 'monitor') {
    setComponentesNuevoEquipo((current) => [...current, createComponenteNuevoDraft(tipo)]);
  }

  function removeComponenteNuevo(id: string) {
    setComponentesNuevoEquipo((current) => current.filter((item) => item.id !== id));
  }

  function updateComponenteNuevoTipo(id: string, tipo: AsignacionComponenteLaboratorio['tipo']) {
    setComponentesNuevoEquipo((current) => current.map((item) => (item.id === id ? { ...item, tipo } : item)));
  }

  return {
    addComponenteNuevo,
    closeEquipoFormModal,
    componentesNuevoEquipo,
    editingEquipo,
    openEditarEquipoModal,
    openNuevoEquipoModal,
    removeComponenteNuevo,
    showEquipoFormModal,
    updateComponenteNuevoTipo,
  };
}

export { useEquipoFormModal };
