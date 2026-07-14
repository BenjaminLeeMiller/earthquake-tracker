import { useAppStore } from "../store/useAppStore";

/**
 * Floating button in the globe area's top-right corner that collapses or
 * reopens the sidebar — collapsing gives the globe the full window width,
 * which is what makes the app usable on phone-sized screens.
 */
export function SidebarToggle() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
      title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
      style={styles.button}
    >
      {sidebarOpen ? "»" : "«"}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 28,
    height: 28,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #334",
    background: "rgba(4,8,16,0.85)",
    color: "#7090a0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
