import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastConfig {
  title: string;
  type: ToastType;
  duration?: number;
}

// Unicode symbols for luxury aesthetic
const SYMBOLS = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

// Luxury color mapping
const TOAST_COLORS = {
  success: {
    bg: "#F1F8F4",
    border: "#2E7D32",
    text: "#2E7D32",
  },
  error: {
    bg: "#FFEBEE",
    border: "#C62828",
    text: "#C62828",
  },
  warning: {
    bg: "#FFF3E0",
    border: "#F57C00",
    text: "#F57C00",
  },
  info: {
    bg: "#E3F2FD",
    border: "#1976D2",
    text: "#1976D2",
  },
};

export const showLuxuryToast = ({
  title,
  type = "info",
  duration = 3000,
}: ToastConfig) => {
  const colors = TOAST_COLORS[type];
  const symbol = SYMBOLS[type];

  MySwal.fire({
    title: `<div style="display: flex; align-items: center; gap: 12px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <span style="
        font-size: 24px;
        font-weight: bold;
        color: ${colors.text};
        line-height: 1;
      ">${symbol}</span>
      <span style="
        font-size: 14px;
        color: #1C1C1A;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-weight: 500;
      ">${title}</span>
    </div>`,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: duration,
    timerProgressBar: true,
    customClass: {
      popup: `rounded-none font-sans border-l-4 shadow-lg text-[#1C1C1A] ${
        type === "success"
          ? "border-[#2E7D32] bg-[#F1F8F4]"
          : type === "error"
          ? "border-[#C62828] bg-[#FFEBEE]"
          : type === "warning"
          ? "border-[#F57C00] bg-[#FFF3E0]"
          : "border-[#1976D2] bg-[#E3F2FD]"
      }`,
      timerProgressBar: `bg-${
        type === "success"
          ? "[#2E7D32]"
          : type === "error"
          ? "[#C62828]"
          : type === "warning"
          ? "[#F57C00]"
          : "[#1976D2]"
      }`,
    },
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });
};

export const showLuxuryModal = async ({
  title,
  html,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  confirmColor = "#6F0B0B",
  icon = "warning",
}: {
  title: string;
  html: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: "warning" | "question" | "info";
}) => {
  const iconSymbols = {
    warning: "⚠",
    question: "?",
    info: "ℹ",
  };

  return await MySwal.fire({
    title: `<div class="font-serif text-2xl text-[#1C1C1A]">${iconSymbols[icon]} ${title}</div>`,
    html: `<div class="font-sans text-sm text-[#1C1C1A]">${html}</div>`,
    icon: undefined,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmColor,
    customClass: {
      popup: "rounded-none font-sans border border-[#E5E5E5]",
      confirmButton:
        "bg-[#6F0B0B] text-white font-bold text-xs uppercase tracking-widest px-6 py-2 rounded-none hover:bg-[#8B0D0D]",
      cancelButton:
        "bg-white border border-[#E5E5E5] text-[#8D8D8C] font-bold text-xs uppercase tracking-widest px-6 py-2 rounded-none hover:bg-[#FAFAFA]",
      closeButton: "text-[#8D8D8C]",
    },
  });
};
