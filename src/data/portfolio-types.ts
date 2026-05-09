/** @format */

export type ChipColor = "orange" | "blue" | "green" | "purple";

export type TechCategory = "ai-ml" | "cloud" | "data" | "lang" | "infra";

export interface TechItem {
  id: string;
  name: string;
  category: TechCategory;
  color: ChipColor;
  proficiency: 1 | 2 | 3 | 4 | 5;
  years: number;
}

export interface TechEdge {
  a: string;
  b: string;
  projectIds: string[];
}

export interface Role {
  id: string;
  title: string;
  startYear: number;
  endYear: number | null;
  scope: 1 | 2 | 3 | 4 | 5;
  domId?: string;
}

export interface Cert {
  id: string;
  short: string;
  full: string;
  domId?: string;
}

export interface Education {
  id: string;
  degree: string;
}

export type IdentityStatus = "available" | "open" | "employed";

export interface Identity {
  name: string;
  role: string;
  yoe: number;
  location: string;
  status: IdentityStatus;
  belief: string;
  quote: string;
  badge: string;
}

export interface PortfolioData {
  identity: Identity;
  techStack: TechItem[];
  techEdges: TechEdge[];
  roles: Role[];
  certifications: Cert[];
  education: Education[];
  interests: string[];
  aiTools: string[];
  socials: { email: string; github: string; linkedin: string };
}
