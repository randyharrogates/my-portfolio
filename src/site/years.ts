// Year counts shown on the site are computed, so nothing needs editing each January.
// Baselines keep the figures stated in 2026: 8+ years in software, 14 years working.
const SOFTWARE_BASE_YEAR = 2018;
const WORKING_BASE_YEAR = 2012;

export const CURRENT_YEAR = new Date().getFullYear();
export const SOFTWARE_YEARS = CURRENT_YEAR - SOFTWARE_BASE_YEAR;
export const WORKING_YEARS = CURRENT_YEAR - WORKING_BASE_YEAR;
