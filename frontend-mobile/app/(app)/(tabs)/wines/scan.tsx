import { WineLabelScanScreen } from "@/presentation/features/wine/scan/WineLabelScanScreen";
import { AuthGuard } from "@/presentation/navigation/guards";
import { ModalScreenToastHost } from "@/presentation/providers/ToastProvider";

export default function WineScanScreen() {
  return (
    <AuthGuard>
      {/* The scanner is a full-screen modal: its toasts need a host inside it. */}
      <ModalScreenToastHost inModal>
        <WineLabelScanScreen />
      </ModalScreenToastHost>
    </AuthGuard>
  );
}
