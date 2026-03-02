// components/Map3DView.tsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface Map3DViewProps {
    enabled: boolean;
}

export function Map3DView({ enabled }: Map3DViewProps) {
    const map = useMap();

    useEffect(() => {
        if (enabled) {
            map.setMaxZoom(22);
            map.setMinZoom(15);
        } else {
            map.setMaxZoom(19);
            map.setMinZoom(10);
        }
    }, [enabled, map]);

    return null;
}