/**
 * Globe: a faint dark interior + a visible wireframe grid.
 * "Transparent" feel — cells on the surface will stand out.
 */
export function EarthSphere() {
  return (
    <>
      {/* Dark fill — slightly lighter than bg so the sphere shape reads */}
      <mesh>
        <sphereGeometry args={[0.999, 64, 64]} />
        <meshBasicMaterial color="#0a1a2e" transparent opacity={0.95} />
      </mesh>
      {/* Wireframe latitude/longitude grid */}
      <mesh>
        <sphereGeometry args={[1.001, 36, 18]} />
        <meshBasicMaterial color="#1e5090" wireframe transparent opacity={0.45} />
      </mesh>
    </>
  );
}
