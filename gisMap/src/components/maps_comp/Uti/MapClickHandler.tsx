// components/MapClickHandler.tsx
import { useMapEvents } from "react-leaflet";

interface MapClickHandlerProps {
    onEmptyClick: () => void;
}

export function MapClickHandler({ onEmptyClick }: MapClickHandlerProps) {
    useMapEvents({
        click: (e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (target.tagName === 'DIV' || target.tagName === 'svg' || target.classList.contains('leaflet-container')) {
                onEmptyClick();
            }
        },
    });
    return null;
}