import { useEffect, useRef } from "react";

type Marker = {
  lat: number;
  lng: number;
  label?: string;
  color?: "red" | "blue" | "green" | "yellow";
  title?: string;
};

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Marker[];
  height?: number | string;
  onClick?: (lat: number, lng: number) => void;
  drawLineBetween?: boolean;
  /** Encoded polyline (Google encoded polyline algorithm) to render as the route. */
  routePolyline?: string | null;
  /** Map type. Defaults to hybrid (satellite + labels). */
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
  className?: string;
  /** If true, keep the map centered on the first marker every update (live tracking). */
  followFirstMarker?: boolean;
  /** Raw path of {lat,lng} points to render as a polyline (used for replaying a saved route). */
  pathPoints?: Array<{ lat: number; lng: number }>;
  /** Change this value to force the map to re-fit its bounds to the current markers. */
  refitKey?: string | number;
  /** 3D navigation arrow showing live position + travel direction (degrees clockwise from north). */
  navArrow?: { lat: number; lng: number; heading: number } | null;
  /** Rotate the map so the direction of travel is always "up" (Google-Maps-style navigation). */
  rotateWithHeading?: boolean;
  /** Camera tilt in degrees (45 gives the 3D look). */
  tilt?: number;
}

let loaderPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      reject(new Error("Google Maps browser key missing"));
      return;
    }
    (window as any).__initGoogleMapsCb = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places,geometry&callback=__initGoogleMapsCb${channel ? `&channel=${channel}` : ""}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function GoogleMap({
  center,
  zoom = 16,
  markers = [],
  height = 320,
  onClick,
  drawLineBetween,
  routePolyline,
  mapType = "hybrid",
  className,
  followFirstMarker,
  pathPoints,
  refitKey,
  navArrow,
  rotateWithHeading,
  tilt = 45,
}: GoogleMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const polyRef = useRef<any>(null);
  const routePolyRef = useRef<any>(null);
  const arrowRef = useRef<any>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current || mapRef.current) return;
        const g = (window as any).google;
        mapRef.current = new g.maps.Map(ref.current, {
          center,
          zoom,
          mapTypeId: mapType,
          tilt,
          disableDefaultUI: false,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: g.maps.MapTypeControlStyle.DROPDOWN_MENU,
            mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
          },
          zoomControl: true,
          gestureHandling: "greedy",
        });
        if (onClick) {
          mapRef.current.addListener("click", (e: any) => onClick(e.latLng.lat(), e.latLng.lng()));
        }
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fittedRef.current = false;
  }, [refitKey]);

  useEffect(() => {
    const g = (window as any).google;
    if (!g || !mapRef.current) return;

    // Reuse markers when count matches to avoid flicker; otherwise rebuild.
    const colorMap: Record<string, string> = {
      red: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      blue: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      green: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      yellow: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
    };

    if (markerRefs.current.length === markers.length) {
      markers.forEach((m, i) => {
        const existing = markerRefs.current[i];
        existing.setPosition({ lat: m.lat, lng: m.lng });
        existing.setTitle(m.title || m.label || "");
      });
    } else {
      markerRefs.current.forEach((m) => m.setMap(null));
      markerRefs.current = markers.map((m) =>
        new g.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: mapRef.current,
          title: m.title || m.label,
          label: m.label ? { text: m.label, color: "#fff", fontWeight: "bold" } : undefined,
          icon:
            m.color === "red"
              ? {
                  path: "M12 0C7.03 0 3 4.03 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9zm0 12.5A3.5 3.5 0 1 1 12 5.5a3.5 3.5 0 0 1 0 7z",
                  fillColor: "#e11d48",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  scale: 1.9,
                  anchor: new g.maps.Point(12, 24),
                  labelOrigin: new g.maps.Point(12, 9),
                }
              : m.color
                ? colorMap[m.color]
                : undefined,
        }),
      );
    }

    // Straight-line fallback between markers
    if (polyRef.current) polyRef.current.setMap(null);
    if (drawLineBetween && !routePolyline && markers.length >= 2) {
      polyRef.current = new g.maps.Polyline({
        path: markers.map((m) => ({ lat: m.lat, lng: m.lng })),
        geodesic: true,
        strokeColor: "#2563eb",
        strokeOpacity: 0.7,
        strokeWeight: 4,
        map: mapRef.current,
      });
    }

    // Actual route polyline (Google encoded polyline) OR raw path points
    if (routePolyRef.current) routePolyRef.current.setMap(null);
    let pathForPoly: Array<{ lat: number; lng: number }> | null = null;
    if (routePolyline && g.maps.geometry?.encoding) {
      try { pathForPoly = g.maps.geometry.encoding.decodePath(routePolyline).map((p: any) => ({ lat: p.lat(), lng: p.lng() })); }
      catch (e) { console.warn("Failed to decode route polyline", e); }
    } else if (pathPoints && pathPoints.length >= 2) {
      pathForPoly = pathPoints;
    }
    if (pathForPoly) {
      routePolyRef.current = new g.maps.Polyline({
        path: pathForPoly,
        geodesic: true,
        strokeColor: "#1a73e8",
        strokeOpacity: 0,
        strokeWeight: 6,
        icons: [
          {
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: "#1a73e8",
              fillOpacity: 1,
              strokeColor: "#1a73e8",
              strokeOpacity: 1,
              strokeWeight: 1,
            },
            offset: "0",
            repeat: "16px",
          },
        ],
        map: mapRef.current,
      });
    }

    if (markers.length > 0) {
      if (followFirstMarker) {
        // Keep the map centered on the moving rider without changing zoom.
        mapRef.current.panTo({ lat: markers[0].lat, lng: markers[0].lng });
      } else if (!fittedRef.current) {
        if (markers.length === 1) {
          mapRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
        } else {
          const bounds = new g.maps.LatLngBounds();
          markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
          mapRef.current.fitBounds(bounds, 80);
        }
        fittedRef.current = true;
      }
    }
  }, [markers, drawLineBetween, routePolyline, followFirstMarker, pathPoints, refitKey]);

  // Live 3D navigation arrow + camera rotation.
  useEffect(() => {
    const g = (window as any).google;
    if (!g || !mapRef.current) return;
    if (!navArrow) {
      if (arrowRef.current) { arrowRef.current.setMap(null); arrowRef.current = null; }
      return;
    }
    const icon = {
      path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 8,
      fillColor: "#1a73e8",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      rotation: navArrow.heading,
      anchor: new g.maps.Point(0, 2.6),
    };
    const pos = { lat: navArrow.lat, lng: navArrow.lng };
    if (!arrowRef.current) {
      arrowRef.current = new g.maps.Marker({ position: pos, map: mapRef.current, icon, zIndex: 9999, optimized: false });
    } else {
      arrowRef.current.setPosition(pos);
      arrowRef.current.setIcon(icon);
    }
    if (rotateWithHeading) {
      mapRef.current.panTo(pos);
      try {
        mapRef.current.setHeading(navArrow.heading);
        mapRef.current.setTilt(tilt);
      } catch { /* raster tiles may not support rotation */ }
    }
  }, [navArrow, rotateWithHeading, tilt]);

  return <div ref={ref} style={{ height, width: "100%" }} className={`overflow-hidden rounded-2xl border border-border ${className || ""}`} />;
}
