// Enlaces entre las dos aplicaciones. Cada config de Vite define dónde vive cada app
// (en GitHub Pages: /Rastreo/compartir/ y /Rastreo/monitoreo/; en desarrollo, puertos distintos).

const absolute = (path: string) => new URL(path, window.location.origin).toString();

export const compartirUrl = (): string => absolute(__COMPARTIR_URL__);
export const monitoreoUrl = (): string => absolute(__MONITOREO_URL__);

/** Enlace de invitación: abre la app de monitoreo directamente en "unirse". */
export function inviteLink(code: string): string {
  return `${monitoreoUrl()}#/unirse?codigo=${encodeURIComponent(code)}`;
}
