"""Tests for the spherical grid math."""

from app.services.grid import (
    CELL_SIZE_KM,
    LAT_DEG_PER_BAND,
    MAX_DEPTH_LAYERS,
    TOTAL_LAT_BANDS,
    CellID,
    cell_center,
    cells_in_lat_band,
    coords_to_cell,
    lat_lon_to_xyz,
)


class TestCellsInLatBand:
    def test_equator_band(self):
        # Middle band should have ~4978 cells
        mid = TOTAL_LAT_BANDS // 2
        n = cells_in_lat_band(mid)
        assert 4000 < n < 6000

    def test_polar_band_small(self):
        # Near-polar bands should be small
        assert cells_in_lat_band(0) >= 1
        assert cells_in_lat_band(TOTAL_LAT_BANDS - 1) >= 1

    def test_60_deg_band_half(self):
        # cos(60°) = 0.5 so should be ~half equator
        band_60 = int((60 + 90) / LAT_DEG_PER_BAND)
        n_eq = cells_in_lat_band(TOTAL_LAT_BANDS // 2)
        n_60 = cells_in_lat_band(band_60)
        assert 0.4 < n_60 / n_eq < 0.6


class TestCoordsToCell:
    def test_origin(self):
        cell = coords_to_cell(0.0, 0.0, 0.0)
        assert cell.depth_layer == 0
        # lat=0 → mid lat_band
        expected_lat_band = int(90 / LAT_DEG_PER_BAND)
        assert abs(cell.lat_band - expected_lat_band) <= 1

    def test_depth_layer(self):
        cell_shallow = coords_to_cell(0, 0, 0.0)
        cell_deep = coords_to_cell(0, 0, 100.0)
        assert cell_shallow.depth_layer == 0
        assert cell_deep.depth_layer > 0

    def test_depth_clamped_at_max(self):
        # Very deep earthquake should be clamped to last layer
        cell = coords_to_cell(0, 0, 9999.0)
        assert cell.depth_layer == MAX_DEPTH_LAYERS - 1

    def test_lat_band_north_pole(self):
        # Clamped: the last few bands cover 89–90°
        cell = coords_to_cell(89.9, 0, 0)
        assert cell.lat_band >= TOTAL_LAT_BANDS - 5

    def test_lat_band_south_pole(self):
        # Clamped: the first few bands cover -90 to -89°
        cell = coords_to_cell(-89.9, 0, 0)
        assert cell.lat_band <= 5

    def test_lon_wraps(self):
        cell_neg = coords_to_cell(0, -180.0, 0)
        cell_pos = coords_to_cell(0, 180.0, 0)
        # Both edges of longitude should land in the same cell
        assert cell_neg.lat_band == cell_pos.lat_band

    def test_returns_cell_id(self):
        cell = coords_to_cell(35.6, 139.7, 10.0)
        assert isinstance(cell, CellID)
        assert 0 <= cell.depth_layer < MAX_DEPTH_LAYERS
        assert 0 <= cell.lat_band < TOTAL_LAT_BANDS


class TestCellCenter:
    def test_roundtrip_approximate(self):
        # coords_to_cell then cell_center should give back ~same lat/lon
        lat, lon, depth_km = 35.0, 139.0, 20.0
        cell = coords_to_cell(lat, lon, depth_km)
        clat, clon, cdepth = cell_center(cell)
        assert abs(clat - lat) < LAT_DEG_PER_BAND
        assert abs(cdepth - depth_km) < CELL_SIZE_KM

    def test_depth_center(self):
        # Layer 0 center should be at 0.5 * CELL_SIZE_KM
        cell = CellID(0, TOTAL_LAT_BANDS // 2, 0)
        _, _, cdepth = cell_center(cell)
        assert abs(cdepth - 0.5 * CELL_SIZE_KM) < 0.01


class TestLatLonToXYZ:
    def test_north_pole(self):
        x, y, z = lat_lon_to_xyz(90, 0)
        assert abs(x) < 1e-10
        assert abs(y - 1.0) < 1e-10
        assert abs(z) < 1e-10

    def test_south_pole(self):
        x, y, z = lat_lon_to_xyz(-90, 0)
        assert abs(x) < 1e-10
        assert abs(y + 1.0) < 1e-10
        assert abs(z) < 1e-10

    def test_equator_prime_meridian(self):
        x, y, z = lat_lon_to_xyz(0, 0)
        assert abs(x) < 1e-10
        assert abs(y) < 1e-10
        assert abs(z - 1.0) < 1e-10

    def test_unit_length(self):
        from math import sqrt

        x, y, z = lat_lon_to_xyz(45, 90)
        assert abs(sqrt(x**2 + y**2 + z**2) - 1.0) < 1e-10

    def test_radius_scaling(self):
        from math import sqrt

        x, y, z = lat_lon_to_xyz(30, 60, radius=2.0)
        assert abs(sqrt(x**2 + y**2 + z**2) - 2.0) < 1e-10
