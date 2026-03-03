import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DataErrorProps {
    message?: string;
    onRetry: () => void;
    inline?: boolean;
}

const DataError: React.FC<DataErrorProps> = ({
    message = "Connection lost or slow. Please check your internet.",
    onRetry,
    inline = false
}) => {
    if (inline) {
        return (
            <div className="data-error-inline">
                <AlertCircle size={16} />
                <span>{message}</span>
                <button onClick={onRetry} className="retry-link">
                    Retry
                </button>
                <style>{`
                    .data-error-inline {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        background: rgba(255, 75, 75, 0.1);
                        border-radius: 8px;
                        color: #FF4B4B;
                        font-size: 13px;
                    }
                    .retry-link {
                        background: none;
                        border: none;
                        color: var(--color-primary);
                        font-weight: 700;
                        cursor: pointer;
                        text-decoration: underline;
                        padding: 0;
                        margin-left: 4px;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="data-error-hero">
            <div className="error-icon-circle">
                <AlertCircle size={32} />
            </div>
            <h3>Connection Issue</h3>
            <p>{message}</p>
            <button onClick={onRetry} className="btn-retry">
                <RefreshCw size={18} />
                <span>Try Refetching</span>
            </button>
            <style>{`
                .data-error-hero {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 48px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 500px;
                    margin: 40px auto;
                }
                .error-icon-circle {
                    width: 64px;
                    height: 64px;
                    background: rgba(255, 75, 75, 0.1);
                    color: #FF4B4B;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                .data-error-hero h3 {
                    font-size: 20px;
                    font-weight: 800;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                }
                .data-error-hero p {
                    color: var(--text-muted);
                    font-size: 14px;
                    margin-bottom: 24px;
                    max-width: 300px;
                }
                .btn-retry {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 24px;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-retry:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px var(--color-primary-light);
                }
            `}</style>
        </div>
    );
};

export default DataError;
