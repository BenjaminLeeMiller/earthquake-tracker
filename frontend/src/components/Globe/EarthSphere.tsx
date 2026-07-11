import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { BackSide, BufferGeometry, Float32BufferAttribute, SRGBColorSpace } from "three";
import earthMapUrl from "../../assets/earth-map.jpg";
import { latLonToXYZ } from "../../utils/grid";
import { useAppStore } from "../../store/useAppStore";

const TRANSLUCENT_OPACITY = 0.55;
const OPAQUE_OPACITY = 1;

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
 *
 * When translucent, the far hemisphere is drawn too (BackSide, same geometry
 * and texture) so its landmasses show faintly through the near side — as a
 * separate mesh with an explicit lower renderOrder, so it always paints
 * before (behind) the near hemisphere. A single DoubleSide mesh can't
 * guarantee that draw order (transparent triangles within one mesh aren't
 * depth-sorted against each other), which produced a jumbled double-exposure
 * instead of a clean "seen through glass" far layer.
 */
export function EarthSphere() {
  const texture = useTexture(earthMapUrl);
  const geometry = useMemo(() => buildGlobeGeometry(), []);
  const translucentGlobe = useAppStore((s) => s.translucentGlobe);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const opacity = translucentGlobe ? TRANSLUCENT_OPACITY : OPAQUE_OPACITY;

  return (
    <>
      {/* renderOrder -1/0, strictly below EarthquakeLayer markers' renderOrder
          1 — markers must still always draw on top of both globe layers. */}
      {translucentGlobe && (
        <mesh geometry={geometry} renderOrder={-1}>
          <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} side={BackSide} />
        </mesh>
      )}
      <mesh geometry={geometry} renderOrder={0}>
        <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </>
  );
}
