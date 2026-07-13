export interface VolcanoRecord {
  id: number;
  name: string;
  country: string;
  type: string | null;
  elevationM: number | null;
  lastEruptionYear: number | null; // negative = BCE
  tectonicSetting: string | null;
  lat: number;
  lon: number;
}
