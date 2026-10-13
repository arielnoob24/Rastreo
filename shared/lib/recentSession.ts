// Recuerda la última sesión abierta en este dispositivo, solo como atajo. No guarda ubicaciones.
// Cada app guarda la suya: la de quien comparte y la de quien monitorea son independientes.
export type AppName = 'compartir' | 'monitoreo';

const key = (app: AppName) => `rastreo:${app}:ultima-sesion`;

export function rememberSession(app: AppName, id: string): void {
  try {
    localStorage.setItem(key(app), id);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function recentSession(app: AppName): string | null {
  try {
    return localStorage.getItem(key(app));
  } catch {
    return null;
  }
}

export function forgetSession(app: AppName): void {
  try {
    localStorage.removeItem(key(app));
  } catch {
    /* almacenamiento no disponible */
  }
}
