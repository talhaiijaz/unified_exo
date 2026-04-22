
import copy
import json
import math
import time
from dataclasses import dataclass

import numpy as np
import pandas as pd

from scipy import sparse
from scipy.integrate import solve_ivp
from scipy.interpolate import RectBivariateSpline
from scipy.sparse.linalg import spsolve


EPS0 = 8.8541878128e-12
E_CHARGE = 1.602176634e-19
M_E = 9.1093837015e-31
C_LIGHT = 299792458.0
M_E_C2 = M_E * C_LIGHT * C_LIGHT
Q_ELECTRON = -E_CHARGE

A_FN = 1.541434e-6
B_FN = 6.830890e9

_DEFAULTS = {
    "voltages": {
        "V_CNT": 1500.0,
        "V_MID": 20000.0,
    },
    "geometry": {
        "a_inner": 0.50e-3,
        "r_stack_outer": 1.10e-3,
        "t_e": 0.10e-3,
        "edge_radius": 0.03e-3,
        "d1": 0.35e-3,
        "d2": 0.45e-3,
        "d3": 0.45e-3,
    },
    "dielectric": {
        "eps_r_oxide": 3.9,
        "fill_stack_with_oxide": True,
    },
    "emitter": {
        "R_forest": 0.42e-3,
        "h_forest": 60e-6,
        "forest_edge_radius": 20e-6,
        "emission_edge_exclusion": 25e-6,
    },
    "emission": {
        "work_function_eV": 4.8,
        "beta_forest_eff": 250.0,
        "tip_areal_density": 5.0e12,
        "tip_apex_radius": 8.0e-9,
    },
    "domain": {
        "R_outer": 1.60e-3,
        "z_extra": 1.80e-3,
    },
    "grid": {
        "Nr": 181,
        "Nz": 421,
    },
    "trace": {
        "mode": "emission_all_faces",
        "n_rays": 15,
        "n_subrays_per_face": 1,
        "initial_energy_eV": 0.2,
        "z_offset": 5.0e-9,
        "symmetric": False,
        "angle_mode": "gaussian",
        "angle_sigma_deg": 2.0,
        "angle_max_deg": 8.0,
        "launch_half_angle_deg": 0.0,
        "energy_mode": "gaussian",
        "energy_sigma_eV": 0.10,
        "energy_min_eV": 0.01,
        "rng_seed": 12345,
        "t_max": 5.0e-9,
        "max_step": 5.0e-12,
        "rtol": 1.0e-9,
        "atol_xz": 1.0e-12,
        "atol_p": 1.0e-30,
        "max_plot_points_per_ray": 300,
    },
}

_LAST_CASE = None
_LAST_FLAT_CONFIG = None


def deep_merge(base, updates):
    out = copy.deepcopy(base)
    for key, value in (updates or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def get_default_config():
    return copy.deepcopy(_DEFAULTS)


def config_with_defaults(user_config=None):
    return deep_merge(_DEFAULTS, user_config or {})


def flatten_config(config):
    cfg = config_with_defaults(config)
    flat = {}
    for section in ["voltages", "geometry", "dielectric", "emitter", "emission", "domain", "grid", "trace"]:
        flat.update(cfg.get(section, {}))
    return refresh_derived_geometry_params(flat), cfg


def refresh_derived_geometry_params(params):
    p = copy.deepcopy(params)
    p["z1_start"] = p["d1"]
    p["z1_end"] = p["z1_start"] + p["t_e"]
    p["z2_start"] = p["z1_end"] + p["d2"]
    p["z2_end"] = p["z2_start"] + p["t_e"]
    p["z3_start"] = p["z2_end"] + p["d3"]
    p["z3_end"] = p["z3_start"] + p["t_e"]
    return p


def trapz_compat(y, x):
    try:
        return np.trapezoid(y, x)
    except AttributeError:
        return np.trapz(y, x)


def rect_sdf(r, z, r0, r1, z0, z1):
    cx = 0.5 * (r0 + r1)
    cz = 0.5 * (z0 + z1)
    hx = 0.5 * (r1 - r0)
    hz = 0.5 * (z1 - z0)
    qx = abs(r - cx) - hx
    qz = abs(z - cz) - hz
    return math.hypot(max(qx, 0.0), max(qz, 0.0)) + min(max(qx, qz), 0.0)


def disk_sdf(r, z, rc, zc, rad):
    return math.hypot(r - rc, z - zc) - rad


def rounded_rect_sdf(r, z, r0, r1, z0, z1, rad):
    cx = 0.5 * (r0 + r1)
    cz = 0.5 * (z0 + z1)
    hx = 0.5 * (r1 - r0)
    hz = 0.5 * (z1 - z0)
    rad = max(0.0, min(rad, hx, hz))
    qx = abs(r - cx) - (hx - rad)
    qz = abs(z - cz) - (hz - rad)
    return math.hypot(max(qx, 0.0), max(qz, 0.0)) + min(max(qx, qz), 0.0) - rad


def forest_sdf(r, z, R_forest, h_forest, corner_radius):
    if corner_radius <= 0.0:
        return rect_sdf(r, z, 0.0, R_forest, 0.0, h_forest)
    corner_radius = min(corner_radius, R_forest, h_forest)
    d1 = rect_sdf(r, z, 0.0, R_forest, 0.0, max(h_forest - corner_radius, 0.0))
    d2 = rect_sdf(
        r,
        z,
        0.0,
        max(R_forest - corner_radius, 0.0),
        max(h_forest - corner_radius, 0.0),
        h_forest,
    )
    d3 = disk_sdf(
        r,
        z,
        max(R_forest - corner_radius, 0.0),
        max(h_forest - corner_radius, 0.0),
        corner_radius,
    )
    return min(d1, d2, d3)


def min_conductor_sdf(x, z, params):
    r = abs(x)
    return min(
        forest_sdf(r, z, params["R_forest"], params["h_forest"], params["forest_edge_radius"]),
        rounded_rect_sdf(
            r, z,
            params["a_inner"], params["r_stack_outer"],
            params["z1_start"], params["z1_end"],
            params["edge_radius"],
        ),
        rounded_rect_sdf(
            r, z,
            params["a_inner"], params["r_stack_outer"],
            params["z2_start"], params["z2_end"],
            params["edge_radius"],
        ),
        rounded_rect_sdf(
            r, z,
            params["a_inner"], params["r_stack_outer"],
            params["z3_start"], params["z3_end"],
            params["edge_radius"],
        ),
    )


def rounded_rect_mask(RR, ZZ, r0, r1, z0, z1, rad):
    cx = 0.5 * (r0 + r1)
    cz = 0.5 * (z0 + z1)
    hx = 0.5 * (r1 - r0)
    hz = 0.5 * (z1 - z0)
    rad = max(0.0, min(rad, hx, hz))
    qx = np.abs(RR - cx) - (hx - rad)
    qz = np.abs(ZZ - cz) - (hz - rad)
    sdf = np.sqrt(np.maximum(qx, 0.0) ** 2 + np.maximum(qz, 0.0) ** 2) + np.minimum(np.maximum(qx, qz), 0.0) - rad
    return sdf <= 0.0


def forest_mask_macro(RR, ZZ, R_forest, h_forest, rc):
    if rc <= 0.0:
        return (RR <= R_forest) & (ZZ <= h_forest)
    rc = min(rc, R_forest, h_forest)
    vertical = (RR <= R_forest) & (ZZ <= max(h_forest - rc, 0.0))
    top_inner = (RR <= max(R_forest - rc, 0.0)) & (ZZ <= h_forest)
    corner = (
        ((RR - (R_forest - rc)) ** 2 + (ZZ - (h_forest - rc)) ** 2 <= rc ** 2)
        & (RR >= max(R_forest - rc, 0.0))
        & (ZZ >= max(h_forest - rc, 0.0))
    )
    return vertical | top_inner | corner


def build_geometry(r, z, params):
    RR, ZZ = np.meshgrid(r, z, indexing="ij")
    Nr, Nz = RR.shape
    eps_rel = np.ones((Nr, Nz), dtype=float)
    material_id = np.zeros((Nr, Nz), dtype=np.int8)
    is_dir = np.zeros((Nr, Nz), dtype=bool)
    V_bc = np.zeros((Nr, Nz), dtype=float)
    conductor_id = np.zeros((Nr, Nz), dtype=np.int8)

    is_dir[:, 0] = True
    V_bc[:, 0] = -params["V_CNT"]
    conductor_id[:, 0] = 1

    is_dir[-1, :] = True
    V_bc[-1, :] = 0.0
    is_dir[:, -1] = True
    V_bc[:, -1] = 0.0

    if params["fill_stack_with_oxide"]:
        stack_oxide = (
            (RR >= params["a_inner"])
            & (RR <= params["r_stack_outer"])
            & (ZZ >= 0.0)
            & (ZZ <= params["z3_end"])
        )
        material_id[stack_oxide] = 1
        eps_rel[stack_oxide] = params["eps_r_oxide"]

    forest_mask = forest_mask_macro(
        RR,
        ZZ,
        params["R_forest"],
        params["h_forest"],
        params["forest_edge_radius"],
    )
    is_dir[forest_mask] = True
    V_bc[forest_mask] = -params["V_CNT"]
    conductor_id[forest_mask] = 1
    material_id[forest_mask] = 0
    eps_rel[forest_mask] = 1.0

    e1_mask = rounded_rect_mask(
        RR, ZZ,
        params["a_inner"], params["r_stack_outer"],
        params["z1_start"], params["z1_end"],
        params["edge_radius"],
    )
    e2_mask = rounded_rect_mask(
        RR, ZZ,
        params["a_inner"], params["r_stack_outer"],
        params["z2_start"], params["z2_end"],
        params["edge_radius"],
    )
    e3_mask = rounded_rect_mask(
        RR, ZZ,
        params["a_inner"], params["r_stack_outer"],
        params["z3_start"], params["z3_end"],
        params["edge_radius"],
    )

    for mask, cid, val in [
        (e1_mask, 2, 0.0),
        (e2_mask, 3, params["V_MID"]),
        (e3_mask, 4, 0.0),
    ]:
        is_dir[mask] = True
        V_bc[mask] = val
        conductor_id[mask] = cid
        material_id[mask] = 0
        eps_rel[mask] = 1.0

    return {
        "RR": RR,
        "ZZ": ZZ,
        "eps_rel": eps_rel,
        "material_id": material_id,
        "is_dir": is_dir,
        "V_bc": V_bc,
        "conductor_id": conductor_id,
        "forest_mask": forest_mask,
    }


def build_axisymmetric_eps_matrix(r, z, eps_rel, is_dir, V_bc):
    Nr, Nz = len(r), len(z)
    dr = r[1] - r[0]
    dz = z[1] - z[0]
    eps = EPS0 * eps_rel

    unknown_id = -np.ones((Nr, Nz), dtype=int)
    coords = []
    k = 0
    for i in range(Nr):
        for j in range(Nz):
            if not is_dir[i, j]:
                unknown_id[i, j] = k
                coords.append((i, j))
                k += 1

    rows, cols, data = [], [], []
    b = np.zeros(k, dtype=float)

    def add_neighbor(eq, ii, jj, coeff):
        if is_dir[ii, jj]:
            b[eq] -= coeff * V_bc[ii, jj]
        else:
            rows.append(eq)
            cols.append(unknown_id[ii, jj])
            data.append(coeff)

    for eq, (i, j) in enumerate(coords):
        rows.append(eq)
        cols.append(eq)

        if i == 0:
            eps_rph = 2.0 * eps[i, j] * eps[i + 1, j] / (eps[i, j] + eps[i + 1, j])
            eps_zm = 2.0 * eps[i, j] * eps[i, j - 1] / (eps[i, j] + eps[i, j - 1])
            eps_zp = 2.0 * eps[i, j] * eps[i, j + 1] / (eps[i, j] + eps[i, j + 1])

            c_rp = 2.0 * eps_rph / dr ** 2
            c_zm = eps_zm / dz ** 2
            c_zp = eps_zp / dz ** 2
            c_0 = -(c_rp + c_zm + c_zp)

            data.append(c_0)
            add_neighbor(eq, i + 1, j, c_rp)
            add_neighbor(eq, i, j - 1, c_zm)
            add_neighbor(eq, i, j + 1, c_zp)
        else:
            ri = r[i]
            rph = ri + 0.5 * dr
            rmh = ri - 0.5 * dr

            eps_rph = 2.0 * eps[i, j] * eps[i + 1, j] / (eps[i, j] + eps[i + 1, j])
            eps_rmh = 2.0 * eps[i, j] * eps[i - 1, j] / (eps[i, j] + eps[i - 1, j])
            eps_zm = 2.0 * eps[i, j] * eps[i, j - 1] / (eps[i, j] + eps[i, j - 1])
            eps_zp = 2.0 * eps[i, j] * eps[i, j + 1] / (eps[i, j] + eps[i, j + 1])

            c_rp = rph * eps_rph / (ri * dr ** 2)
            c_rm = rmh * eps_rmh / (ri * dr ** 2)
            c_zm = eps_zm / dz ** 2
            c_zp = eps_zp / dz ** 2
            c_0 = -(c_rp + c_rm + c_zm + c_zp)

            data.append(c_0)
            add_neighbor(eq, i + 1, j, c_rp)
            add_neighbor(eq, i - 1, j, c_rm)
            add_neighbor(eq, i, j - 1, c_zm)
            add_neighbor(eq, i, j + 1, c_zp)

    A = sparse.csr_matrix((data, (rows, cols)), shape=(k, k))
    return A, b, unknown_id


def scatter_solution_to_grid(x, is_dir, V_bc, unknown_id):
    V = V_bc.copy().astype(float)
    mask = unknown_id >= 0
    V[mask] = x[unknown_id[mask]]
    return V


def solve_direct(A, b, is_dir, V_bc, unknown_id):
    t0 = time.perf_counter()
    x = spsolve(A, b)
    elapsed = time.perf_counter() - t0
    V = scatter_solution_to_grid(x, is_dir, V_bc, unknown_id)
    return V, elapsed


def compute_electric_field(V, dr, dz):
    dVdr, dVdz = np.gradient(V, dr, dz, edge_order=2)
    Er = -dVdr
    Ez = -dVdz
    Emag = np.sqrt(Er ** 2 + Ez ** 2)
    return Er, Ez, Emag


def get_forest_top_faces(case, params):
    r = case["r"]
    z = case["z"]
    geom = case["geom"]
    forest = geom["forest_mask"]
    cid = geom["conductor_id"]
    records = []
    exclude_edge = params["emission_edge_exclusion"]

    for i in range(len(r)):
        js = np.where(forest[i, :])[0]
        if len(js) == 0:
            continue
        j = js.max()
        if j >= len(z) - 1:
            continue
        if cid[i, j + 1] == 1:
            continue
        if r[i] > params["R_forest"] - exclude_edge:
            continue
        records.append((i, j, r[i], z[j], z[j + 1]))

    return pd.DataFrame(records, columns=["i", "j", "r", "z_surface", "z_above"])


def compute_forest_emission(case, params):
    faces_df = get_forest_top_faces(case, params).copy()
    eta_emit = min(params["tip_areal_density"] * np.pi * params["tip_apex_radius"] ** 2, 1.0)

    if len(faces_df) == 0:
        return {
            "faces_df": faces_df,
            "eta_emit": eta_emit,
            "I_total": 0.0,
            "F_macro_mean": 0.0,
            "F_macro_p95": 0.0,
            "F_eff_mean": 0.0,
            "F_eff_p95": 0.0,
        }

    Ez = case["Ez_direct"]
    dr = case["dr"]

    F_macro = []
    F_eff = []
    J_FN = []
    dA = []

    for row in faces_df.itertuples(index=False):
        i = int(row.i)
        j = int(row.j)

        Fm = max(-Ez[i, j + 1], 0.0)
        Fe = params["beta_forest_eff"] * Fm

        if Fe <= 0.0:
            J = 0.0
        else:
            exponent = -B_FN * (params["work_function_eV"] ** 1.5) / Fe
            exponent = max(exponent, -700.0)
            J = A_FN * (Fe ** 2 / params["work_function_eV"]) * np.exp(exponent)

        area_ring = 2.0 * np.pi * row.r * dr
        if row.r == 0.0:
            area_ring = np.pi * dr ** 2

        F_macro.append(Fm)
        F_eff.append(Fe)
        J_FN.append(J)
        dA.append(area_ring)

    faces_df["F_macro"] = np.asarray(F_macro)
    faces_df["F_eff"] = np.asarray(F_eff)
    faces_df["J_FN"] = np.asarray(J_FN)
    faces_df["dA"] = np.asarray(dA)
    faces_df["I_ring"] = eta_emit * faces_df["J_FN"] * faces_df["dA"]

    return {
        "faces_df": faces_df,
        "eta_emit": eta_emit,
        "I_total": float(faces_df["I_ring"].sum()),
        "F_macro_mean": float(faces_df["F_macro"].mean()),
        "F_macro_p95": float(np.percentile(faces_df["F_macro"], 95)),
        "F_eff_mean": float(faces_df["F_eff"].mean()),
        "F_eff_p95": float(np.percentile(faces_df["F_eff"], 95)),
    }


def validate_device_inputs(params):
    errors = []
    warnings = []

    positive_keys = [
        "V_CNT", "a_inner", "r_stack_outer", "t_e", "d1", "d2", "d3", "eps_r_oxide",
        "R_forest", "h_forest", "work_function_eV", "beta_forest_eff", "tip_areal_density",
        "tip_apex_radius", "R_outer", "z_extra",
    ]
    for key in positive_keys:
        if params[key] <= 0.0:
            errors.append(f"{key} must be positive, got {params[key]!r}")

    if params["r_stack_outer"] <= params["a_inner"]:
        errors.append("r_stack_outer must be larger than a_inner.")
    if params["emission_edge_exclusion"] < 0.0:
        errors.append("emission_edge_exclusion must be nonnegative.")
    if params["R_forest"] - params["emission_edge_exclusion"] <= 0.0:
        errors.append("R_forest - emission_edge_exclusion must be positive.")
    if params["R_outer"] <= params["r_stack_outer"]:
        errors.append("R_outer must be larger than r_stack_outer.")
    if params["edge_radius"] > 0.5 * min(params["t_e"], params["r_stack_outer"] - params["a_inner"]):
        warnings.append("edge_radius is large relative to the electrode thickness or wall width.")
    if params["R_forest"] >= params["a_inner"]:
        warnings.append("R_forest >= a_inner, so the emitter fills or overfills the aperture.")
    if params["R_outer"] < 1.2 * params["r_stack_outer"]:
        warnings.append("R_outer is only slightly larger than the electrode stack radius; boundary effects may be stronger.")
    return errors, warnings


def resolution_diagnostic_table(params):
    Nr = int(params["Nr"])
    Nz = int(params["Nz"])
    z_max = params["z3_end"] + params["z_extra"]
    dr = params["R_outer"] / max(Nr - 1, 1)
    dz = z_max / max(Nz - 1, 1)

    radial_features = [
        ("a_inner", params["a_inner"], dr),
        ("wall_width", params["r_stack_outer"] - params["a_inner"], dr),
        ("R_forest", params["R_forest"], dr),
        ("active_launch_radius", params["R_forest"] - params["emission_edge_exclusion"], dr),
        ("edge_radius", params["edge_radius"], dr),
        ("forest_edge_radius", params["forest_edge_radius"], dr),
    ]
    axial_features = [
        ("t_e", params["t_e"], dz),
        ("d1", params["d1"], dz),
        ("d2", params["d2"], dz),
        ("d3", params["d3"], dz),
        ("h_forest", params["h_forest"], dz),
    ]

    rows = []
    for name, scale, spacing in radial_features + axial_features:
        if scale <= 0.0:
            cells = np.nan
            verdict = "n/a"
        else:
            cells = scale / spacing
            if cells < 2.0:
                verdict = "under-resolved"
            elif cells < 5.0:
                verdict = "coarse"
            else:
                verdict = "okay"
        rows.append({
            "feature": name,
            "feature_size_m": float(scale),
            "grid_spacing_m": float(spacing),
            "cells_across_feature": float(cells) if np.isfinite(cells) else None,
            "verdict": verdict,
        })
    return rows


def build_case(params):
    z_max = params["z3_end"] + params["z_extra"]
    r = np.linspace(0.0, params["R_outer"], int(params["Nr"]))
    z = np.linspace(0.0, z_max, int(params["Nz"]))
    dr = r[1] - r[0]
    dz = z[1] - z[0]

    geom = build_geometry(r, z, params)
    A, b, unknown_id = build_axisymmetric_eps_matrix(r, z, geom["eps_rel"], geom["is_dir"], geom["V_bc"])
    V_direct, t_direct = solve_direct(A, b, geom["is_dir"], geom["V_bc"], unknown_id)
    Er_direct, Ez_direct, E_direct = compute_electric_field(V_direct, dr, dz)

    out = {
        "r": r,
        "z": z,
        "dr": dr,
        "dz": dz,
        "geom": geom,
        "V_direct": V_direct,
        "Er_direct": Er_direct,
        "Ez_direct": Ez_direct,
        "E_direct": E_direct,
        "t_direct": t_direct,
        "R_outer": params["R_outer"],
        "z_extra": params["z_extra"],
        "Nr": int(params["Nr"]),
        "Nz": int(params["Nz"]),
    }

    emission = compute_forest_emission(out, params)
    out["emission"] = emission

    z_interest = z[z <= params["z3_end"] + min(params["z_extra"], 0.6e-3)]
    V_axis = np.interp(z_interest, z, V_direct[0, :])
    Ez_axis = np.interp(z_interest, z, Ez_direct[0, :])

    observables = {
        "axisV_peak_V": float(V_axis.max()),
        "z_axisV_peak_m": float(z_interest[np.argmax(V_axis)]),
        "axis_field_integral_V": float(trapz_compat(Ez_axis, z_interest)),
        "forest_macroF_mean_Vm": float(emission["F_macro_mean"]),
        "forest_macroF_p95_Vm": float(emission["F_macro_p95"]),
        "I_FN_total_A": float(emission["I_total"]),
    }
    out["observables"] = observables
    return out


def gamma_from_momentum(px, pz):
    px = np.asarray(px, dtype=float)
    pz = np.asarray(pz, dtype=float)
    p2 = px * px + pz * pz
    return np.sqrt(1.0 + p2 / (M_E * M_E * C_LIGHT * C_LIGHT))


def velocities_from_momentum(px, pz):
    gamma = gamma_from_momentum(px, pz)
    denom = gamma * M_E
    return px / denom, pz / denom


def kinetic_energy_from_momentum(px, pz):
    gamma = gamma_from_momentum(px, pz)
    return (gamma - 1.0) * M_E_C2


def momentum_magnitude_from_kinetic_energy(E_eV):
    E_eV = np.asarray(E_eV, dtype=float)
    kinetic_J = np.maximum(E_eV, 0.0) * E_CHARGE
    gamma = 1.0 + kinetic_J / M_E_C2
    return M_E * C_LIGHT * np.sqrt(np.maximum(gamma * gamma - 1.0, 0.0))


class MeridionalPotentialInterpolator:
    def __init__(self, case, k=3):
        self.r = np.asarray(case["r"])
        self.z = np.asarray(case["z"])
        self.r_min = float(self.r[0])
        self.r_max = float(self.r[-1])
        self.z_min = float(self.z[0])
        self.z_max = float(self.z[-1])

        k_r = min(int(k), len(self.r) - 1)
        k_z = min(int(k), len(self.z) - 1)
        self.V_spline = RectBivariateSpline(self.r, self.z, case["V_direct"], kx=k_r, ky=k_z, s=0.0)

    def _clip(self, r_abs, z):
        eps_r = 1e-12 + 1e-9 * max(self.r_max - self.r_min, 1.0)
        eps_z = 1e-12 + 1e-9 * max(self.z_max - self.z_min, 1.0)
        r_abs = np.clip(r_abs, self.r_min, self.r_max - eps_r)
        z = np.clip(z, self.z_min, self.z_max - eps_z)
        return r_abs, z

    def potential(self, x, z):
        x = np.asarray(x)
        z = np.asarray(z)
        r_abs, z = self._clip(np.abs(x), z)
        return self.V_spline.ev(r_abs, z)

    def field(self, x, z):
        x = np.asarray(x)
        z = np.asarray(z)
        sign_x = np.sign(x)
        sign_x = np.where(sign_x == 0.0, 0.0, sign_x)
        r_abs, z = self._clip(np.abs(x), z)
        dVdr = self.V_spline.ev(r_abs, z, dx=1, dy=0)
        dVdz = self.V_spline.ev(r_abs, z, dx=0, dy=1)
        Ex = sign_x * (-dVdr)
        Ez = -dVdz
        return Ex, Ez


@dataclass
class LaunchConfig:
    n_rays: int = 201
    mode: str = "emission_all_faces"
    initial_energy_eV: float = 0.2
    launch_half_angle_deg: float = 0.0
    z_offset: float = 5.0e-9
    symmetric: bool = False
    n_subrays_per_face: int = 1
    angle_mode: str = "gaussian"
    angle_sigma_deg: float = 2.0
    angle_max_deg: float = 8.0
    energy_mode: str = "gaussian"
    energy_sigma_eV: float = 0.10
    energy_min_eV: float = 0.01
    rng_seed: int = 12345


def _surface_z_series(chosen, cfg):
    if "z_surface" in chosen.columns:
        return chosen["z_surface"].astype(float)
    if "z_above" in chosen.columns:
        return chosen["z_above"].astype(float) - float(cfg.z_offset)
    return pd.Series(np.zeros(len(chosen), dtype=float), index=chosen.index)


def _sample_launch_angles_deg(cfg, n, rng):
    if cfg.angle_mode == "delta":
        return np.full(n, cfg.launch_half_angle_deg, dtype=float)
    if cfg.angle_mode == "gaussian":
        theta_deg = rng.normal(0.0, cfg.angle_sigma_deg, n)
        return np.clip(theta_deg, -cfg.angle_max_deg, cfg.angle_max_deg)
    raise ValueError(f"Unknown angle_mode: {cfg.angle_mode}")


def _sample_launch_energies_eV(cfg, n, rng):
    if cfg.energy_mode == "delta":
        return np.full(n, cfg.initial_energy_eV, dtype=float)
    if cfg.energy_mode == "gaussian":
        E0 = rng.normal(cfg.initial_energy_eV, cfg.energy_sigma_eV, n)
        return np.clip(E0, cfg.energy_min_eV, None)
    raise ValueError(f"Unknown energy_mode: {cfg.energy_mode}")


def make_launch_bundle(case, params, cfg):
    faces = case["emission"]["faces_df"].copy()
    rng = np.random.default_rng(cfg.rng_seed)

    if cfg.mode == "uniform_radius":
        r_max = params["R_forest"] - params["emission_edge_exclusion"]
        if r_max <= 0.0:
            raise ValueError("uniform_radius launch requires a positive active launch radius.")
        u = (np.arange(cfg.n_rays, dtype=float) + 0.5) / cfg.n_rays
        radii = r_max * np.sqrt(u)
        chosen = pd.DataFrame({"r": radii, "weight": np.ones_like(radii, dtype=float)})
        chosen["z_surface"] = params["h_forest"]

    elif cfg.mode == "emission_quantiles":
        if len(faces) == 0:
            raise ValueError("No canopy faces were found for emission-weighted launching.")
        weights = faces["I_ring"].to_numpy(dtype=float)
        if (not np.isfinite(weights).all()) or (weights.sum() <= 0):
            weights = np.ones(len(faces), dtype=float)

        cdf = np.cumsum(weights) / np.sum(weights)
        targets = (np.arange(cfg.n_rays, dtype=float) + 0.5) / cfg.n_rays
        idx = np.searchsorted(cdf, targets, side="left")
        idx = np.clip(idx, 0, len(faces) - 1)
        chosen = faces.iloc[idx].copy().reset_index(drop=True)
        chosen["weight"] = np.ones(len(chosen), dtype=float)

    elif cfg.mode == "emission_all_faces":
        if len(faces) == 0:
            raise ValueError("No canopy faces were found for emission-weighted launching.")
        base = faces.loc[np.isfinite(faces["I_ring"]) & (faces["I_ring"] > 0.0)].copy().reset_index(drop=True)
        if len(base) == 0:
            raise ValueError("No emitting canopy faces with positive I_ring were found.")
        n_rep = max(int(cfg.n_subrays_per_face), 1)
        chosen = base.loc[base.index.repeat(n_rep)].copy().reset_index(drop=True)
        chosen["weight"] = np.repeat(base["I_ring"].to_numpy(dtype=float) / n_rep, n_rep)
    else:
        raise ValueError(f"Unknown launch mode: {cfg.mode}")

    chosen["x0"] = chosen["r"].astype(float)
    chosen["z0"] = _surface_z_series(chosen, cfg) + float(cfg.z_offset)

    theta_deg = _sample_launch_angles_deg(cfg, len(chosen), rng)
    theta = np.deg2rad(theta_deg)
    E0_eV = _sample_launch_energies_eV(cfg, len(chosen), rng)
    p0 = momentum_magnitude_from_kinetic_energy(E0_eV)

    chosen["theta0_deg"] = theta_deg
    chosen["E0_eV"] = E0_eV
    chosen["px0"] = p0 * np.sin(theta)
    chosen["pz0"] = p0 * np.cos(theta)
    chosen["vx0"], chosen["vz0"] = velocities_from_momentum(chosen["px0"].to_numpy(), chosen["pz0"].to_numpy())

    bundle_df = chosen.loc[:, [
        "x0", "z0", "px0", "pz0", "vx0", "vz0", "weight", "E0_eV", "theta0_deg"
    ]].copy().reset_index(drop=True)
    bundle_df.insert(0, "ray_id", np.arange(len(bundle_df), dtype=int))

    if cfg.symmetric:
        mirror_mask = bundle_df["x0"].to_numpy(dtype=float) > 0.0
        if np.any(mirror_mask):
            mirrored = bundle_df.loc[mirror_mask].copy().reset_index(drop=True)
            mirrored["x0"] *= -1.0
            mirrored["px0"] *= -1.0
            mirrored["vx0"] *= -1.0
            bundle_df = pd.concat([bundle_df, mirrored], ignore_index=True)
            bundle_df["ray_id"] = np.arange(len(bundle_df), dtype=int)

    return bundle_df


def trajectory_rhs(t, y, field_model):
    x, z, px, pz = y
    Ex, Ez = field_model.field(np.array([x]), np.array([z]))
    vx, vz = velocities_from_momentum(px, pz)
    return np.array([vx, vz, Q_ELECTRON * Ex[0], Q_ELECTRON * Ez[0]], dtype=float)


def make_events(field_model, params):
    def hit_conductor(t, y, *args):
        return min_conductor_sdf(y[0], y[1], params)
    hit_conductor.terminal = True
    hit_conductor.direction = -1

    def radial_exit(t, y, *args):
        return field_model.r_max - abs(y[0])
    radial_exit.terminal = True
    radial_exit.direction = -1

    def top_exit(t, y, *args):
        return field_model.z_max - y[1]
    top_exit.terminal = True
    top_exit.direction = -1

    def turnaround(t, y, *args):
        return y[3]
    turnaround.terminal = True
    turnaround.direction = -1

    return [hit_conductor, radial_exit, top_exit, turnaround]


def max_energy_error(solution, field_model):
    if solution.y.shape[1] == 0:
        return np.nan
    x = solution.y[0]
    z = solution.y[1]
    px = solution.y[2]
    pz = solution.y[3]
    K = kinetic_energy_from_momentum(px, pz)
    V = field_model.potential(x, z)
    total = K + Q_ELECTRON * V
    ref = total[0]
    denom = max(abs(ref), 1e-30)
    return float(np.max(np.abs(total - ref) / denom))


def trace_single_ray(ray_row, field_model, params, t_max, max_step, rtol, atol):
    y0 = np.array([ray_row.x0, ray_row.z0, ray_row.px0, ray_row.pz0], dtype=float)
    events = make_events(field_model, params)
    solution = solve_ivp(
        fun=trajectory_rhs,
        t_span=(0.0, t_max),
        y0=y0,
        args=(field_model,),
        method="DOP853",
        rtol=rtol,
        atol=atol,
        events=events,
        max_step=max_step,
        dense_output=False,
    )
    stop_reason = "t_max"
    stop_names = ["hit_conductor", "radial_exit", "top_exit", "turnaround"]
    for i, name in enumerate(stop_names):
        if len(solution.t_events[i]) > 0:
            stop_reason = name
            break
    return solution, stop_reason


def weighted_rms(x, w):
    x = np.asarray(x, dtype=float)
    w = np.asarray(w, dtype=float)
    if np.sum(w) <= 0.0:
        w = np.ones_like(x)
    return math.sqrt(np.sum(w * x * x) / np.sum(w))


def trace_bundle(bundle_df, field_model, params, t_max, max_step, rtol, atol, max_plot_points_per_ray=300):
    summaries = []
    plot_traces = []

    for row in bundle_df.itertuples(index=False):
        solution, stop_reason = trace_single_ray(
            row,
            field_model=field_model,
            params=params,
            t_max=t_max,
            max_step=max_step,
            rtol=rtol,
            atol=atol,
        )

        energy_err = max_energy_error(solution, field_model)
        vx_end, vz_end = velocities_from_momentum(solution.y[2, -1], solution.y[3, -1])

        summaries.append({
            "ray_id": int(row.ray_id),
            "x0": float(row.x0),
            "z0": float(row.z0),
            "weight": float(row.weight),
            "E0_eV": float(getattr(row, "E0_eV", np.nan)),
            "theta0_deg": float(getattr(row, "theta0_deg", np.nan)),
            "stop_reason": stop_reason,
            "x_end": float(solution.y[0, -1]),
            "z_end": float(solution.y[1, -1]),
            "vx_end": float(vx_end),
            "vz_end": float(vz_end),
            "t_end": float(solution.t[-1]),
            "n_steps": int(len(solution.t)),
            "max_energy_error": float(energy_err),
            "solution": solution,
        })

        idx = np.arange(len(solution.t))
        if len(idx) > max_plot_points_per_ray:
            idx = np.linspace(0, len(solution.t) - 1, max_plot_points_per_ray).astype(int)
        plot_traces.append({
            "ray_id": int(row.ray_id),
            "weight": float(row.weight),
            "stop_reason": stop_reason,
            "x_m": solution.y[0, idx].tolist(),
            "z_m": solution.y[1, idx].tolist(),
        })

    return pd.DataFrame(summaries), plot_traces


def interpolate_bundle_on_z(summary_df, z_eval):
    rows = []
    ok = summary_df[(summary_df["stop_reason"] == "top_exit") & summary_df["solution"].notna()].copy()
    for row in ok.itertuples(index=False):
        z_path = row.solution.y[1]
        x_path = row.solution.y[0]
        px_path = row.solution.y[2]
        pz_path = row.solution.y[3]
        vx_path, vz_path = velocities_from_momentum(px_path, pz_path)
        rows.append(pd.DataFrame({
            "ray_id": row.ray_id,
            "z": z_eval,
            "x": np.interp(z_eval, z_path, x_path),
            "vx": np.interp(z_eval, z_path, vx_path),
            "vz": np.interp(z_eval, z_path, vz_path),
            "x0": row.x0,
            "weight": row.weight,
        }))
    return pd.concat(rows, ignore_index=True) if rows else pd.DataFrame(columns=["ray_id", "z", "x", "vx", "vz", "x0", "weight"])


def beam_metrics_vs_z(bundle_on_z):
    rows = []
    for z_value, grp in bundle_on_z.groupby("z", sort=True):
        x = grp["x"].to_numpy()
        x0 = grp["x0"].to_numpy()
        w = grp["weight"].to_numpy()
        denom = np.sum(w * x0 * x0)
        m_fit = np.nan if denom <= 0.0 else np.sum(w * x * x0) / denom
        rows.append({
            "z": z_value,
            "rms_x": weighted_rms(x, w),
            "mean_abs_x": np.sum(w * np.abs(x)) / np.sum(w),
            "max_abs_x": np.max(np.abs(x)),
            "m_fit": m_fit,
        })
    return pd.DataFrame(rows)


def in_domain_focus_metrics(summary_df, params, n_eval=500):
    ok = summary_df[(summary_df["stop_reason"] == "top_exit") & summary_df["solution"].notna()].copy()
    if len(ok) < 3:
        return None, None, None

    z_start = max(float(params["z3_end"]), float(ok["z0"].max()))
    z_stop = float(ok["z_end"].min())
    if z_stop <= z_start:
        return None, None, None

    z_eval = np.linspace(z_start, z_stop, n_eval)
    bundle_on_z = interpolate_bundle_on_z(summary_df, z_eval)
    beam_df = beam_metrics_vs_z(bundle_on_z)

    idx = int(beam_df["rms_x"].idxmin())
    focus_row = beam_df.loc[idx].to_dict()
    focus_row["edge_limited"] = bool(idx == 0 or idx == len(beam_df) - 1)
    return focus_row, beam_df, bundle_on_z


def asymptotic_focus_metrics(summary_df):
    ok = summary_df[(summary_df["stop_reason"] == "top_exit") & summary_df["solution"].notna()].copy()
    if len(ok) < 2:
        return None, None

    rows = []
    for row in ok.itertuples(index=False):
        slope = row.vx_end / row.vz_end if abs(row.vz_end) > 0 else np.nan
        if not np.isfinite(slope) or abs(slope) < 1e-16:
            continue
        z_cross = row.z_end - row.x_end / slope
        if np.isfinite(z_cross):
            rows.append({
                "ray_id": row.ray_id,
                "x0": row.x0,
                "weight": row.weight,
                "slope_exit": slope,
                "z_cross": z_cross,
            })

    if len(rows) == 0:
        return None, None

    cross_df = pd.DataFrame(rows)
    weights = cross_df["weight"].to_numpy(dtype=float)
    z_cross = cross_df["z_cross"].to_numpy(dtype=float)
    if np.sum(weights) <= 0.0:
        weights = np.ones_like(z_cross)

    mu = float(np.average(z_cross, weights=weights))
    sigma = float(np.sqrt(np.average((z_cross - mu) ** 2, weights=weights)))
    return {"z_focus_asym": mu, "z_focus_asym_std": sigma}, cross_df


def summarize_run(summary_df, field_model, params):
    weights = summary_df["weight"].to_numpy(dtype=float)
    total_weight = float(np.sum(weights)) if len(weights) > 0 else 0.0
    energy_errors = summary_df["max_energy_error"].to_numpy(dtype=float)
    energy_errors = energy_errors[np.isfinite(energy_errors)]

    result = {
        "n_launch": int(len(summary_df)),
        "n_top_exit": int((summary_df["stop_reason"] == "top_exit").sum()),
        "n_hit_conductor": int((summary_df["stop_reason"] == "hit_conductor").sum()),
        "n_turnaround": int((summary_df["stop_reason"] == "turnaround").sum()),
        "n_radial_exit": int((summary_df["stop_reason"] == "radial_exit").sum()),
        "weight_launch": total_weight,
        "weight_top_exit": float(summary_df.loc[summary_df["stop_reason"] == "top_exit", "weight"].sum()),
        "weight_hit_conductor": float(summary_df.loc[summary_df["stop_reason"] == "hit_conductor", "weight"].sum()),
        "weight_turnaround": float(summary_df.loc[summary_df["stop_reason"] == "turnaround", "weight"].sum()),
        "weight_radial_exit": float(summary_df.loc[summary_df["stop_reason"] == "radial_exit", "weight"].sum()),
        "mean_energy_drift": float(np.mean(energy_errors)) if energy_errors.size else np.nan,
        "max_energy_drift": float(np.max(energy_errors)) if energy_errors.size else np.nan,
    }
    if total_weight > 0.0:
        result.update({
            "weight_top_exit_frac": result["weight_top_exit"] / total_weight,
            "weight_hit_conductor_frac": result["weight_hit_conductor"] / total_weight,
            "weight_turnaround_frac": result["weight_turnaround"] / total_weight,
            "weight_radial_exit_frac": result["weight_radial_exit"] / total_weight,
        })

    focus_row, beam_df, bundle_on_z = in_domain_focus_metrics(summary_df, params)
    if focus_row is not None:
        result.update({f"in_domain_{k}": v for k, v in focus_row.items()})

    asym_stats, cross_df = asymptotic_focus_metrics(summary_df)
    if asym_stats is not None:
        result.update(asym_stats)

    return result, beam_df, bundle_on_z, cross_df


def _plot_conductors_payload(params):
    return {
        "forest": {
            "radius_mm": params["R_forest"] * 1e3,
            "height_mm": params["h_forest"] * 1e3,
        },
        "electrodes": [
            {
                "name": "E1",
                "z_start_mm": params["z1_start"] * 1e3,
                "z_end_mm": params["z1_end"] * 1e3,
                "r_inner_mm": params["a_inner"] * 1e3,
                "r_outer_mm": params["r_stack_outer"] * 1e3,
                "voltage_V": 0.0,
            },
            {
                "name": "E2",
                "z_start_mm": params["z2_start"] * 1e3,
                "z_end_mm": params["z2_end"] * 1e3,
                "r_inner_mm": params["a_inner"] * 1e3,
                "r_outer_mm": params["r_stack_outer"] * 1e3,
                "voltage_V": params["V_MID"],
            },
            {
                "name": "E3",
                "z_start_mm": params["z3_start"] * 1e3,
                "z_end_mm": params["z3_end"] * 1e3,
                "r_inner_mm": params["a_inner"] * 1e3,
                "r_outer_mm": params["r_stack_outer"] * 1e3,
                "voltage_V": 0.0,
            },
        ],
        "domain": {
            "R_outer_mm": params["R_outer"] * 1e3,
            "z_max_mm": (params["z3_end"] + params["z_extra"]) * 1e3,
        },
    }


def _json_safe(val):
    if isinstance(val, np.generic):
        return val.item()
    if isinstance(val, np.ndarray):
        return val.tolist()
    return val


def _field_result_payload(case, params, warnings):
    z = case["z"]
    r = case["r"]
    V = case["V_direct"]
    E = case["E_direct"]
    axis_V = V[0, :]
    axis_Ez = case["Ez_direct"][0, :]
    positive_E = E[E > 0]
    field_floor = positive_E.min() if positive_E.size else 1e-30
    field_log10 = np.log10(np.maximum(E, field_floor))

    result = {
        "warnings": warnings,
        "solve_time_s": float(case["t_direct"]),
        "observables": {k: _json_safe(v) for k, v in case["observables"].items()},
        "resolution": resolution_diagnostic_table(params),
        "conductors": _plot_conductors_payload(params),
        "maps": {
            "z_mm": (z * 1e3).tolist(),
            "r_mm": (r * 1e3).tolist(),
            "potential_V": V.tolist(),
            "field_mag_Vm": E.tolist(),
            "field_log10": field_log10.tolist(),
            "eps_rel": case["geom"]["eps_rel"].tolist(),
        },
        "axis_profiles": {
            "z_mm": (z * 1e3).tolist(),
            "V_axis_V": axis_V.tolist(),
            "Ez_axis_Vm": axis_Ez.tolist(),
        },
        "emission_summary": {
            "eta_emit": float(case["emission"]["eta_emit"]),
            "I_total_A": float(case["emission"]["I_total"]),
            "F_macro_mean_Vm": float(case["emission"]["F_macro_mean"]),
            "F_macro_p95_Vm": float(case["emission"]["F_macro_p95"]),
            "active_faces": int(len(case["emission"]["faces_df"])),
        },
    }
    return result


def _trace_result_payload(case, params, trace_cfg, summary_df, plot_traces, summary, beam_df, bundle_df, cross_df):
    beam_payload = None
    if beam_df is not None:
        beam_payload = {
            "z_mm": (beam_df["z"].to_numpy() * 1e3).tolist(),
            "rms_x_um": (beam_df["rms_x"].to_numpy() * 1e6).tolist(),
            "mean_abs_x_um": (beam_df["mean_abs_x"].to_numpy() * 1e6).tolist(),
            "max_abs_x_um": (beam_df["max_abs_x"].to_numpy() * 1e6).tolist(),
            "m_fit": beam_df["m_fit"].to_numpy().tolist(),
        }

    asym_cross = None
    if cross_df is not None:
        asym_cross = {
            "z_cross_mm": (cross_df["z_cross"].to_numpy() * 1e3).tolist(),
            "weight": cross_df["weight"].to_numpy().tolist(),
            "x0_um": (cross_df["x0"].to_numpy() * 1e6).tolist(),
        }

    plot_payload = []
    for item in plot_traces:
        plot_payload.append({
            "ray_id": int(item["ray_id"]),
            "weight": float(item["weight"]),
            "stop_reason": item["stop_reason"],
            "x_mm": (np.asarray(item["x_m"]) * 1e3).tolist(),
            "z_mm": (np.asarray(item["z_m"]) * 1e3).tolist(),
        })

    bundle_payload = {
        "x0_um": (bundle_df["x0"].to_numpy() * 1e6).tolist(),
        "z0_nm": (bundle_df["z0"].to_numpy() * 1e9).tolist(),
        "weight": bundle_df["weight"].to_numpy().tolist(),
        "theta0_deg": bundle_df["theta0_deg"].to_numpy().tolist(),
        "E0_eV": bundle_df["E0_eV"].to_numpy().tolist(),
    }

    stop_reasons = []
    for row in summary_df.itertuples(index=False):
        stop_reasons.append({
            "ray_id": int(row.ray_id),
            "stop_reason": row.stop_reason,
            "weight": float(row.weight),
            "x_end_mm": float(row.x_end * 1e3),
            "z_end_mm": float(row.z_end * 1e3),
        })
    
    positive_E = case["E_direct"][case["E_direct"] > 0]
    field_floor = positive_E.min() if positive_E.size else 1e-30
    field_log10 = np.log10(np.maximum(case["E_direct"], field_floor))

    return {
        "trace_config": trace_cfg,
        "summary": {k: _json_safe(v) for k, v in summary.items()},
        "trajectories": plot_payload,
        "bundle": bundle_payload,
        "beam_metrics": beam_payload,
        "asymptotic_crossings": asym_cross,
        "ray_endpoints": stop_reasons,
        "conductors": _plot_conductors_payload(params),
        "field_background": {
            "z_mm": (case["z"] * 1e3).tolist(),
            "r_mm": (case["r"] * 1e3).tolist(),
            "field_log10": field_log10.tolist(),
        },
    }


def solve_fields(config=None):
    global _LAST_CASE, _LAST_FLAT_CONFIG
    params, merged = flatten_config(config)
    errors, warnings = validate_device_inputs(params)
    if errors:
        return {"status": "error", "errors": errors, "warnings": warnings}

    case = build_case(params)
    _LAST_CASE = case
    _LAST_FLAT_CONFIG = params
    return {
        "status": "ok",
        "config": merged,
        "config_flat": params,
        "field": _field_result_payload(case, params, warnings),
    }


def trace_bundle_for_config(config=None, force_rebuild=False):
    global _LAST_CASE, _LAST_FLAT_CONFIG
    params, merged = flatten_config(config)
    errors, warnings = validate_device_inputs(params)
    if errors:
        return {"status": "error", "errors": errors, "warnings": warnings}

    need_rebuild = force_rebuild or _LAST_CASE is None
    if not need_rebuild and _LAST_FLAT_CONFIG is not None:
        compare_keys = [
            "V_CNT", "V_MID", "a_inner", "r_stack_outer", "t_e", "edge_radius",
            "d1", "d2", "d3", "eps_r_oxide", "fill_stack_with_oxide", "R_forest",
            "h_forest", "forest_edge_radius", "work_function_eV", "beta_forest_eff",
            "tip_areal_density", "tip_apex_radius", "emission_edge_exclusion",
            "R_outer", "z_extra", "Nr", "Nz",
        ]
        for key in compare_keys:
            if _LAST_FLAT_CONFIG.get(key) != params.get(key):
                need_rebuild = True
                break

    if need_rebuild:
        case = build_case(params)
        _LAST_CASE = case
        _LAST_FLAT_CONFIG = params
    else:
        case = _LAST_CASE

    trace_cfg = {
        "mode": params["mode"],
        "n_rays": int(params["n_rays"]),
        "n_subrays_per_face": int(params["n_subrays_per_face"]),
        "initial_energy_eV": float(params["initial_energy_eV"]),
        "launch_half_angle_deg": float(params["launch_half_angle_deg"]),
        "z_offset": float(params["z_offset"]),
        "symmetric": bool(params["symmetric"]),
        "angle_mode": params["angle_mode"],
        "angle_sigma_deg": float(params["angle_sigma_deg"]),
        "angle_max_deg": float(params["angle_max_deg"]),
        "energy_mode": params["energy_mode"],
        "energy_sigma_eV": float(params["energy_sigma_eV"]),
        "energy_min_eV": float(params["energy_min_eV"]),
        "rng_seed": int(params["rng_seed"]),
    }
    cfg = LaunchConfig(**trace_cfg)
    field_model = MeridionalPotentialInterpolator(case)

    bundle_df = make_launch_bundle(case, params, cfg)
    atol = np.array([params["atol_xz"], params["atol_xz"], params["atol_p"], params["atol_p"]], dtype=float)
    summary_df, plot_traces = trace_bundle(
        bundle_df,
        field_model,
        params,
        t_max=float(params["t_max"]),
        max_step=float(params["max_step"]),
        rtol=float(params["rtol"]),
        atol=atol,
        max_plot_points_per_ray=int(params["max_plot_points_per_ray"]),
    )
    summary, beam_df, _bundle_on_z, cross_df = summarize_run(summary_df, field_model, params)

    return {
        "status": "ok",
        "warnings": warnings,
        "config": merged,
        "config_flat": params,
        "field": _field_result_payload(case, params, warnings),
        "trace": _trace_result_payload(case, params, trace_cfg, summary_df, plot_traces, summary, beam_df, bundle_df, cross_df),
    }


def get_default_config_json():
    return json.dumps(get_default_config())


def solve_fields_json(config_json="{}"):
    data = json.loads(config_json or "{}")
    return json.dumps(solve_fields(data))


def trace_bundle_json(config_json="{}"):
    data = json.loads(config_json or "{}")
    return json.dumps(trace_bundle_for_config(data))
