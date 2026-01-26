import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "warning", showCancel = true }) => {

    const config = {
        warning: {
            icon: AlertTriangle,
            color: "text-yellow-500",
            btnVariant: "primary" // Actually warning usually implies caution, maybe primary is fine or specific warning variant
        },
        danger: {
            icon: AlertTriangle,
            color: "text-red-500",
            btnVariant: "danger"
        },
        info: {
            icon: Info,
            color: "text-blue-500",
            btnVariant: "primary"
        }
    };

    const style = config[type] || config.warning;
    const Icon = style.icon;

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title} className="max-w-md">
            <div className="flex items-start mb-6">
                <div className={`p-2 rounded-full bg-gray-900/50 mr-4 ${style.color}`}>
                    <Icon size={32} />
                </div>
                <div className="mt-1">
                    <p className="text-gray-300 leading-relaxed">
                        {message}
                    </p>
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                {showCancel && (
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                )}
                <Button variant={style.btnVariant} onClick={onConfirm}>
                    {confirmText}
                </Button>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
