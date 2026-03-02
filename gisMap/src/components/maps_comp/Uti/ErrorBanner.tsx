// components/ErrorBanner.tsx
import { AlertCircle, XCircle, Info } from "lucide-react";

interface ErrorBannerProps {
    type: 'warning' | 'error' | 'info';
    message: string;
}

export function ErrorBanner({ type, message }: ErrorBannerProps) {
    const colors = {
        warning: {
            bg: '#FFFBEB',
            border: '#F59E0B',
            text: '#92400E',
            icon: <AlertCircle size={16} color="#F59E0B" />
        },
        error: {
            bg: '#FEF2F2',
            border: '#EF4444',
            text: '#991B1B',
            icon: <XCircle size={16} color="#EF4444" />
        },
        info: {
            bg: '#EFF6FF',
            border: '#3B82F6',
            text: '#1E40AF',
            icon: <Info size={16} color="#3B82F6" />
        }
    };

    const style = colors[type];

    return (
        <div style={{
            padding: '12px',
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            {style.icon}
            <span style={{ fontSize: 13, color: style.text }}>{message}</span>
        </div>
    );
}