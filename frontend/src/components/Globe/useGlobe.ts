import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/** Sets up camera and scene defaults. OrbitControls are configured in GlobeCanvas. */
export function useGlobe() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, 2.8);
  }, [camera]);
}
