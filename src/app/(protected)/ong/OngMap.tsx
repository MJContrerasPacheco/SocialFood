"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Icon, LayerGroup, Map as LeafletMap, Marker } from "leaflet";

type MarkerItem = {
  id: string;
  title: string;
  lat: number;
  lng: number;
};

type OngMapProps = {
  centerLat: number | null;
  centerLng: number | null;
  markers: MarkerItem[];
  selectedMarkerId?: string | null;
};

export default function OngMap({
  centerLat,
  centerLng,
  markers,
  selectedMarkerId,
}: OngMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, Marker>>(new Map());
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const markerIconRef = useRef<Icon | null>(null);
  const center = useMemo(() => {
    if (centerLat !== null && centerLng !== null) {
      return [centerLat, centerLng] as [number, number];
    }
    if (markers.length > 0) {
      return [markers[0].lat, markers[0].lng] as [number, number];
    }
    return [40.4168, -3.7038] as [number, number];
  }, [centerLat, centerLng, markers]);

  useEffect(() => {
    let cancelled = false;
    const ensureMap = async () => {
      if (!mapRef.current) {
        return;
      }

      if (!leafletModuleRef.current) {
        leafletModuleRef.current = await import("leaflet");
      }

      const L = leafletModuleRef.current;
      if (!L || cancelled) {
        return;
      }

      if (!markerIconRef.current) {
        markerIconRef.current = new L.Icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
      }

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center,
          zoom: centerLat !== null && centerLng !== null ? 11 : 5,
          scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapInstanceRef.current);
      } else {
        mapInstanceRef.current.setView(center);
      }

      if (!markerLayerRef.current) {
        markerLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      }

      markerLayerRef.current.clearLayers();
      markerMapRef.current.clear();
      markers.forEach((item) => {
        const marker = L.marker([item.lat, item.lng], {
          icon: markerIconRef.current ?? undefined,
        })
          .addTo(markerLayerRef.current as LayerGroup)
          .bindPopup(item.title);
        markerMapRef.current.set(item.id, marker);
      });
    };

    void ensureMap();
    return () => {
      cancelled = true;
    };
  }, [center, centerLat, centerLng, markers]);

  useEffect(() => {
    if (!selectedMarkerId || !mapInstanceRef.current) {
      return;
    }

    const marker = markerMapRef.current.get(selectedMarkerId);
    if (!marker) {
      return;
    }

    mapInstanceRef.current.setView(marker.getLatLng(), 13, { animate: true });
    marker.openPopup();
  }, [selectedMarkerId]);

  return (
    <div className="h-[360px] w-full overflow-hidden rounded-2xl">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
