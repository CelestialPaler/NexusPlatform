import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

const PromptModal = ({ isOpen, onClose, onConfirm, title, message, defaultValue = "", placeholder = "", confirmText = "OK", cancelText = "Cancel" }) => {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef(null);

    // Reset value when opening
    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            // Focus input after a short delay for animation
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(value);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit}>
                {message && <p className="text-gray-300 mb-4">{message}</p>}

                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="mb-6"
                    autoFocus
                />

                <div className="flex justify-end space-x-3">
                    <Button variant="secondary" onClick={onClose} type="button">
                        {cancelText}
                    </Button>
                    <Button variant="primary" type="submit" disabled={!value.trim()}>
                        {confirmText}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default PromptModal;
