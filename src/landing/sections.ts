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
