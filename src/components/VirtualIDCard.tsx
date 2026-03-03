import React from 'react';
import { User, Download } from 'lucide-react';

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
                    {/* Top Section - Brand */}
                    <div className="id-card-header">
                        <div className="id-logo">
                            <img src="/id_assets/idcard_logo.png" alt="Versovate" />
                            <span>Versovate</span>
                        </div>
                    </div>

                    {/* Middle Section - Employee Info */}
                    <div className="id-card-info">
                        <h2 className="id-emp-name">{employee.full_name.toUpperCase()}</h2>
                        <p className="id-emp-role">{employee.job_title}</p>
                    </div>

                    {/* Bottom Section - Graphic & Photo */}
                    <div className="id-card-graphic-area">
                        <div className="id-bg-graphic">
                            <img src="/id_assets/id_background.png" alt="ID Background" />
                        </div>

                        <div className="id-photo-wrapper">
                            {employee.profile_pic_url ? (
                                <img src={employee.profile_pic_url} alt={employee.full_name} className="id-emp-photo" />
                            ) : (
                                <div className="id-emp-photo-placeholder">
                                    <User size={60} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="id-card-actions">
                    <button className="id-action-btn download">
                        <Download size={18} />
                        <span>Download Digital ID</span>
                    </button>
                    {onClose && (
                        <button className="id-action-btn close" onClick={onClose}>
                            Close Preview
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .id-card-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                }

                .id-card-container {
                    width: 320px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .id-card-front {
                    width: 100%;
                    aspect-ratio: 1 / 1.6;
                    background: #121212;
                    border-radius: 24px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .id-card-header {
                    padding: 30px;
                    display: flex;
                    align-items: center;
                }

                .id-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .id-logo img {
                    height: 28px;
                    filter: brightness(0) invert(1);
                }

                .id-logo span {
                    color: white;
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }

                .id-card-info {
                    padding: 0 30px;
                    margin-top: 20px;
                    z-index: 2;
                }

                .id-emp-name {
                    color: white;
                    font-size: 24px;
                    font-weight: 800;
                    margin: 0;
                    line-height: 1.1;
                    letter-spacing: 0.5px;
                    max-width: 200px;
                }

                .id-emp-role {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 14px;
                    font-weight: 500;
                    margin: 8px 0 0;
                }

                .id-card-graphic-area {
                    flex: 1;
                    position: relative;
                    margin-top: auto;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }

                .id-bg-graphic {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }

                .id-bg-graphic img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .id-photo-wrapper {
                    width: 200px;
                    aspect-ratio: 1;
                    z-index: 2;
                    position: relative;
                    margin-bottom: -10px;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }

                .id-emp-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    /* Apply grayscale and contrast to match design if needed, 
                       but design shows a clear photo with a purple bg */
                    mask-image: linear-gradient(to top, rgba(0,0,0,1) 80%, rgba(0,0,0,0));
                }

                .id-emp-photo-placeholder {
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .id-card-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .id-action-btn {
                    padding: 14px;
                    border-radius: 16px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    text-align: center;
                }

                .id-action-btn.download {
                    background: var(--color-primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .id-action-btn.download:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px -5px var(--color-primary);
                }

                .id-action-btn.close {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                }

                .id-action-btn.close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .animate-scaleUp {
                    animation: scaleUp 0.3s ease-out forwards;
                }

                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default VirtualIDCard;
