
import numpy as np

def _smooth(arr, rounds=1):
    out = arr.astype(float)
    for _ in range(max(0, rounds)):
        out = (
            out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)
        ) / 5.0
    return out


def ebeam_simulate_phys(
    mask_js,
    beam_current_uA,
    min_spot_radius_nm,
    cnt_grid_rows,
    cnt_grid_cols,
    cnt_spacing_nm_x,
    cnt_spacing_nm_y,
    wafer_w_nm,
    wafer_h_nm,
    required_dose_uC_cm2,
    motor_min_step_nm,
    motor_max_velocity_nm_s,
    passes=3,
    tolerance=0.10,
):
    mask = np.array(mask_js, dtype=float)
    if mask.ndim != 2:
        mask = np.zeros((50, 50), dtype=float)
    mask = (mask > 0).astype(float)
    h, w = mask.shape
    yy, xx = np.mgrid[0:h, 0:w]
    active = np.argwhere(mask > 0)

    if active.size:
        center = active.mean(axis=0)
        dist = np.sqrt((yy - center[0])**2 + (xx - center[1])**2)
    else:
        center = np.array([h/2, w/2])
        dist = np.sqrt((yy - center[0])**2 + (xx - center[1])**2)

    rank = np.argsort(dist[mask > 0]) if active.size else np.array([], dtype=int)
    active_flat = np.flatnonzero(mask.ravel() > 0)
    ordered = active_flat[rank] if active.size else np.array([], dtype=int)

    n_frames = max(18, int(max(2, passes) * 10))
    frames = []
    current = np.zeros_like(mask)
    for i in range(n_frames):
        frac = (i + 1) / n_frames
        if ordered.size:
            take = max(1, int(np.ceil(frac * ordered.size)))
            current[:] = 0
            current.ravel()[ordered[:take]] = 1.0
            glow = _smooth(current, rounds=2)
            frame = np.clip(255 * glow / max(glow.max(), 1e-9), 0, 255).astype(int)
        else:
            frame = np.zeros_like(mask, dtype=int)
        frames.append(frame.tolist())

    cell_w_nm = wafer_w_nm / max(w, 1)
    cell_h_nm = wafer_h_nm / max(h, 1)
    selected_cells = int(mask.sum())
    selected_area_cm2 = selected_cells * (cell_w_nm * 1e-7) * (cell_h_nm * 1e-7)
    dose_uC = required_dose_uC_cm2 * selected_area_cm2
    beam_current_A = max(beam_current_uA, 1e-9) * 1e-6
    serial_time_s = (dose_uC * 1e-6) / beam_current_A if beam_current_A > 0 else 0.0
    parallel_factor = max(1, int(cnt_grid_rows * cnt_grid_cols))
    parallel_time_s = serial_time_s / parallel_factor
    stage_steps_x = int(np.ceil(wafer_w_nm / max(motor_min_step_nm, 1)))
    stage_steps_y = int(np.ceil(wafer_h_nm / max(motor_min_step_nm, 1)))

    derived = {
        'selected_cells': selected_cells,
        'fill_fraction': float(mask.mean()),
        'beam_current_uA': float(beam_current_uA),
        'minimum_spot_radius_nm': float(min_spot_radius_nm),
        'dose_uC_total': float(dose_uC),
        'serial_time_s': float(serial_time_s),
        'parallel_factor': int(parallel_factor),
        'parallel_time_s': float(parallel_time_s),
        'stage_steps_x': int(stage_steps_x),
        'stage_steps_y': int(stage_steps_y),
        'motor_max_velocity_nm_s': float(motor_max_velocity_nm_s),
        'passes': int(passes),
        'tolerance': float(tolerance),
    }
    debug = {
        'grid_shape': [int(h), int(w)],
        'cell_pitch_nm': [float(cell_w_nm), float(cell_h_nm)],
        'cnt_array': [int(cnt_grid_rows), int(cnt_grid_cols)],
        'cnt_spacing_nm': [float(cnt_spacing_nm_x), float(cnt_spacing_nm_y)],
    }
    return frames, derived, debug
