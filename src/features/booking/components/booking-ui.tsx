import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "8px",
            borderRadius: "99px",
            width: current - 1 === i ? "24px" : "8px",
            backgroundColor: current - 1 >= i ? "var(--primary)" : "var(--border)",
            transition: "all 0.35s ease",
          }}
        />
      ))}
    </div>
  );
}

export function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "8px 14px",
        background: "rgba(15,81,50,0.07)",
        borderRadius: "var(--radius-md)",
        fontSize: "0.8rem",
        gap: "2px",
      }}
    >
      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontWeight: "700", color: "var(--primary)" }}>{value}</span>
    </div>
  );
}

export function InputField({
  icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-muted)" }}>
        {label} {required && <span style={{ color: "#e53e3e" }}>*</span>}
      </label>
      <div className="input-wrapper">
        <span style={{ color: "var(--primary)", flexShrink: 0 }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{
            border: "none",
            outline: "none",
            width: "100%",
            background: "transparent",
            fontSize: "0.95rem",
            color: "var(--text-main)",
          }}
        />
      </div>
    </div>
  );
}

export function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="error-toast"
    >
      <AlertCircle size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ color: "inherit", padding: "4px", fontSize: "1.1rem", lineHeight: 1 }}>×</button>
    </motion.div>
  );
}
