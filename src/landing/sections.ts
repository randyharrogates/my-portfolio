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

export const HALL_HUB_RADIUS = 3.0;
export const HALL_ALCOVE_RADIUS = 7.0;
export const HALL_CEILING_HEIGHT = 5.5;

export interface HallTargetPose {
  /** World-space camera position. */
  position: [number, number, number];
  /** World-space lookAt target. */
  lookAt: [number, number, number];
  /** Optional FOV override (mostly defaults to the idle FOV). */
  fov?: number;
}

/** Placement angle around the hub centre (radians). Used by `alcoveCentre`
 *  and the camera focal-pose computation. NOT the same as the alcove group's
 *  rotation yaw — that's the negative of this (see `alcoveFacing`). */
export function alcoveAngle(index: number): number {
  return (index / HALL_ALCOVE_ORDER.length) * Math.PI * 2;
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

/** Camera focal pose when the camera is "inside" an alcove. Sits at the
 *  hub-side of the alcove at eye-height (~1.6m), looking outward through
 *  the alcove toward the hologram screen on its back wall. */
export function alcoveFocalPose(index: number): HallTargetPose {
  const a = alcoveAngle(index);
  const camRadius = HALL_ALCOVE_RADIUS - 0.6;
  // Look toward a point beyond the alcove centre (the back wall lives there).
  const lookRadius = HALL_ALCOVE_RADIUS + 1.8;
  return {
    position: [Math.sin(a) * camRadius, 1.6, -Math.cos(a) * camRadius],
    lookAt: [
      Math.sin(a) * lookRadius,
      1.4,
      -Math.cos(a) * lookRadius,
    ],
    fov: 38,
  };
}

/** Idle hub viewpoint — slightly elevated, looking gently downward at the
 *  centre of the rotunda. CameraDirector slow-orbits around this in idle. */
export const HALL_HUB_POSE: HallTargetPose = {
  position: [0, 2.4, 4.6],
  lookAt: [0, 1.2, 0],
  fov: 46,
};

/** Bird's-eye pose used by the boot sequence + map "fly camera into view"
 *  on first load. */
export const HALL_BOOT_POSE: HallTargetPose = {
  position: [0, 9.5, 11],
  lookAt: [0, 1.0, 0],
  fov: 52,
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

/** Radius from hub centre to the door plane. Sits well outside the alcove
 *  ring so the corridor never clips an alcove. */
export const HALL_DOOR_RADIUS = HALL_ALCOVE_RADIUS + 4;
/** Radius from hub centre to the through-door waypoint (just inside the door). */
export const HALL_DOORWAY_INNER_RADIUS = HALL_ALCOVE_RADIUS + 2.5;
/** Radius from hub centre to the corridor midpoint. */
export const HALL_HALLWAY_MID_RADIUS = HALL_ALCOVE_RADIUS - 0.5;
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

/** Build a flat map of target id → pose for the CameraDirector. */
export function buildHallTargetPoses(): Record<HallTargetId, HallTargetPose> {
  const out: Record<string, HallTargetPose> = {
    hub: HALL_HUB_POSE,
  };
  HALL_ALCOVE_ORDER.forEach((id, i) => {
    out[id] = alcoveFocalPose(i);
  });
  return out as Record<HallTargetId, HallTargetPose>;
}

/** Accent + theme metadata for each alcove — drives Hologram tint, label
 *  copy on the HUD, and lower-third caption. */
export interface AlcoveTheme {
  id: SectionId;
  title: string;
  subtitle: string;
  accent: string;
  hologramColor: [number, number, number];
}

export const HALL_THEMES: Record<SectionId, AlcoveTheme> = {
  about: {
    id: "about",
    title: "origin chamber",
    subtitle: "who · why · how",
    accent: "#e8b45a",
    hologramColor: [0.92, 0.71, 0.36],
  },
  projects: {
    id: "projects",
    title: "case-study gallery",
    subtitle: "what i've shipped",
    accent: "#4dd0c4",
    hologramColor: [0.30, 0.82, 0.77],
  },
  skills: {
    id: "skills",
    title: "tool armory",
    subtitle: "the stack",
    accent: "#9fe870",
    hologramColor: [0.62, 0.91, 0.44],
  },
  blog: {
    id: "blog",
    title: "library",
    subtitle: "ideas, written down",
    accent: "#b08ce8",
    hologramColor: [0.69, 0.55, 0.91],
  },
  resume: {
    id: "resume",
    title: "credentials wall",
    subtitle: "the receipts",
    accent: "#f4d8a8",
    hologramColor: [0.96, 0.85, 0.66],
  },
  contact: {
    id: "contact",
    title: "comms array",
    subtitle: "how to reach me",
    accent: "#4ddfff",
    hologramColor: [0.30, 0.87, 1.0],
  },
};
