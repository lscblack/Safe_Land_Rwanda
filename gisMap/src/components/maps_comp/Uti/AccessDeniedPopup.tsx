// components/AccessDeniedPopup.tsx
import { ShieldIcon } from "lucide-react";

interface AccessDeniedPopupProps {
    upi: string;
    onClose: () => void;
}

export function AccessDeniedPopup({ upi, onClose }: AccessDeniedPopupProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
        }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: 'white',
                padding: 24,
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                zIndex: 2000,
                maxWidth: 400,
                textAlign: 'center',
            }}>
                <div style={{ marginBottom: 16 }}>
                    <ShieldIcon size={48} color="#EF4444" style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                    Access Denied
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
                    You don't have permission to view details of parcel:
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 16 }}>
                    {upi}
                </p>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                    This property was uploaded by another user.
                </p>
                <button
                    onClick={onClose}
                    style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 24px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    Got it
                </button>
            </div>
        </div>
    );
}