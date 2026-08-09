import { nixCourse } from "./nixCourse";

// The Learn Nix course — the app's only hosted course. The course engine
// (buildCourse in ./registry.js) stays generic: adding any future course is
// just a data file plus one entry in this list.
export const COURSES = [nixCourse];

export const DEFAULT_COURSE_ID = "nix";

export function getCourseById(id) {
  return COURSES.find((c) => c.id === id) || nixCourse;
}
