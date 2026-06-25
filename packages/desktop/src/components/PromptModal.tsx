import { useState } from "react";

/**
 * A small text-input modal. Electron's renderer does not support window.prompt(),
 * so we use this for "reason", "new PIN", "rename", etc.
 */
export function PromptModal({
  title,
  label,
  placeholder,
  defaultValue = "",
  confirmText = "Confirm",
  danger,
  password,
  onCancel,
  onSubmit,
}: {
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  danger?: boolean;
  password?: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function submit() {
    if (!value.trim()) return;
    onSubmit(value.trim());
  }

  return (
    <div className="modal-backdrop no-print" onClick={onCancel}>
      <div className="modal rise" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 14 }}>{title}</h3>
        <div className="field">
          {label && <label>{label}</label>}
          <input
            className="input"
            type={password ? "password" : "text"}
            autoFocus
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>
        <div className="row spread" style={{ marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={submit}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
