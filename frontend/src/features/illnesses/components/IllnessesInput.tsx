import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { HiX } from 'react-icons/hi';
import type { IllnessType } from '@shared/types/api';
import styles from './IllnessesInput.module.css';
import mui from '@shared/styles/MeasurementsUI.module.css';

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
        <div className={styles.root} ref={outerRef}>
            {value.length > 0 ? (
                <div className={styles.badgesWrap}>
                    <div className={styles.badgesList}>
                        {value.map((v) => (
                            <span key={v} className={styles.badgeItem}>
                                <span className={styles.badgeIcon}>🤒</span>
                                <span className={styles.badgeText}>{titleCase(v)}</span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(v)}
                                        className={styles.badgeRemove}
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
                        className={mui.cardAdd}
                        title="Add Illness"
                    >
                        <span className={mui.cardIcon} aria-hidden>🤒</span>
                        <span className={mui.cardAddLabel}>Add Illness</span>
                    </button>
                </div>
            ) : (
                <div className={styles.empty}>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        disabled={disabled}
                        className={mui.cardAdd}
                        title="Add Illness"
                    >
                        <span className={mui.cardIcon} aria-hidden>🤒</span>
                        <span className={mui.cardAddLabel}>Add Illness</span>
                    </button>
                </div>
            )}
            {open && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} ref={modalRef}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Select Illness</h3>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className={styles.modalClose}
                                title="Close"
                            >
                                <HiX />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.search}>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search illnesses..."
                                    className={styles.searchInput}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.list}>
                                {filtered.length === 0 ? (
                                    <p className={styles.listEmpty}>No illnesses found matching "{search}"</p>
                                ) : (
                                    filtered.map((ill) => (
                                        <label key={ill.value} className={styles.checkboxItem}>
                                            <input
                                                type="checkbox"
                                                checked={selectedLocal.includes(ill.value)}
                                                onChange={() => toggle(ill.value)}
                                                className={styles.checkbox}
                                            />
                                            <span className={styles.checkboxLabel}>{ill.label}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className={`${styles.modalButton} ${styles.modalButtonSave}`}
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
