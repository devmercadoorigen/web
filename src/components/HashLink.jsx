import { Link, useLocation } from 'react-router';

/**
 * Enlace a una sección del home (#tienda, #kits…).
 * En el home se comporta como un ancla normal (Lenis la intercepta y hace scroll suave);
 * desde cualquier otra ruta navega a "/#seccion" y el home hace el scroll al montar.
 * @param {{ to: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>} props
 */
export function HashLink({ to, children, ...rest }) {
  const { pathname } = useLocation();
  if (pathname === '/') return <a href={to} {...rest}>{children}</a>;
  return <Link to={`/${to}`} {...rest}>{children}</Link>;
}
