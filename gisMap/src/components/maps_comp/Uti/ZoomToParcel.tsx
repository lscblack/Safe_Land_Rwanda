// components/ZoomToParcel.tsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface ZoomToParcelProps {
    parcel: any;
    shouldZoom: boolean;
}

export function ZoomToParcel({ parcel, shouldZoom }: ZoomToParcelProps) {
    const map = useMap();
    useEffect(() => {
        if (!parcel || !shouldZoom) return;
        map.flyToBounds(parcel.positions, {
            padding: [60, 60],
            maxZoom: 17,
            duration: 1,
        });
    }, [parcel, map, shouldZoom]);
    return null;
}