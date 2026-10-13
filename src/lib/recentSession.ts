// Recuerda la última sesión abierta en este dispositivo, solo como atajo. No guarda ubicaciones.
const KEY = 'rastreo:ultima-sesion';

export function rememberSession(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function recentSession(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function forgetSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}
