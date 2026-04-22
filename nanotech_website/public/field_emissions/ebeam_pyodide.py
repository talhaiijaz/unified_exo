
import numpy as np

def gaussian_kernel(ksize: int, sigma: float) -> np.ndarray:
    ax = np.arange(ksize) - (ksize-1)/2.0
    xx, yy = np.meshgrid(ax, ax, indexing="xy")
    ker = np.exp(-(xx**2 + yy**2)/(2.0*sigma**2))
    ker /= ker.sum()
    return ker

class EBeamLite:
    def __init__(self, wafer_dim=(150,150), psf_size=11, psf_sigma=1.8, exposure_target=1.0, thresh_low=0.9, thresh_high=1.2):
        self.H, self.W = wafer_dim
        self.wafer = np.zeros((self.H, self.W), dtype=np.float32)
        self.target = np.zeros((self.H, self.W), dtype=np.float32)
        self.psf = gaussian_kernel(psf_size, psf_sigma).astype(np.float32)
        self.exposure_target = float(exposure_target)
        self.thresh_low = float(thresh_low)
        self.thresh_high = float(thresh_high)

    def set_target(self, mask: np.ndarray):
        mask = (mask > 0).astype(np.float32)
        if mask.shape != (self.H, self.W):
            raise ValueError("mask shape mismatch")
        self.target = mask

    def sigmoid_dose(self, x, k=10.0):
        x = np.asarray(x, dtype=np.float32)
        t = self.exposure_target
        return 1.0 / (1.0 + np.exp(-k*(x - t)))

    def _stamp(self, r, c, dose_scale=1.0):
        kh, kw = self.psf.shape
        rh = kh//2; rw = kw//2
        r0 = r - rh; c0 = c - rw
        r1 = r0 + kh; c1 = c0 + kw

        R0 = max(0, r0); C0 = max(0, c0)
        R1 = min(self.H, r1); C1 = min(self.W, c1)

        if R0 >= R1 or C0 >= C1:
            return

        kR0 = R0 - r0; kC0 = C0 - c0
        kR1 = kR0 + (R1 - R0); kC1 = kC0 + (C1 - C0)

        self.wafer[R0:R1, C0:C1] += dose_scale * self.psf[kR0:kR1, kC0:kC1]

    def plan_path(self, mask: np.ndarray):
        coords = np.argwhere(mask > 0)
        if coords.size == 0:
            return []
        start_idx = int(np.lexsort((coords[:,1], coords[:,0]))[0])
        path = [tuple(coords[start_idx])]
        used = np.zeros(len(coords), dtype=bool)
        used[start_idx] = True
        cur = coords[start_idx]
        for _ in range(len(coords)-1):
            d2 = np.sum((coords - cur).astype(np.float32)**2, axis=1)
            d2[used] = np.inf
            ni = int(np.argmin(d2))
            used[ni] = True
            cur = coords[ni]
            path.append(tuple(cur))
        return path

    def run(self, dwell=1.0, max_passes=3):
        frames = []
        path = self.plan_path(self.target)
        if not path:
            return frames
        for p in range(max_passes):
            for (r,c) in path:
                self._stamp(int(r), int(c), dose_scale=dwell)
            frames.append((np.clip(self.wafer / self.exposure_target, 0, 2.0)*127.5).astype(np.uint8))
            dose_at_targets = self.wafer[self.target > 0]
            if dose_at_targets.size > 0:
                ok = (dose_at_targets >= self.exposure_target*0.9) & (dose_at_targets <= self.exposure_target*1.2)
                if np.all(ok):
                    break
        return frames

def ebeam_simulate(mask_list, exposure_target=1.0, psf_size=11, psf_sigma=1.8, dwell=1.0, max_passes=3, thresh_low=0.9, thresh_high=1.2):
    mask = np.array(mask_list, dtype=np.uint8)
    H, W = mask.shape
    sim = EBeamLite(wafer_dim=(H,W), psf_size=psf_size, psf_sigma=psf_sigma, exposure_target=exposure_target, thresh_low=thresh_low, thresh_high=thresh_high)
    sim.set_target(mask)
    frames = sim.run(dwell=dwell, max_passes=max_passes)
    return [frame.tolist() for frame in frames]


# ========================= Physically-aware interface =========================
def ebeam_simulate_phys(
    mask_list,
    beam_current_uA: float,
    min_spot_radius_nm: float,
    cnt_grid_rows: int, cnt_grid_cols: int,
    cnt_spacing_nm_x: float, cnt_spacing_nm_y: float,
    wafer_w_nm: float, wafer_h_nm: float,
    required_dose_uC_cm2: float,
    motor_min_step_nm: float,
    motor_max_velocity_nm_s: float,
    passes: int = 3,
    tolerance: float = 0.10
):
    """Run an e-beam simulation with real-world-ish units (see earlier message)."""
    import numpy as np

    mask = np.array(mask_list, dtype=np.uint8)
    H, W = mask.shape
    pix_nm_x = wafer_w_nm / float(W)
    pix_nm_y = wafer_h_nm / float(H)
    pix_nm = float((pix_nm_x + pix_nm_y) / 2.0)

    sigma_px = max(min_spot_radius_nm / pix_nm, 0.5)
    ksize = int(np.ceil(6.0 * sigma_px) // 2 * 2 + 1)
    ax = np.arange(ksize, dtype=np.float32) - (ksize - 1) / 2.0
    xx, yy = np.meshgrid(ax, ax, indexing="xy")
    psf = np.exp(-(xx**2 + yy**2) / (2.0 * (sigma_px**2))).astype(np.float32)
    psf /= psf.sum()

    dose_target_C_cm2 = required_dose_uC_cm2 * 1e-6
    pix_area_cm2 = (pix_nm * 1e-7) ** 2
    charge_target_per_pixel = dose_target_C_cm2 * pix_area_cm2

    wafer_Q = np.zeros((H, W), dtype=np.float32)
    coords = np.argwhere(mask > 0)
    frames = []
    if coords.size == 0:
        return [], {
            "note": "Empty mask",
            "pix_nm": pix_nm, "sigma_px": float(sigma_px), "ksize": int(ksize),
            "serial_time_s": 0.0, "parallel_time_s": 0.0
        }

    start_idx = int(np.lexsort((coords[:,1], coords[:,0]))[0])
    path = [tuple(coords[start_idx])]
    used = np.zeros(len(coords), dtype=bool)
    used[start_idx] = True
    cur = coords[start_idx]
    for _ in range(len(coords)-1):
        d2 = np.sum((coords - cur).astype(np.float32)**2, axis=1)
        d2[used] = np.inf
        ni = int(np.argmin(d2))
        used[ni] = True
        cur = coords[ni]
        path.append(tuple(cur))

    I = beam_current_uA * 1e-6
    kcenter = float(psf[ksize//2, ksize//2])
    dwell_per_stamp_s = charge_target_per_pixel / (I * max(kcenter, 1e-9) * passes)

    serial_dwell_time = 0.0
    serial_travel_time = 0.0

    def stamp(r, c, dwell_s):
        nonlocal serial_dwell_time
        Q = I * dwell_s
        rh = ksize // 2; rw = ksize // 2
        r0 = r - rh; c0 = c - rw
        r1 = r0 + ksize; c1 = c0 + ksize
        R0 = max(0, r0); C0 = max(0, c0)
        R1 = min(H, r1); C1 = min(W, c1)
        kR0 = R0 - r0; kC0 = C0 - c0
        kR1 = kR0 + (R1 - R0); kC1 = kC0 + (C1 - C0)
        wafer_Q[R0:R1, C0:C1] += Q * psf[kR0:kR1, kC0:kC1]
        serial_dwell_time += dwell_s

    def travel_time_nm(p0, p1):
        dr = abs(p1[0] - p0[0]); dc = abs(p1[1] - p0[1])
        dist_px = (dr**2 + dc**2) ** 0.5
        dist_nm = dist_px * pix_nm
        steps = int(np.ceil(dist_nm / max(motor_min_step_nm, 1e-9)))
        dist_q_nm = steps * motor_min_step_nm
        return dist_q_nm

    prev = path[0]
    for p in range(passes):
        if p == 0:
            stamp(prev[0], prev[1], dwell_per_stamp_s)
        for idx in range(1, len(path)):
            cur = path[idx]
            dist_nm = travel_time_nm(prev, cur)
            serial_travel_time += dist_nm / max(motor_max_velocity_nm_s, 1e-9)
            stamp(cur[0], cur[1], dwell_per_stamp_s)
            prev = cur

        dose_ratio = wafer_Q / max(charge_target_per_pixel, 1e-12)
        frames.append((np.clip(dose_ratio, 0, 2.0) * 127.5).astype(np.uint8))

        if np.all((dose_ratio[mask > 0] >= (1.0 - tolerance)) & (dose_ratio[mask > 0] <= (1.0 + tolerance))):
            break

    serial_time_s = serial_travel_time + serial_dwell_time
    parallel_factor = max(int(cnt_grid_rows) * int(cnt_grid_cols), 1)
    parallel_time_s = serial_time_s / float(parallel_factor)

    derived = {
        "pix_nm": float(pix_nm),
        "sigma_px": float(sigma_px),
        "ksize": int(ksize),
        "beam_current_uA": float(beam_current_uA),
        "charge_target_per_pixel_C": float(charge_target_per_pixel),
        "serial_dwell_time_s": float(serial_dwell_time),
        "serial_travel_time_s": float(serial_travel_time),
        "serial_time_s": float(serial_time_s),
        "parallel_factor": int(parallel_factor),
        "parallel_time_s": float(parallel_time_s),
        "cnt_grid_shape": [int(cnt_grid_rows), int(cnt_grid_cols)],
        "cnt_spacing_nm": [float(cnt_spacing_nm_x), float(cnt_spacing_nm_y)],
        "wafer_nm": [float(wafer_w_nm), float(wafer_h_nm)],
        "passes": int(passes),
        "tolerance": float(tolerance),
    }
    debug = {
        "path": [tuple(map(int, p)) for p in path],
        "final_dose_ratio": dose_ratio.astype(float).tolist(),
        "dwell_per_stamp_s": float(dwell_per_stamp_s)
    }
    return [frame.tolist() for frame in frames], derived, debug
