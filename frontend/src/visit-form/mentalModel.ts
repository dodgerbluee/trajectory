/**
 * ---------------------------------------------------------------------------
 * Step 1: Mental Model for the Create/Edit Visit Page
 * ---------------------------------------------------------------------------
 *
 * VISIT TYPE
 * ----------
 * A Visit Type is a classification of the visit (e.g. Wellness, Sick, Injury, Vision).
 * It determines which sections are shown by default when creating a new visit.
 * Visit type does NOT control rendering directly: the page uses a list of
 * active section IDs. Visit type is used only to seed that list and for
 * submission/display (e.g. header title). New types (e.g. Dental) can be
 * added by extending the defaults config; no refactor of section logic.
 *
 * SECTION
 * -------
 * A Section is a discrete block of the visit form with:
 *   - A stable id (e.g. "visit-information", "measurements")
 *   - A display label
 *   - A React component that renders its content
 *   - Whether it can be removed by the user (removable)
 *   - Which visit types it is allowed on (allowedVisitTypes; null = all)
 *   - Whether it is optional (user adds it explicitly; e.g. Vaccines, Prescriptions)
 *
 * Sections do not contain visit-type conditionals. They receive data and
 * callbacks via props/context; the page decides which sections are active.
 *
 * PAGE COMPOSITION
 * ----------------
 * The visit page is composed by:
 *   1. Resolving active sections: start from VISIT_TYPE_DEFAULTS[visitType],
 *      then apply user additions/removals (optional sections, removable sections).
 *   2. Rendering: for each active section ID, look up the section in the
 *      SECTION_REGISTRY and render SectionWrapper(registry.component).
 *   3. No "if (visitType === 'sick')" in the render path; only "map
 *      activeSections -> registry entry -> SectionWrapper + component".
 */

export {};
