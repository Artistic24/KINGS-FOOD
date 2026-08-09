import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: number;
}

// Cameroon centre
const DEFAULT = { lat: 4.0511, lng: 9.7679, zoom: 6 }; // Douala-ish

export function MapPicker({ lat, lng, onChange, readOnly, height = 320 }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // fix marker icons
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !containerRef.current || mapRef.current) return;

      const startLat = lat ?? DEFAULT.lat;
      const startLng = lng ?? DEFAULT.lng;
      const map = L.map(containerRef.current).setView(
        [startLat, startLng],
        lat && lng ? 14 : DEFAULT.zoom,
      );
      mapRef.current = map;

      // Satellite imagery (Esri World Imagery)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          maxZoom: 19,
        },
      ).addTo(map);
      // Labels overlay for streets & town names on top of satellite
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.9 },
      ).addTo(map);

      const m = L.marker([startLat, startLng], { draggable: !readOnly }).addTo(map);
      markerRef.current = m;

      if (!readOnly) {
        m.on("dragend", () => {
          const p = m.getLatLng();
          onChange(p.lat, p.lng);
        });
        map.on("click", (e: any) => {
          // Ignore taps on a zoomed-out map — they are almost always accidental
          // and would drop the delivery pin kilometres from the real address.
          if (map.getZoom() < 13) {
            map.setView(e.latlng, 16);
            return;
          }
          m.setLatLng(e.latlng);
          onChange(e.latlng.lat, e.latlng.lng);
        });

      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes
  useEffect(() => {
    if (markerRef.current && lat != null && lng != null) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 13));
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-2xl border border-border"
    />
  );
}
