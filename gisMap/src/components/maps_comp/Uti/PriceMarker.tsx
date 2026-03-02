// components/PriceMarker.tsx
import L from "leaflet";
import { Marker } from "react-leaflet";
import { formatPrice } from "./mapUtils";

interface PriceMarkerProps {
    position: [number, number];
    price?: number;
}

export function PriceMarker({ position, price }: PriceMarkerProps) {
    const formattedPrice = formatPrice(price);

    if (!formattedPrice) return null;

    const markerIcon = L.divIcon({
        html: `<div style="
      background-color: white;
      color: var(--color-primary);
      padding: 4px 8px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid var(--color-primary);
      white-space: nowrap;
    ">${formattedPrice}</div>`,
        className: 'price-marker',
        iconSize: [60, 30],
        iconAnchor: [30, 15],
    });

    return <Marker position={position} icon={markerIcon} />;
}