/** @format */

export type SectionId =
  | "about"
  | "projects"
  | "skills"
  | "blog"
  | "resume"
  | "contact";

export interface SectionConfig {
  id: SectionId;
  label: string;
  route: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  /** Optional accent color for screen content tint */
  accent?: string;
}

/**
 * Six monitors covering the six terminal sections. Three large monitors over the
 * desk on stalks, three smaller screens on a server-rack panel to the right.
 */
export const SECTIONS: SectionConfig[] = [
  { id: "about",    label: "about",    route: "/about",    position: [-1.05, 1.05, -0.6], rotation: [0,  0.18, 0], size: [0.9, 0.55] },
  { id: "projects", label: "projects", route: "/projects", position: [ 0.0,  1.10, -0.7], rotation: [0,  0.0,  0], size: [0.9, 0.55] },
  { id: "skills",   label: "skills",   route: "/skills",   position: [ 1.05, 1.05, -0.6], rotation: [0, -0.18, 0], size: [0.9, 0.55] },
  { id: "blog",     label: "blog",     route: "/blog",     position: [ 2.05, 1.45, -0.2], rotation: [0, -Math.PI / 2.4, 0], size: [0.55, 0.35] },
  { id: "resume",   label: "resume",   route: "/resume",   position: [ 2.05, 0.95, -0.2], rotation: [0, -Math.PI / 2.4, 0], size: [0.55, 0.35] },
  { id: "contact",  label: "contact",  route: "/contact",  position: [ 2.05, 0.45, -0.2], rotation: [0, -Math.PI / 2.4, 0], size: [0.55, 0.35] },
];

export const IDLE_CAMERA_POS: [number, number, number] = [1.6, 1.7, 3.4];
export const IDLE_CAMERA_LOOK: [number, number, number] = [0.4, 0.8, -0.2];

/** Portrait variants — pulled back, recentered, with a wider FOV so all 6
 *  monitors fit on a phone in portrait orientation. */
export const IDLE_CAMERA_POS_PORTRAIT: [number, number, number] = [0.5, 2.0, 5.5];
export const IDLE_CAMERA_LOOK_PORTRAIT: [number, number, number] = [0.4, 0.9, -0.2];

export const IDLE_CAMERA_FOV_LANDSCAPE = 42;
export const IDLE_CAMERA_FOV_PORTRAIT = 52;

/* -------------------------------------------------------------------------
 *  Hall scene — multi-room cinematic workstation (Phase 3+).
 *  Six alcoves arranged around a central rotunda. Camera flies between
 *  named viewpoints via CameraDirector's B-spline path system.
 * ------------------------------------------------------------------------ */

export type HallTargetId = SectionId | "hub";

/** Each alcove sits at angle θ around the hub centre at HALL_ALCOVE_RADIUS.
 *  Index → angle is fixed so geometry, camera, and map agree. */
export const HALL_ALCOVE_ORDER: SectionId[] = [
  "about",
  "projects",
  "skills",
  "blog",
  "resume",
  "contact",
];

// Phase 2.5 + Session 20 cathedral re-scale (2026-05-12). Original
// gazebo defaults were 3.0 / 7.0 / 5.5; Session 12 lifted them to
// 7 / 15 / 14 (cathedral); Session 20 doubles again to 14 / 30 / 28
// for an *open-plaza* feel where alcoves read as standing pavilions
// visible from any angle around the hub. Every Blender builder script,
// the camera poses, fog distance, atmosphere radii, lighting, and
// material tile repeats all derive (directly or via offsets) from
// these three constants.
export const HALL_HUB_RADIUS = 14.0;
export const HALL_ALCOVE_RADIUS = 30.0;
export const HALL_CEILING_HEIGHT = 28.0;
// Phase 9 reference realignment: cylindrical outer wall behind the alcove
// ring (alcove back ≈ 30 + 7 = 37 m; the wall sits 3 m beyond). Six tall
// arched windows pierce the wall at the alcove angles so HDRI light pours
// through alcove openings from outside.
export const HALL_OUTER_WALL_RADIUS = 40.0;

export interface HallTargetPose {
  /** World-space camera position. */
  position: [number, number, number];
  /** World-space lookAt target. */
  lookAt: [number, number, number];
  /** Optional FOV override (mostly defaults to the idle FOV). */
  fov?: number;
}

/** Per-alcove placement angle around the hub centre (radians).
 *
 *  Phase 2.5 take-2 (Session 13): the angles were `(i / 6) × 2π` —
 *  perfectly equidistant 60° spacing — which read as "planned" and matched
 *  the previous hex floor's vertex angles. User feedback after seeing the
 *  HoZL reference: alcoves should NOT be equidistant; spacing should vary
 *  so the hub feels organic rather than engineered.
 *
 *  Angles below produce gaps of 48°, 54°, 68°, 50°, 65°, 75° around the
 *  hub — irregular but still readable as a loop. Order follows
 *  `HALL_ALCOVE_ORDER` (about, projects, skills, blog, resume, contact).
 *  Entrance corridor sits between skills(2) and blog(3), as before.
 */
const ALCOVE_ANGLE_DEG = [
  0,   // about        — origin chamber, top
  48,  // projects     — upper-right
  102, // skills       — right
  170, // blog         — lower-right
  220, // resume       — lower-left
  285, // contact      — left
];
const ALCOVE_ANGLES_RAD = ALCOVE_ANGLE_DEG.map((d) => (d * Math.PI) / 180);

export function alcoveAngle(index: number): number {
  return ALCOVE_ANGLES_RAD[index] ?? 0;
}

/** Compute an alcove's centre point given its slot index. */
export function alcoveCentre(index: number): [number, number, number] {
  const a = alcoveAngle(index);
  return [
    Math.sin(a) * HALL_ALCOVE_RADIUS,
    0,
    -Math.cos(a) * HALL_ALCOVE_RADIUS,
  ];
}

/** Rotation yaw applied to each alcove's group so its local +Z (the arch /
 *  opening side) points back toward the hub centre. For an alcove placed at
 *  angle θ around the hub, the yaw is -θ — the alcove "faces inward".
 *  Local +Z = arch side; local -Z = back wall + hologram. */
export function alcoveFacing(index: number): number {
  return -alcoveAngle(index);
}

/** Camera focal pose when the camera is "inside" an alcove. Session 20:
 *  camera sits 4 m hub-side of the alcove opening, eye-height 3.2 m
 *  (raised for the doubled pavilion height), looking out toward the
 *  hologram screen at world radius ≈ 36 m. FOV 46° frames the full
 *  open-pavilion silhouette: arch overhead, hologram + mount + pedestal
 *  ahead. */
export function alcoveFocalPose(index: number): HallTargetPose {
  const a = alcoveAngle(index);
  const camRadius = HALL_ALCOVE_RADIUS - 4.0;
  const lookRadius = HALL_ALCOVE_RADIUS + 6.0;
  return {
    position: [Math.sin(a) * camRadius, 3.2, -Math.cos(a) * camRadius],
    lookAt: [
      Math.sin(a) * lookRadius,
      4.6,
      -Math.cos(a) * lookRadius,
    ],
    fov: 46,
  };
}

/** Idle hub viewpoint — exterior orbital pose framing the floating hub
 *  island. Camera pulled back further on Phase 6 since the island
 *  scaled up 2.0× to accommodate six distinct themed landmarks. FOV
 *  48° gives the new silhouette breathing room. */
export const HALL_HUB_POSE: HallTargetPose = {
  position: [70, 42.0, 96.0],
  lookAt: [0, -10.0, 0],
  fov: 48,
};

/* -------------------------------------------------------------------------
 *  Phase 6 — Points of interest on the hub island.
 *
 *  Inspired by jordan-breton.com: instead of separate satellite
 *  islands, the navigation lives ON the hub. Each section is a small
 *  marker placed at a distinct position on the platter's top surface;
 *  the camera flies between them on URL change. Keeps the whole
 *  portfolio as one coherent place.
 * ------------------------------------------------------------------------ */

/** Per-section landmark positions on the hub island top. Phase 6
 *  themed layout: each section is a distinct landmark (not floating
 *  marker), and the placements are intentionally NON-uniform so the
 *  island reads as an organic landscape rather than a turntable.
 *
 *  Hub platter top sits at world y=0 and now spans roughly r=56 (2.0×
 *  scale-up). Each landmark sits in its own "district" of the
 *  platter, themed:
 *
 *  - about     → house with desk    — front-centre, the dwelling
 *  - projects  → crashed satellite  — east rim, half-buried, impact site
 *  - skills    → waterfall / river  — west rim, water tumbling off edge
 *  - blog      → tree               — deep back-left, vertical canopy
 *  - resume    → garden             — near the house (cultivated patch)
 *  - contact   → entrance / dock    — south, the visitor approach
 *
 *  Y is +1.6 — just above the rocky displacement so PoI markers float
 *  clear of the rim. When real Blender-authored landmarks land they
 *  will replace the markers and sit ON the rock surface at y=0 (the
 *  asset itself contains the vertical extent). Order follows
 *  `HALL_ALCOVE_ORDER`. */
export const HALL_POI_POSITIONS: Array<[number, number, number]> = [
  [4,    1.6, -8],   // about      — house, front-centre dwelling
  [32,   1.6,  18],  // projects   — crashed satellite, east-rim impact
  [-30,  1.6, -6],   // skills     — waterfall, west rim falling off
  [-14,  1.6, -36],  // blog       — tree, deep back-left canopy
  [18,   1.6, -4],   // resume     — garden, adjacent to the house
  [0,    1.6,  38],  // contact    — entrance, south landing
];

/** Per-section override for the focal-pose framing. Landmarks with
 *  vertical features (e.g. skills has a 40-m waterfall column) need
 *  the camera pulled back further, lifted higher, and aimed at the
 *  midpoint of the action — otherwise the default oblique 18-m pose
 *  cuts off the top of the geometry. */
type FocalRadialOverride = {
  kind?: "radial";
  outRadius: number;
  tangentOffset: number;
  cameraHeight: number;
  lookAtHeight: number;
  fov: number;
};
type FocalFixedOverride = {
  kind: "fixed";
  cameraOffset: [number, number, number];
  lookAtOffset: [number, number, number];
  fov: number;
};
type FocalOverride = FocalRadialOverride | FocalFixedOverride;

const POI_FOCAL_OVERRIDES: Partial<Record<SectionId, FocalOverride>> = {
  // skills: front-view of the SKILLS sign + waterfall column together.
  // Camera sits to the +X side of the landmark looking toward -X (the
  // waterfall is at PoI+(-3,*,0) and the sign + forge are at
  // PoI+(5.5,0,-5..-7)). Mid-low elevation + lookAt at mid-pool height
  // so the bottom half of the waterfall (most detailed shader area) +
  // the sign + the forge are all framed. Upper rock cut off
  // intentionally per user.
  skills: {
    kind: "fixed",
    // Pulled back again per user (31/10.5/6.5 → 36/12/7.5). Same
    // lookAt; just more headroom so the whole tool-armory scene
    // (sign + relocated terminal + orb + greenery + waterfall +
    // plunge pool) lives in one frame without anything crowding.
    cameraOffset: [36.0, 12.0, 7.5],
    lookAtOffset: [-5.0, 5.5, -1.0],
    fov: 50,
  },
};

/** Camera focal pose for each PoI. The camera arcs around the PoI at
 *  an oblique angle so the marker reads against the magenta skybox /
 *  cyan grid rather than the rock immediately behind it. Default:
 *  height +9 m, radius 18 m, lookAt at PoI. Per-section overrides in
 *  POI_FOCAL_OVERRIDES customise for tall verticals. */
export function poiFocalPose(index: number): HallTargetPose {
  const p = HALL_POI_POSITIONS[index] ?? [0, 1.6, 0];
  const id = HALL_ALCOVE_ORDER[index];
  const ov = POI_FOCAL_OVERRIDES[id];

  // Fixed-offset override: explicit camera + lookAt offsets from PoI.
  if (ov && ov.kind === "fixed") {
    return {
      position: [
        p[0] + ov.cameraOffset[0],
        p[1] + ov.cameraOffset[1],
        p[2] + ov.cameraOffset[2],
      ],
      lookAt: [
        p[0] + ov.lookAtOffset[0],
        p[1] + ov.lookAtOffset[1],
        p[2] + ov.lookAtOffset[2],
      ],
      fov: ov.fov,
    };
  }

  // Default radial path (with optional radial-tuned override).
  const radial = ov as FocalRadialOverride | undefined;
  const outRadius = radial?.outRadius ?? 18.0;
  const tangentOffset = radial?.tangentOffset ?? 10.0;
  const cameraHeight = radial?.cameraHeight ?? 9.0;
  const lookAtHeight = radial?.lookAtHeight ?? -0.5;
  const fov = radial?.fov ?? 46;

  // Direction from origin → PoI, normalised to give us the outward
  // radial axis. Camera sits `outRadius` beyond the PoI on that axis,
  // tangentially shifted so we don't look straight down the spoke.
  const dx = p[0];
  const dz = p[2];
  const len = Math.max(Math.hypot(dx, dz), 0.0001);
  const rx = dx / len;
  const rz = dz / len;
  // Tangent (rotated 90°) for the sideways camera offset.
  const tx = -rz;
  const tz = rx;
  return {
    position: [
      p[0] + rx * outRadius + tx * tangentOffset,
      p[1] + cameraHeight,
      p[2] + rz * outRadius + tz * tangentOffset,
    ],
    lookAt: [p[0], p[1] + lookAtHeight, p[2]],
    fov,
  };
}

/** Bird's-eye pose used by the boot sequence on first load. Starts high
 *  + far so the cinematic descent reveals the island silhouette over
 *  several seconds. */
export const HALL_BOOT_POSE: HallTargetPose = {
  position: [0, 110, 160],
  lookAt: [0, -6.0, 0],
  fov: 56,
};

/* -------------------------------------------------------------------------
 *  Entrance corridor — door + hallway intro sequence.
 *  Corridor axis sits midway between alcove indices 2 (skills) and 3 (blog)
 *  so it does not pass through any alcove geometry.
 * ------------------------------------------------------------------------ */

/** Corridor axis angle (radians) — midpoint of the skills/blog gap. */
export function entranceAngle(): number {
  return (alcoveAngle(2) + alcoveAngle(3)) / 2;
}

/** Radius from hub centre to the door plane. Phase 9: pushed to 70 m so
 *  the corridor (now 30 m long) starts well outside the new outer wall at
 *  HALL_OUTER_WALL_RADIUS (40 m). */
export const HALL_DOOR_RADIUS = 70.0;
/** Radius from hub centre to the through-door waypoint (just inside the door). */
export const HALL_DOORWAY_INNER_RADIUS = 68.0;
/** Radius from hub centre to the corridor midpoint. */
export const HALL_HALLWAY_MID_RADIUS = 55.0;
/** Half-width of the corridor — drives floor/ceiling/wall geometry. */
export const HALL_HALLWAY_WIDTH = 2.4;

function poseAlongEntrance(radius: number, eyeHeight: number, lookRadius: number, lookHeight: number, fov?: number): HallTargetPose {
  const a = entranceAngle();
  return {
    position: [Math.sin(a) * radius, eyeHeight, -Math.cos(a) * radius],
    lookAt: [Math.sin(a) * lookRadius, lookHeight, -Math.cos(a) * lookRadius],
    fov,
  };
}

/** Camera stands outside the door, eye height ~1.65m, framed on the doorway. */
export const HALL_DOOR_POSE: HallTargetPose = poseAlongEntrance(
  HALL_DOOR_RADIUS + 3.2,
  1.65,
  HALL_DOOR_RADIUS,
  1.5,
  48
);

/** Camera just past the door, looking inward toward the corridor midpoint. */
export const HALL_DOORWAY_POSE: HallTargetPose = poseAlongEntrance(
  HALL_DOORWAY_INNER_RADIUS,
  1.65,
  HALL_HALLWAY_MID_RADIUS - 1.5,
  1.45,
  46
);

/** Corridor midpoint pose — already inside the hall, looking at the hub. */
export const HALL_HALLWAY_WAYPOINT: HallTargetPose = poseAlongEntrance(
  HALL_HALLWAY_MID_RADIUS,
  1.65,
  0,
  1.2,
  46
);

/** Per-section camera pose overrides. When a section has an authored
 *  landmark with a specific best-framing angle, register the pose
 *  here; otherwise the generic `poiFocalPose` is used. */
const POI_POSE_OVERRIDES: Partial<Record<SectionId, HallTargetPose>> = {
  // /about — frame the house from the south so the door, steps, plants,
  // path stones and mailbox all read. House lives at (~4, 0, -8) with
  // its door on the -Z side; camera sits ~14 m south and ~6 m above.
  about: {
    // House at world (4, 0, -8). Door + decorations are on the +Z face
    // of the house (Blender authored the door on -Y; GLTF export_yup
    // flips axes so -Y becomes +Z). Camera sits on the +Z side looking
    // -Z back at the house so the door, steps, plants, path, and
    // mailbox all read.
    position: [5, 5.5, 8],
    lookAt: [4, 2.4, -8],
    fov: 50,
  },
};

/** Build a flat map of target id → pose for the CameraDirector. Phase
 *  6: each section flies the camera to its on-island landmark / PoI
 *  marker. Hub remains the wide orbital. */
export function buildHallTargetPoses(): Record<HallTargetId, HallTargetPose> {
  const out: Record<string, HallTargetPose> = {
    hub: HALL_HUB_POSE,
  };
  HALL_ALCOVE_ORDER.forEach((id, i) => {
    out[id] = POI_POSE_OVERRIDES[id] ?? poiFocalPose(i);
  });
  return out as Record<HallTargetId, HallTargetPose>;
}

/** How "enclosed" each alcove pavilion is. Drives which shell meshes
 *  the React side renders + which material the walls use. Session 20:
 *  added so the open-concept refit can vary openness per theme.
 *
 *  - `fully-open`  → no back wall, no side walls, no ceiling. Only
 *                     floor + pilasters + cornice + arch + pedestal +
 *                     mount + hologram. Reads as a standing pavilion
 *                     visible from any angle.
 *  - `half-open`   → back wall + ceiling kept, side walls dropped.
 *                     Hologram retains a dark backdrop; alcove still
 *                     visible from the sides.
 *  - `translucent` → all walls kept but rendered with a glass-like
 *                     transmission material; alcove content shows
 *                     through with a violet/cyan tint.
 *  - `gated`       → no full back wall, but a knee-height brass parapet
 *                     across the hub-facing opening — reads as a forge
 *                     enclosure / armory boundary. Phase 9 addition. */
export type AlcoveOpenness =
  | "fully-open"
  | "half-open"
  | "translucent"
  | "gated";

/** Accent + theme metadata for each alcove — drives Hologram tint, label
 *  copy on the HUD, and lower-third caption. */
export interface AlcoveTheme {
  id: SectionId;
  title: string;
  subtitle: string;
  accent: string;
  hologramColor: [number, number, number];
  /** Per-theme openness rule (Session 20). */
  openness: AlcoveOpenness;
}

export const HALL_THEMES: Record<SectionId, AlcoveTheme> = {
  about: {
    id: "about",
    title: "origin chamber",
    subtitle: "who · why · how",
    accent: "#e8b45a",
    hologramColor: [0.92, 0.71, 0.36],
    // "Chamber" wants some enclosure for the sacred / origin feel.
    openness: "half-open",
  },
  projects: {
    id: "projects",
    title: "case-study gallery",
    subtitle: "what i've shipped",
    accent: "#4dd0c4",
    hologramColor: [0.30, 0.82, 0.77],
    // Gallery = work on display. Open from every angle.
    openness: "fully-open",
  },
  skills: {
    id: "skills",
    title: "tool armory",
    subtitle: "the stack",
    accent: "#9fe870",
    hologramColor: [0.62, 0.91, 0.44],
    // Phase 9: gated — knee-height brass parapet across the opening
    // reads as a forge-floor enclosure rather than an open gallery.
    openness: "gated",
  },
  blog: {
    id: "blog",
    title: "library",
    subtitle: "ideas, written down",
    accent: "#b08ce8",
    hologramColor: [0.69, 0.55, 0.91],
    // Library = bookshelves on walls. Translucent so the shelves
    // would read from outside if they were modelled.
    openness: "translucent",
  },
  resume: {
    id: "resume",
    title: "credentials wall",
    subtitle: "the receipts",
    accent: "#f4d8a8",
    hologramColor: [0.96, 0.85, 0.66],
    // "Credentials wall" literally wants a wall. Keep back, drop sides.
    openness: "half-open",
  },
  contact: {
    id: "contact",
    title: "comms array",
    subtitle: "how to reach me",
    accent: "#4ddfff",
    hologramColor: [0.30, 0.87, 1.0],
    // Comms array = broadcast, outward-facing. Fully open.
    openness: "fully-open",
  },
};
