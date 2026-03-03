import React from 'react';
import { User, Download, X } from 'lucide-react';

interface VirtualIDCardProps {
    employee: {
        full_name: string;
        job_title: string;
        profile_pic_url?: string;
        id: string;
    };
    onClose?: () => void;
}

const VirtualIDCard: React.FC<VirtualIDCardProps> = ({ employee, onClose }) => {
    return (
        <div className="id-card-modal-overlay" onClick={onClose}>
            <div className="id-card-container animate-scaleUp" onClick={e => e.stopPropagation()}>
                <div className="id-card-front">
                    {/* Top Branding */}
                    <header className="id-header">
                        <img src="/id_assets/idlogo.svg" alt="Versovate" className="id-brand-logo" />
                    </header>

                    {/* Employee Identity Text */}
                    <div className="id-body">
                        <h1 className="id-name">
                            {employee.full_name.split(' ').map((part, i) => (
                                <span key={i} className="name-line">{part}</span>
                            ))}
                        </h1>
                        <p className="id-role">{employee.job_title}</p>
                    </div>

                    {/* Bottom Graphic Section */}
                    <div className="id-footer">
                        <img src="/id_assets/id_background.png" alt="Background Graphic" className="id-footer-bg" />

                        {/* Transparent Photo Overlay */}
                        <div className="id-photo-area">
                            {employee.profile_pic_url ? (
                                <img src={employee.profile_pic_url} alt={employee.full_name} className="id-main-photo" />
                            ) : (
                                <div className="id-photo-placeholder">
                                    <User size={80} strokeWidth={1} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="id-card-controls">
                    <button className="btn-id-download">
                        <Download size={18} />
                        <span>Save to Gallery</span>
                    </button>
                    <button className="btn-id-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            <style>{`
                .id-card-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 24px;
                }

                .id-card-container {
                    width: 320px;
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    position: relative;
                }

                .id-card-front {
                    width: 100%;
                    aspect-ratio: 1 / 1.7;
                    background: #111111;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.8);
                    position: relative;
                    /* Square corners per user feedback */
                    border-radius: 0;
                    overflow: hidden;
                }

                .id-header {
                    padding: 40px 32px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .id-brand-logo {
                    height: 32px; /* Adjusted to be slightly smaller as requested */
                }



                .id-body {
                    padding: 20px 32px;
                    text-align: left; /* Left alignment per Figma */
                    flex: 1;
                }

                .id-name {
                    margin: 0;
                    color: white;
                    font-size: 28px;
                    font-weight: 900;
                    line-height: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .name-line {
                    display: block;
                    text-transform: uppercase;
                }

                .id-role {
                    margin: 12px 0 0;
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 14px;
                    font-weight: 500;
                }

                .id-footer {
                    height: 280px;
                    position: relative;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    background: #111111;
                }

                .id-footer-bg {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: 1;
                }

                .id-photo-area {
                    position: relative;
                    z-index: 2;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }

                .id-main-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: contain; /* Transparent PNG support */
                    object-position: bottom;
                    /* Design usually shows photo overlapping elements */
                }

                .id-photo-placeholder {
                    width: 100%;
                    height: 80%;
                    background: linear-gradient(to top, rgba(255,255,255,0.05), transparent);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.2);
                }

                .id-card-controls {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .btn-id-download {
                    flex: 1;
                    padding: 18px;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    font-weight: 800;
                    font-size: 15px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s;
                }

                .btn-id-download:hover {
                    box-shadow: 0 15px 30px rgba(var(--color-primary-rgb), 0.4);
                    transform: translateY(-2px);
                }

                .btn-id-close {
                    width: 56px;
                    height: 56px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-id-close:hover {
                    background: #E53935;
                }

                .animate-scaleUp {
                    animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.8) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default VirtualIDCard;
