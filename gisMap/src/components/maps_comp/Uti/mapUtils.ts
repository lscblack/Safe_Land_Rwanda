// utils/mapUtils.ts
export function getCenter(coords: [number, number][]): [number, number] {
    let lat = 0;
    let lng = 0;
    coords.forEach(([la, ln]) => {
        lat += la;
        lng += ln;
    });
    return [lat / coords.length, lng / coords.length];
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export function formatDistance(meters: number): string {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)}km`;
    } else {
        return `${Math.round(meters)}m`;
    }
}

export function formatPrice(price?: number): string {
    if (!price) return '';

    if (price >= 1000000) {
        return `${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
        return `${(price / 1000).toFixed(0)}k`;
    } else {
        return price.toString();
    }
}