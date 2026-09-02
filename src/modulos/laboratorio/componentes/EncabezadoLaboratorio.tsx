import { ArrowLeft, ClipboardList, HardDrive, Moon, PackageCheck, ScanLine, Sun, Wrench } from 'lucide-react';
import { MenuNotificaciones } from '@/componentes/estructura/MenuNotificaciones';

type IndicadoresLaboratorio = {
  trabajosAbiertos: number;
  equiposPendientes: number;
  prestamosActivos: number;
  evidencias: number;
};

type EncabezadoLaboratorioProps = {
  indicadores: IndicadoresLaboratorio;
  isLightTheme: boolean;
  onBack: () => void;
  onOpenScanner: () => void;
  onToggleTheme: () => void;
};

export function EncabezadoLaboratorio({
  indicadores,
  isLightTheme,
  onBack,
  onOpenScanner,
  onToggleTheme,
}: EncabezadoLaboratorioProps) {
  return (
    <header className="lab-workspace-header">
      <button className="secondary-button" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Volver al sistema
      </button>
      <div className="lab-workspace-title">
        <span className="eyebrow">Area exclusiva de soporte</span>
        <h1>Mantenimiento tecnico</h1>
        <p>Bitacoras, inventario, evidencias, prestamos e informes del laboratorio de informatica.</p>
      </div>
      <div className="lab-header-side">
        <div className="lab-header-actions">
          <button className="lab-scan-button" type="button" onClick={onOpenScanner}>
            <ScanLine size={18} />
            Escanear equipo
          </button>
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={isLightTheme ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
            title={isLightTheme ? 'Tema oscuro' : 'Tema claro'}
            onClick={onToggleTheme}
          >
            {isLightTheme ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <MenuNotificaciones />
          <div className="lab-workspace-badge">
            <Wrench size={18} />
            Modo tecnico
          </div>
        </div>
        <div className="lab-quick-stats" aria-label="Resumen rapido de laboratorio">
          <div>
            <Wrench size={16} />
            <span>Trabajos abiertos</span>
            <strong>{indicadores.trabajosAbiertos}</strong>
          </div>
          <div>
            <HardDrive size={16} />
            <span>Equipos no operativos</span>
            <strong>{indicadores.equiposPendientes}</strong>
          </div>
          <div>
            <PackageCheck size={16} />
            <span>Prestamos activos</span>
            <strong>{indicadores.prestamosActivos}</strong>
          </div>
          <div>
            <ClipboardList size={16} />
            <span>Evidencias registradas</span>
            <strong>{indicadores.evidencias}</strong>
          </div>
        </div>
      </div>
    </header>
  );
}
