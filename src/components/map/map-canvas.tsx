"use client";

import L from "leaflet";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  LayerGroup,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { LiveOrder, MapLayout, MapMarkerKind } from "@/lib/live-map";
import {
  isActiveOnMap,
  MAP_CENTER,
  markerKind,
  pointAlong,
  quadraticCurve,
} from "@/lib/live-map";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";
import "./leaflet.css";

const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

interface MapCanvasProps {
  orders: LiveOrder[];
  selectedId: string | null;
  isDark: boolean;
  dir: "rtl" | "ltr";
  layout?: MapLayout;
  resizeToken?: string | number;
  onSelect: (orderId: string) => void;
}

function createDriverIcon(kind: MapMarkerKind, selected: boolean): L.DivIcon {
  return L.divIcon({
    className: cn(
      "sd-marker",
      selected && "sd-marker-selected",
      kind === "delayed" && "sd-marker-delayed",
      kind === "delivered" && "sd-marker-delivered",
    ),
    html: '<span class="sd-marker-pulse"><span class="sd-marker-ring"></span><span class="sd-marker-core"></span></span>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function createDestinationIcon(): L.DivIcon {
  return L.divIcon({
    className: "sd-marker",
    html: '<span class="sd-dest-marker"><span class="sd-dest-core"></span></span>',
    iconSize: [36, 36],
    iconAnchor: [18, 22],
  });
}

function MapFocus({
  selectedId,
  orders,
  dir,
  layout,
  resizeToken,
}: {
  selectedId: string | null;
  orders: LiveOrder[];
  dir: "rtl" | "ltr";
  layout: MapLayout;
  resizeToken?: string | number;
}): null {
  const map = useMap();
  const ordersRef = useRef(orders);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [layout, map, resizeToken]);

  useEffect(() => {
    const selected = ordersRef.current.find((order) => order.id === selectedId);

    if (!selectedId || !selected) {
      return;
    }

    const curve = quadraticCurve(selected.driver, selected.destinationPoint);
    const driverPoint = pointAlong(curve, selected.progress);
    const panelPad: [number, number] = [320, 56];
    const edgePad: [number, number] = [56, 56];
    const splitPad: [number, number] = [48, 48];
    const bounds = L.latLngBounds([driverPoint, selected.destinationPoint]);

    map.flyToBounds(bounds, {
      paddingTopLeft:
        layout === "split" ? splitPad : dir === "rtl" ? edgePad : panelPad,
      paddingBottomRight:
        layout === "split" ? splitPad : dir === "rtl" ? panelPad : edgePad,
      maxZoom: 15,
      duration: 0.9,
    });
  }, [dir, layout, map, selectedId]);

  return null;
}

export function MapCanvas({
  orders,
  selectedId,
  isDark,
  dir,
  layout = "overlay",
  resizeToken,
  onSelect,
}: MapCanvasProps): ReactNode {
  const destinationIcon = useMemo(() => createDestinationIcon(), []);
  const driverIcons = useMemo(
    () =>
      ({
        queued: {
          idle: createDriverIcon("queued", false),
          selected: createDriverIcon("queued", true),
        },
        "in-transit": {
          idle: createDriverIcon("in-transit", false),
          selected: createDriverIcon("in-transit", true),
        },
        delayed: {
          idle: createDriverIcon("delayed", false),
          selected: createDriverIcon("delayed", true),
        },
        delivered: {
          idle: createDriverIcon("delivered", false),
          selected: createDriverIcon("delivered", true),
        },
      }) satisfies Record<
        MapMarkerKind,
        { idle: L.DivIcon; selected: L.DivIcon }
      >,
    [],
  );

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={12}
      scrollWheelZoom
      className="sd-map-canvas"
    >
      <TileLayer
        key={isDark ? "dark" : "light"}
        attribution="&copy; OSM &copy; CARTO"
        url={isDark ? DARK_TILES : LIGHT_TILES}
      />
      <MapFocus
        selectedId={selectedId}
        orders={orders}
        dir={dir}
        layout={layout}
        resizeToken={resizeToken}
      />
      {orders.filter(isActiveOnMap).map((order) => {
        const curve = quadraticCurve(order.driver, order.destinationPoint);
        const driverPosition = pointAlong(curve, order.progress);
        const selected = order.id === selectedId;
        const kind = markerKind(order);
        const showRoute = order.status !== "DELIVERED";

        return (
          <LayerGroup key={order.id}>
            {showRoute ? (
              <Polyline
                key={`${order.id}-${selected ? "on" : "off"}`}
                positions={curve}
                pathOptions={{
                  color: selected ? "#5eead4" : "#14b8a6",
                  weight: selected ? 5 : 3.25,
                  opacity: selected ? 0.95 : 0.7,
                  className: cn("sd-route-path", selected && "sd-route-active"),
                }}
                eventHandlers={{
                  click: () => onSelect(order.id),
                }}
              />
            ) : null}
            <Marker
              position={driverPosition}
              icon={driverIcons[kind][selected ? "selected" : "idle"]}
              eventHandlers={{
                click: () => onSelect(order.id),
              }}
              zIndexOffset={selected ? 600 : 400}
            />
            <Marker
              position={order.destinationPoint}
              icon={destinationIcon}
              eventHandlers={{
                click: () => onSelect(order.id),
              }}
              zIndexOffset={selected ? 500 : 300}
            />
          </LayerGroup>
        );
      })}
    </MapContainer>
  );
}

export default MapCanvas;
