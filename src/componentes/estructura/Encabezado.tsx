import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  MonitorCog,
  HardHat,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  Users,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { buscarGlobal, ResultadoBusqueda } from '@/servicios/busqueda.servicio';
import { listEvents } from '@/servicios/eventos.servicio';
import { listLaboratorioData } from '@/servicios/laboratorio.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime } from '@/utilidades/formato';

type EncabezadoProps = {
  onToggleMenu: () => void;
};

type TemaVisual = 'dark' | 'light';

type AvisoEncabezado = {
  id: string;
  title: string;
  description: string;
  to: string;
  kind: 'evento' | 'laboratorio' | 'prestamo';
};

function getInitialTheme(): TemaVisual {
  try {
    return localStorage.getItem('acad-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function Encabezado({ onToggleMenu }: EncabezadoProps) {
  const { profile, signOut } = useAutenticacion();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLFormElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRequest = useRef(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AvisoEncabezado[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultadoBusqueda[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState<TemaVisual>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('acad-theme', theme);
    } catch {
      // No se guarda si el navegador bloquea almacenamiento local.
    }
  }, [theme]);

  useEffect(() => {
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setIsSearchOpen(false);
      if (!notificationsRef.current?.contains(event.target as Node)) setIsNotificationsOpen(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      searchRequest.current += 1;
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    setIsSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      void buscarGlobal(searchTerm)
        .then((found) => {
          if (searchRequest.current !== requestId) return;
          setResults(found);
        })
        .catch((error) => {
          if (searchRequest.current !== requestId) return;
          setResults([]);
          setSearchError(getErrorMessage(error, 'No se pudo completar la busqueda'));
        })
        .finally(() => {
          if (searchRequest.current === requestId) setIsSearching(false);
        });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [query]);

  const canAccessLab = profile?.role === 'propietario' || profile?.role === 'admin' || profile?.role === 'soporte';
  const canSeeEventAlerts =
    profile?.role === 'propietario' || profile?.role === 'admin' || profile?.role === 'organizador';

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      if (!profile) {
        setNotifications([]);
        return;
      }

      try {
        const [eventsData, labData] = await Promise.all([
          canSeeEventAlerts ? listEvents() : Promise.resolve([] as EventoAcademico[]),
          canAccessLab ? listLaboratorioData() : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        const now = Date.now();
        const inNextSevenDays = now + 7 * 24 * 60 * 60 * 1000;
        const eventNotifications: AvisoEncabezado[] = eventsData
          .filter((event) => event.status === 'active' || event.status === 'published')
          .filter((event) => !event.startsAt || new Date(event.startsAt).getTime() <= inNextSevenDays)
          .sort((first, second) => (first.startsAt ?? '').localeCompare(second.startsAt ?? ''))
          .slice(0, 3)
          .map((event) => ({
            id: `evento-${event.id}`,
            kind: 'evento',
            title: event.status === 'active' ? 'Evento activo' : 'Evento proximo',
            description: `${event.title}${event.startsAt ? ` | ${formatDateTime(event.startsAt)}` : ''}`,
            to: `/eventos/${event.id}`,
          }));

        const labNotifications: AvisoEncabezado[] = labData
          ? [
              ...labData.bitacoras
                .filter((item) => item.estado === 'pendiente' || item.estado === 'en_proceso')
                .slice(0, 2)
                .map((item) => ({
                  id: `trabajo-${item.id}`,
                  kind: 'laboratorio' as const,
                  title: item.estado === 'pendiente' ? 'Trabajo pendiente' : 'Trabajo en proceso',
                  description: `${item.titulo || item.tipoTrabajo} | ${item.ubicacion || 'Sin ubicacion'}`,
                  to: '/laboratorio',
                })),
              ...labData.prestamos
                .filter((item) => item.estado === 'vencido' || item.estado === 'activo')
                .slice(0, 2)
                .map((item) => ({
                  id: `prestamo-${item.id}`,
                  kind: 'prestamo' as const,
                  title: item.estado === 'vencido' ? 'Prestamo vencido' : 'Prestamo activo',
                  description: `${item.equipo} | ${item.entregadoA}`,
                  to: '/laboratorio',
                })),
            ]
          : [];

        setNotifications([...labNotifications, ...eventNotifications].slice(0, 6));
        setNotificationsError(null);
      } catch (error) {
        if (!isMounted) return;
        setNotifications([]);
        setNotificationsError(getErrorMessage(error, 'No se pudieron cargar las notificaciones'));
      }
    }

    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [canAccessLab, canSeeEventAlerts, profile]);

  async function handleSignOut() {
    setIsUserMenuOpen(false);
    await signOut();
  }

  function handleAccount() {
    setIsUserMenuOpen(false);
    navigate('/mi-cuenta');
  }

  function openResult(result: ResultadoBusqueda) {
    setIsSearchOpen(false);
    setQuery('');
    navigate(result.to);
  }

  function openNotification(notification: AvisoEncabezado) {
    setIsNotificationsOpen(false);
    navigate(notification.to);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) openResult(results[0]);
  }

  function getResultIcon(result: ResultadoBusqueda) {
    if (result.kind === 'evento') return <CalendarDays size={17} />;
    if (result.kind === 'asistencia') return <ClipboardCheck size={17} />;
    return <Users size={17} />;
  }

  function getNotificationIcon(notification: AvisoEncabezado) {
    if (notification.kind === 'evento') return <CalendarDays size={17} />;
    if (notification.kind === 'prestamo') return <ClipboardCheck size={17} />;
    return <MonitorCog size={17} />;
  }

  const isLightTheme = theme === 'light';
  const notificationCount = useMemo(() => notifications.length, [notifications]);

  return (
    <header className="topbar">
      <button className="icon-button menu-button" type="button" aria-label="Mostrar u ocultar menu" onClick={onToggleMenu}>
        <Menu size={19} />
      </button>
      {canAccessLab ? (
        <button className="lab-entry-button" type="button" onClick={() => navigate('/laboratorio')}>
          <HardHat size={18} />
          <span>Soporte tecnico</span>
        </button>
      ) : null}
      <form className="global-search" onSubmit={handleSearchSubmit} ref={searchRef}>
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="Buscar"
            placeholder="Buscar evento, participante o asistencia"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsSearchOpen(false);
            }}
          />
        </div>
        {isSearchOpen && query.trim().length >= 2 ? (
          <section className="global-search-results" aria-live="polite">
            {isSearching ? <p>Buscando coincidencias...</p> : null}
            {searchError ? <p className="form-error">{searchError}</p> : null}
            {!isSearching && !searchError && results.length === 0 ? <p>No se encontraron resultados.</p> : null}
            {results.length > 0 ? (
              <div className="global-search-list">
                {results.map((result) => (
                  <button key={result.id} type="button" onClick={() => openResult(result)}>
                    <span className={`global-search-icon ${result.kind}`}>{getResultIcon(result)}</span>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </form>
      <div className="topbar-actions">
        <button
          className="icon-button theme-toggle"
          type="button"
          aria-label={isLightTheme ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
          title={isLightTheme ? 'Tema oscuro' : 'Tema claro'}
          onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        >
          {isLightTheme ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="notifications-menu" ref={notificationsRef}>
          <button
            className="icon-button notification-button"
            type="button"
            aria-label="Notificaciones"
            aria-expanded={isNotificationsOpen}
            aria-haspopup="dialog"
            onClick={() => setIsNotificationsOpen((value) => !value)}
          >
            <Bell size={18} />
            {notificationCount > 0 ? <span className="notification-badge">{notificationCount}</span> : null}
          </button>
          {isNotificationsOpen ? (
            <section className="notifications-popover" aria-live="polite">
              <div className="notifications-heading">
                <div>
                  <strong>Notificaciones</strong>
                  <span>{notificationCount > 0 ? `${notificationCount} avisos pendientes` : 'Todo tranquilo por ahora'}</span>
                </div>
              </div>
              {notificationsError ? <p className="form-error">{notificationsError}</p> : null}
              {!notificationsError && notifications.length === 0 ? (
                <p className="notifications-empty">No hay avisos importantes en este momento.</p>
              ) : null}
              {notifications.length > 0 ? (
                <div className="notifications-list">
                  {notifications.map((notification) => (
                    <button
                      className={`notification-item ${notification.kind}`}
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                    >
                      <span>{getNotificationIcon(notification)}</span>
                      <span>
                        <strong>{notification.title}</strong>
                        <small>{notification.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
        <div className="user-menu">
          <button
            className="user-chip"
            type="button"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsUserMenuOpen((value) => !value)}
          >
            <span>{profile?.fullName ?? 'Usuario'}</span>
            <strong>{profile?.role ?? 'admin'}</strong>
          </button>
          {isUserMenuOpen ? (
            <div className="user-menu-popover" role="menu">
              <button type="button" role="menuitem" onClick={handleAccount}>
                <KeyRound size={17} />
                Cambiar contrasena
              </button>
              <button type="button" role="menuitem" onClick={() => void handleSignOut()}>
                <LogOut size={17} />
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
