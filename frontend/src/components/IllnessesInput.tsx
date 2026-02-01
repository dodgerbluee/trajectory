import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { HiX } from 'react-icons/hi';
import type { IllnessType } from '../types/api';

interface IllnessesInputProps {
    value: IllnessType[];
    onChange: (illnesses: IllnessType[]) => void;
    disabled?: boolean;
}

const COMMON_ILLNESSES: { value: IllnessType; label: string }[] = [
    { value: 'flu', label: 'Flu' },
    { value: 'strep', label: 'Strep Throat' },
    { value: 'rsv', label: 'RSV' },
    { value: 'covid', label: 'COVID-19' },
    { value: 'cold', label: 'Cold' },
    { value: 'stomach_bug', label: 'Stomach Bug' },
    { value: 'ear_infection', label: 'Ear Infection' },
    { value: 'hand_foot_mouth', label: 'Hand, Foot & Mouth' },
    { value: 'croup', label: 'Croup' },
    { value: 'pink_eye', label: 'Pink Eye' },
    { value: 'other', label: 'Other' },
];


function IllnessesInput({ value, onChange, disabled }: IllnessesInputProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedLocal, setSelectedLocal] = useState<IllnessType[]>([]);
    const outerRef = useRef<HTMLDivElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);

    // Sync from parent only when modal is closed so we don't overwrite in-progress multi-select
    useEffect(() => {
        if (!open) setSelectedLocal([...value]);
    }, [value, open]);

    useEffect(() => {
        const onDoc = (e: globalThis.MouseEvent) => {
            const target = e.target as Node;
            if (open && modalRef.current && !modalRef.current.contains(target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const toggle = (ill: IllnessType) => {
        setSelectedLocal(prev => prev.includes(ill) ? prev.filter(i => i !== ill) : [...prev, ill]);
    };

    const handleSave = (e: ReactMouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const toSave = [...selectedLocal];
        onChange(toSave);
        // Defer closing so this click cannot hit elements that appear when modal unmounts
        window.setTimeout(() => setOpen(false), 0);
    };

    const handleRemove = (ill: IllnessType) => {
        onChange(value.filter(i => i !== ill));
    };

    const filtered = COMMON_ILLNESSES.filter(i => i.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="illnesses-input-modern" ref={outerRef}>
            {value.length > 0 ? (
                <div className="illnesses-badges-wrap">
                    <div className="vaccine-badges-list">
                        {value.map((v) => (
                            <span key={v} className="vaccine-badge-item">
                                <span className="vaccine-badge-icon">🤒</span>
                                <span className="vaccine-badge-text">{titleCase(v)}</span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(v)}
                                        className="vaccine-badge-remove"
                                        title="Remove illness"
                                    >
                                        <HiX />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        disabled={disabled}
                        className="measurement-card-add"
                        title="Add Illness"
                    >
                        <span className="measurement-card-icon" aria-hidden>🤒</span>
                        <span className="measurement-card-add-label">Add Illness</span>
                    </button>
                </div>
            ) : (
                <div className="vaccine-empty">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        disabled={disabled}
                        className="measurement-card-add"
                        title="Add Illness"
                    >
                        <span className="measurement-card-icon" aria-hidden>🤒</span>
                        <span className="measurement-card-add-label">Add Illness</span>
                    </button>
                </div>
            )}
            {open && (
                <div className="vaccine-modal-overlay">
                    <div className="vaccine-modal-content" ref={modalRef}>
                        <div className="vaccine-modal-header">
                            <h3 className="vaccine-modal-title">Select Illness</h3>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="vaccine-modal-close"
                                title="Close"
                            >
                                <HiX />
                            </button>
                        </div>

                        <div className="vaccine-modal-body">
                            <div className="vaccine-search">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search illnesses..."
                                    className="vaccine-search-input"
                                    autoFocus
                                />
                            </div>

                            <div className="vaccine-list">
                                {filtered.length === 0 ? (
                                    <p className="vaccine-list-empty">No illnesses found matching "{search}"</p>
                                ) : (
                                    filtered.map((ill) => (
                                        <label key={ill.value} className="vaccine-checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedLocal.includes(ill.value)}
                                                onChange={() => toggle(ill.value)}
                                                className="vaccine-checkbox"
                                            />
                                            <span className="vaccine-checkbox-label">{ill.label}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="vaccine-modal-footer">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="vaccine-modal-button vaccine-modal-button-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="vaccine-modal-button vaccine-modal-button-save"
                            >
                                Save ({selectedLocal.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IllnessesInput;
