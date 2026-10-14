/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// AppToaster — toast container that flips sides with the reading direction
// (top-right in LTR / top-left in RTL). Rendered once in main.jsx.
import { Toaster } from "sonner";
import { useI18n } from "../../i18n";

export function AppToaster() {
  const { isRtl } = useI18n();
  return (
    <Toaster
      position={isRtl ? "top-left" : "top-right"}
      richColors
      closeButton
      duration={4000}
    />
  );
}

export default AppToaster;
