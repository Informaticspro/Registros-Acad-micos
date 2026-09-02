import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, ClipboardCheck, MonitorCog } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { listEvents } from '@/servicios/eventos.servicio';
import { listLaboratorioData } from '@/servicios/laboratorio.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';
import { formatDateTime } from '@/utilidades/formato';

type AvisoEncabezado = {
  id: string;
  title: string;
  description: string;
  to: string;
  kind: 'evento' | 'laboratorio' | 'prestamo';
};

function getReadNotificationIds(profileId?: string) {
  if (!profileId) return new Set<string>();

  try {
    const stored = localStorage.getItem(`acad-read-notifications-${profileId}`);
    const values = stored ? (JSON.parse(stored) as string[]) : [];
    return new Set(values);
  } catch {
    return new Set<string>();
  }
}

function saveReadNotificationIds(profileId: string, ids: Set<string>) {
  try {
    localStorage.setItem(`acad-read-notifications-${profileId}`, JSON.stringify([...ids].slice(-80)));
  } catch {
    // Si el navegador bloquea localStorage, las notificaciones siguen funcionando sin contador persistente.
  }
}

export function MenuNotificaciones() {
  const { profile } = useAutenticacion();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AvisoEncabezado[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => getReadNotificationIds(profile?.id));
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const canAccessLab = profile?.role === 'propietario' || profile?.role === 'admin' || profile?.role === 'soporte';
  const canSeeEventAlerts =
    profile?.role === 'propietario' || profile?.role === 'admin' || profile?.role === 'organizador';

  useEffect(() => {
    setReadNotificationIds(getReadNotificationIds(profile?.id));
  }, [profile?.id]);

  useEffect(() => {
    setIsNotificationsOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) setIsNotificationsOpen(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
            id: `evento-${event.id}-${event.status}-${event.startsAt ?? 'sin-fecha'}`,
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
                  id: `trabajo-${item.id}-${item.estado}`,
                  kind: 'laboratorio' as const,
                  title: item.estado === 'pendiente' ? 'Trabajo pendiente' : 'Trabajo en proceso',
                  description: `${item.titulo || item.tipoTrabajo} | ${item.ubicacion || 'Sin ubicacion'}`,
                  to: '/laboratorio',
                })),
              ...labData.prestamos
                .filter((item) => item.estado === 'vencido' || item.estado === 'activo')
                .slice(0, 2)
                .map((item) => ({
                  id: `prestamo-${item.id}-${item.estado}`,
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

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readNotificationIds.has(notification.id)),
    [notifications, readNotificationIds],
  );

  const notificationCount = unreadNotifications.length;

  function markNotificationsAsRead(nextNotifications: AvisoEncabezado[]) {
    if (!profile?.id || nextNotifications.length === 0) return;

    const nextReadIds = new Set(readNotificationIds);
    nextNotifications.forEach((notification) => nextReadIds.add(notification.id));
    setReadNotificationIds(nextReadIds);
    saveReadNotificationIds(profile.id, nextReadIds);
  }

  function toggleNotifications() {
    setIsNotificationsOpen((current) => {
      const nextValue = !current;
      if (nextValue) markNotificationsAsRead(notifications);
      return nextValue;
    });
  }

  function openNotification(notification: AvisoEncabezado) {
    markNotificationsAsRead([notification]);
    setIsNotificationsOpen(false);
    navigate(notification.to);
  }

  function getNotificationIcon(notification: AvisoEncabezado) {
    if (notification.kind === 'evento') return <CalendarDays size={17} />;
    if (notification.kind === 'prestamo') return <ClipboardCheck size={17} />;
    return <MonitorCog size={17} />;
  }

  return (
    <div className="notifications-menu" ref={notificationsRef}>
      <button
        className="icon-button notification-button"
        type="button"
        aria-label="Notificaciones"
        aria-expanded={isNotificationsOpen}
        aria-haspopup="dialog"
        onClick={toggleNotifications}
      >
        <Bell size={18} />
        {notificationCount > 0 ? <span className="notification-badge">{notificationCount}</span> : null}
      </button>
      {isNotificationsOpen ? (
        <section className="notifications-popover" aria-live="polite">
          <div className="notifications-heading">
            <div>
              <strong>Notificaciones</strong>
              <span>{notificationCount > 0 ? `${notificationCount} avisos nuevos` : 'Sin avisos nuevos'}</span>
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
                  className={`notification-item ${notification.kind} ${
                    readNotificationIds.has(notification.id) ? 'is-read' : 'is-unread'
                  }`}
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
  );
}
