import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LocationFix } from '../lib/geo';

const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Icono propio: los iconos por defecto de Leaflet no resuelven sus imágenes con bundlers.
const markerIcon = (stale: boolean) =>
  L.divIcon({
    className: '',
    html: `<span class="map-marker${stale ? ' map-marker--stale' : ''}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const DEFAULT_CENTER: [number, number] = [0, 0];

function FollowPosition({ position, follow, onUserMove }: {
  position: [number, number] | null;
  follow: boolean;
  onUserMove: () => void;
}) {
  const map = useMap();
  const [centeredOnce, setCenteredOnce] = useState(false);

  useMapEvents({ dragstart: onUserMove });

  useEffect(() => {
    if (!position) return;
    if (!centeredOnce) {
      map.setView(position, 16);
      setCenteredOnce(true);
    } else if (follow) {
      map.panTo(position);
    }
  }, [map, position, follow, centeredOnce]);

  return null;
}

interface Props {
  fix: LocationFix | null;
  trail: Array<[number, number]>;
  stale: boolean;
}

export function MapView({ fix, trail, stale }: Props) {
  const [follow, setFollow] = useState(true);
  const position: [number, number] | null = fix ? [fix.latitude, fix.longitude] : null;

  return (
    <div className="map-wrap">
      <MapContainer center={position ?? DEFAULT_CENTER} zoom={position ? 16 : 2} className="map" scrollWheelZoom>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        {trail.length > 1 ? <Polyline positions={trail} pathOptions={{ color: '#0f766e', weight: 4, opacity: 0.6 }} /> : null}
        {position && fix?.accuracy ? (
          <Circle center={position} radius={fix.accuracy} pathOptions={{ color: '#0f766e', weight: 1, fillOpacity: 0.12 }} />
        ) : null}
        {position ? <Marker position={position} icon={markerIcon(stale)} /> : null}
        <FollowPosition position={position} follow={follow} onUserMove={() => setFollow(false)} />
      </MapContainer>
      {position && !follow ? (
        <button type="button" className="btn btn--small map-recenter" onClick={() => setFollow(true)}>
          Centrar
        </button>
      ) : null}
    </div>
  );
}
