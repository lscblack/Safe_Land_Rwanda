// components/MapControls.tsx
import { Map as MapIcon, Satellite, Moon, Layers, Navigation, RefreshCw } from "lucide-react";

interface MapControlsProps {
    mapStyle: "osm" | "satellite" | "dark" | "streets";
    onMapStyleChange: (style: "osm" | "satellite" | "dark" | "streets") => void;
    enable3D: boolean;
    onEnable3DChange: (enabled: boolean) => void;
    autoZoom: boolean;
    onAutoZoomChange: (enabled: boolean) => void;
    onRecenter: () => void;
}

export function MapControls({
    mapStyle,
    onMapStyleChange,
    enable3D,
    onEnable3DChange,
    autoZoom,
    onAutoZoomChange,
    onRecenter,
}: MapControlsProps) {
    return (
        <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
        }}>
            {/* Map Style Controls */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <button
                    onClick={() => onMapStyleChange('streets')}
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: mapStyle === 'streets' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Street Map"
                >
                    <MapIcon size={16} color={mapStyle === 'streets' ? 'white' : '#6B7280'} />
                </button>
                <button
                    onClick={() => onMapStyleChange('satellite')}
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: mapStyle === 'satellite' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                    title="Satellite"
                >
                    <Satellite size={16} color={mapStyle === 'satellite' ? 'white' : '#6B7280'} />
                </button>
                <button
                    onClick={() => onMapStyleChange('dark')}
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: mapStyle === 'dark' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                    title="Dark Mode"
                >
                    <Moon size={16} color={mapStyle === 'dark' ? 'white' : '#6B7280'} />
                </button>
            </div>

            {/* 3D Toggle */}
            <button
                onClick={() => onEnable3DChange(!enable3D)}
                style={{
                    width: 36,
                    height: 36,
                    backgroundColor: enable3D ? 'var(--color-primary)' : 'white',
                    border: 'none',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                title="3D View"
            >
                <Layers size={16} color={enable3D ? 'white' : '#374151'} />
            </button>

            {/* Auto Zoom Toggle */}
            <button
                onClick={() => onAutoZoomChange(!autoZoom)}
                style={{
                    width: 36,
                    height: 36,
                    backgroundColor: autoZoom ? 'var(--color-primary)' : 'white',
                    border: 'none',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                title="Auto Zoom"
            >
                <Navigation size={16} color={autoZoom ? 'white' : '#374151'} />
            </button>

            {/* Recenter Button */}
            <button
                onClick={onRecenter}
                style={{
                    width: 36,
                    height: 36,
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                title="Recenter on selected"
            >
                <RefreshCw size={16} color="#374151" />
            </button>
        </div>
    );
}