export function PieLegal() {
  const year = new Date().getFullYear();

  return (
    <footer className="legal-footer">
      <small>
        &copy; {year} InformaticsPro Services | J.A. | Todos los derechos reservados |{' '}
        <a href="mailto:informaticsproservices@gmail.com">informaticsproservices@gmail.com</a>
      </small>
    </footer>
  );
}
