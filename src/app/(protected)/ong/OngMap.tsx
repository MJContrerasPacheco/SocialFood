"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Icon,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  TileLayer,
} from "leaflet";
import { useI18n } from "@/components/I18nProvider";

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
  const { t } = useI18n();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, Marker>>(new Map());
  const leafletModuleRef = useRef<typeof import("leaflet") | null>(null);
  const markerIconRef = useRef<Icon | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const fallbackLayerRef = useRef<TileLayer | null>(null);
  const [tileReady, setTileReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [tileCount, setTileCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const center = useMemo(() => {
    if (centerLat !== null && centerLng !== null) {
      return [centerLat, centerLng] as [number, number];
    }
    if (markers.length > 0) {
      return [markers[0].lat, markers[0].lng] as [number, number];
    }
    return [40.4168, -3.7038] as [number, number];
  }, [centerLat, centerLng, markers]);
  const markersSignature = useMemo(() => {
    return markers
      .map((item) => `${item.id}:${item.lat.toFixed(6)}:${item.lng.toFixed(6)}`)
      .join("|");
  }, [markers]);
  const centerSignature = `${center[0].toFixed(6)},${center[1].toFixed(6)}`;
  const markersRef = useRef<MarkerItem[]>(markers);
  const centerRef = useRef<[number, number]>(center);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    const markerMap = markerMapRef.current;
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerLayerRef.current = null;
      markerMap.clear();
      tileLayerRef.current = null;
      fallbackLayerRef.current = null;
      setTileReady(false);
      setTileError(false);
      setTileCount(0);
      setMapReady(false);
    };
  }, []);

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

      const mapCenter = centerRef.current;
      const markerItems = markersRef.current;

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
          center: mapCenter,
          zoom: centerLat !== null && centerLng !== null ? 11 : 5,
          scrollWheelZoom: false,
        });
        mapInstanceRef.current.whenReady(() => {
          mapInstanceRef.current?.invalidateSize();
          setMapReady(true);
        });

        if (!tileLayerRef.current) {
          const baseLayer = L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxZoom: 19,
              crossOrigin: true,
            }
          );
          baseLayer.on("tileload", () => {
            setTileReady(true);
            setTileError(false);
            setTileCount((count) => count + 1);
          });
          baseLayer.on("tileerror", () => {
            setTileError(true);
            if (!fallbackLayerRef.current && mapInstanceRef.current) {
              fallbackLayerRef.current = L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                {
                  attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                  maxZoom: 19,
                  crossOrigin: true,
                }
              )
                .on("tileload", () => {
                  setTileReady(true);
                  setTileError(false);
                  setTileCount((count) => count + 1);
                })
                .on("tileerror", () => {
                  setTileError(true);
                })
                .addTo(mapInstanceRef.current);
            }
          });
          baseLayer.addTo(mapInstanceRef.current);
          tileLayerRef.current = baseLayer;
        }
      } else {
        mapInstanceRef.current.setView(mapCenter);
      }

      if (!markerLayerRef.current) {
        markerLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      }

      markerLayerRef.current.clearLayers();
      markerMapRef.current.clear();
      markerItems.forEach((item) => {
        const marker = L.marker([item.lat, item.lng], {
          icon: markerIconRef.current ?? undefined,
        })
          .addTo(markerLayerRef.current as LayerGroup)
          .bindPopup(item.title);
        markerMapRef.current.set(item.id, marker);
      });

      requestAnimationFrame(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 120);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        const container = mapInstanceRef.current?.getContainer();
        if (container) {
          const tiles = container.querySelectorAll(".leaflet-tile").length;
          if (tiles > 0) {
            setTileCount((count) => Math.max(count, tiles));
          }
        }
      }, 480);
    };

    void ensureMap();
    return () => {
      cancelled = true;
    };
  }, [centerSignature, markersSignature, centerLat, centerLng]);

  useEffect(() => {
    if (selectedMarkerId || !mapInstanceRef.current) {
      return;
    }

    const L = leafletModuleRef.current;
    if (!L) {
      return;
    }

    const markerItems = markersRef.current;
    if (markerItems.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      markerItems.map((item) => [item.lat, item.lng] as [number, number])
    );
    mapInstanceRef.current.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 13,
    });
  }, [markersSignature, selectedMarkerId]);

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

  const firstMarker = markers[0];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: 360, minHeight: 360 }}
    >
      <div ref={mapRef} className="h-full w-full" />
      {tileError && !tileReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-slate-600">
          {t.map.loadError}
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm">
        <div>
          {t.map.tilesLabel}: {tileCount} -
          {tileReady ? ` ${t.map.tilesOk}` : ` ${t.map.tilesMissing}`}
        </div>
        <div>
          {t.map.mapLabel}: {mapReady ? t.map.mapOk : t.map.mapInit}
        </div>
        <div>
          {t.map.markersLabel}: {markers.length}
        </div>
        <div>
          {t.map.firstLabel}: {firstMarker ? `${firstMarker.lat.toFixed(4)}, ${firstMarker.lng.toFixed(4)}` : "--"}
        </div>
      </div>
    </div>
  );
}
