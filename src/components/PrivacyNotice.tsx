export function PrivacyNotice() {
  return (
    <details className="privacy">
      <summary>¿Quién ve mi ubicación y por cuánto tiempo?</summary>
      <ul>
        <li>Solo la persona que aceptó tu invitación puede verla, y solo mientras la sesión esté vigente.</li>
        <li>Se comparte únicamente después de pulsar <strong>Iniciar</strong>, y deja de enviarse al pulsar <strong>Detener</strong>.</li>
        <li>Solo se guarda la última posición (latitud, longitud, precisión, altitud si existe y hora). No hay historial.</li>
        <li>Al detener, terminar o vencer la sesión, la última posición se borra del servidor.</li>
        <li>
          Con la pantalla bloqueada o la app cerrada, el teléfono puede pausar el envío. No garantizamos seguimiento
          continuo en segundo plano.
        </li>
      </ul>
    </details>
  );
}
