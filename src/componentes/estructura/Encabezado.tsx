import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, ClipboardCheck, KeyRound, LogOut, Menu, Moon, Search, Sun, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { buscarGlobal, ResultadoBusqueda } from '@/servicios/busqueda.servicio';
import { getErrorMessage } from '@/utilidades/errores';

type EncabezadoProps = {
  onToggleMenu: () => void;
};

type TemaVisual = 'dark' | 'light';

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
  const searchRequest = useRef(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setIsSearchOpen(false);
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

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) openResult(results[0]);
  }

  function getResultIcon(result: ResultadoBusqueda) {
    if (result.kind === 'evento') return <CalendarDays size={17} />;
    if (result.kind === 'asistencia') return <ClipboardCheck size={17} />;
    return <Users size={17} />;
  }

  const isLightTheme = theme === 'light';

  return (
    <header className="topbar">
      <button className="icon-button menu-button" type="button" aria-label="Mostrar u ocultar menu" onClick={onToggleMenu}>
        <Menu size={19} />
      </button>
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
        <button className="icon-button" aria-label="Notificaciones">
          <Bell size={18} />
        </button>
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
