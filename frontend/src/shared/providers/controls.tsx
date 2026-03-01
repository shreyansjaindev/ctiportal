import { useLocalStorage } from "@/shared/hooks";
import { createContext, useContext } from "react";

const CONTROLS_KEY = "data-table-controls-open";

interface ControlsContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ControlsContext = createContext<ControlsContextType | null>(null);

export function ControlsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useLocalStorage(CONTROLS_KEY, false);

  return (
    <ControlsContext.Provider value={{ open, setOpen }}>
      <div
        // REMINDER: access the data-expanded state with tailwind via `group-data-[expanded=true]/controls:block`
        className="group/controls"
        data-expanded={open}
      >
        {children}
      </div>
    </ControlsContext.Provider>
  );
}

export function useControls() {
  const context = useContext(ControlsContext);

  if (!context) {
    throw new Error("useControls must be used within a ControlsProvider");
  }

  return context as ControlsContextType;
}
