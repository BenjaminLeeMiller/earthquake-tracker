import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { BufferGeometry, Float32BufferAttribute, SRGBColorSpace } from "three";
import earthMapUrl from "../../assets/earth-map.jpg";
import { latLonToXYZ } from "../../utils/grid";

const LON_STEPS = 128;
const LAT_STEPS = 64;

/**
 * Builds the globe geometry directly from latLonToXYZ (the same function
 * used to place quake markers) and pairs each vertex with the standard
 * equirectangular UV for its lat/lon. Using three.js's stock SphereGeometry
 * here would require mirroring the texture to align marker positions, which
 * also mirrors every continent's shape (like viewing the globe from inside
 * out) — building the geometry from our own convention avoids that entirely.
 */
function buildGlobeGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= LAT_STEPS; iy++) {
    const v = iy / LAT_STEPS; // 0 at south pole -> 1 at north pole
    const lat = -90 + v * 180;
    for (let ix = 0; ix <= LON_STEPS; ix++) {
      const u = ix / LON_STEPS; // 0 at lon=-180 -> 1 at lon=+180
      const lon = -180 + u * 360;
      const [x, y, z] = latLonToXYZ(lat, lon, 1);
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const rowLen = LON_STEPS + 1;
  for (let iy = 0; iy < LAT_STEPS; iy++) {
    for (let ix = 0; ix < LON_STEPS; ix++) {
      const a = iy * rowLen + ix;
      const b = a + 1;
      const c = a + rowLen;
      const d = c + 1;
      // Winding reversed to match latLonToXYZ's current chirality (that
      // formula mirrors the sphere relative to a naive cos/sin assignment,
      // which flips which winding order faces outward) — front faces must
      // point away from the sphere center for FrontSide rendering to show
      // the near side instead of culling it.
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Globe: a real map texture, semi-transparent so quake markers positioned
 * below the surface (by depth) remain visible through it. No depth write,
 * so markers aren't occluded by the shell itself — only by other markers.
 * Default (front) side only — rendering both sides here would let the far
 * hemisphere bleed through the near one, which reads as a mirrored map even
 * though each side is individually correct.
 */
export function EarthSphere() {
  const texture = useTexture(earthMapUrl);
  const geometry = useMemo(() => buildGlobeGeometry(), []);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}
