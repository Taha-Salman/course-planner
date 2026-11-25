import type {
  ConflictDetail,
  Course,
  DayCode,
  GridBlock,
  Meeting,
  SectionComponent,
  SectionOption,
  SelectedCourseEntry,
} from '../types/course';

export const DAY_ORDER: DayCode[] = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

export const DAY_NAMES: Record<DayCode, { short: string; full: string }> = {
  M: { short: 'Mon', full: 'Monday' },
  T: { short: 'Tue', full: 'Tuesday' },
  W: { short: 'Wed', full: 'Wednesday' },
  R: { short: 'Thu', full: 'Thursday' },
  F: { short: 'Fri', full: 'Friday' },
  S: { short: 'Sat', full: 'Saturday' },
  U: { short: 'Sun', full: 'Sunday' },
};

export interface TimeSlotFilter {
  days: DayCode[];
  startMin: number;
  endMin: number;
  source?: 'grid' | 'filter';
}

export interface CourseColorTheme {
  name: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  lightSubtext: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
  darkSubtext: string;
  dot: string;
}

/**
 * Calm watercolor-inspired palette designed for Warm Paper & Sage surfaces.
 */
export const COURSE_PALETTE: CourseColorTheme[] = [
  {
    name: 'Sage',
    lightBg: 'bg-[#E9F3EF]',
    lightBorder: 'border-l-[#3D7A6E] border-[#CBE1D9]',
    lightText: 'text-[#1B3A33]',
    lightSubtext: 'text-[#3C665C]',
    darkBg: 'dark:bg-[#1E312C]',
    darkBorder: 'dark:border-l-[#6FB2A4] dark:border-[#2F4A43]',
    darkText: 'dark:text-[#DCEEE9]',
    darkSubtext: 'dark:text-[#9AC5BC]',
    dot: 'bg-[#3D7A6E] dark:bg-[#6FB2A4]',
  },
  {
    name: 'Dusty Sky',
    lightBg: 'bg-[#EAF2F8]',
    lightBorder: 'border-l-[#4A7C9B] border-[#C9DFEC]',
    lightText: 'text-[#1D3545]',
    lightSubtext: 'text-[#42667D]',
    darkBg: 'dark:bg-[#1D2D38]',
    darkBorder: 'dark:border-l-[#77ACC9] dark:border-[#2E4656]',
    darkText: 'dark:text-[#DCEBF4]',
    darkSubtext: 'dark:text-[#9DC1D7]',
    dot: 'bg-[#4A7C9B] dark:bg-[#77ACC9]',
  },
  {
    name: 'Warm Sand',
    lightBg: 'bg-[#F7F0E2]',
    lightBorder: 'border-l-[#B6843E] border-[#E7D6B6]',
    lightText: 'text-[#443114]',
    lightSubtext: 'text-[#78592B]',
    darkBg: 'dark:bg-[#31291D]',
    darkBorder: 'dark:border-l-[#D4A662] dark:border-[#4A3E2A]',
    darkText: 'dark:text-[#F4E9D6]',
    darkSubtext: 'dark:text-[#CEB792]',
    dot: 'bg-[#B6843E] dark:bg-[#D4A662]',
  },
  {
    name: 'Lavender Mist',
    lightBg: 'bg-[#F0ECF8]',
    lightBorder: 'border-l-[#7766A6] border-[#D8CFE9]',
    lightText: 'text-[#2E2547]',
    lightSubtext: 'text-[#5C4E82]',
    darkBg: 'dark:bg-[#282436]',
    darkBorder: 'dark:border-l-[#A394CE] dark:border-[#3D3752]',
    darkText: 'dark:text-[#E8E3F5]',
    darkSubtext: 'dark:text-[#B9AED9]',
    dot: 'bg-[#7766A6] dark:bg-[#A394CE]',
  },
  {
    name: 'Soft Terracotta',
    lightBg: 'bg-[#F8ECE8]',
    lightBorder: 'border-l-[#B86853] border-[#E8CEC6]',
    lightText: 'text-[#47241B]',
    lightSubtext: 'text-[#7D4738]',
    darkBg: 'dark:bg-[#342420]',
    darkBorder: 'dark:border-l-[#D68B77] dark:border-[#4F362F]',
    darkText: 'dark:text-[#F5E4DF]',
    darkSubtext: 'dark:text-[#D4ABA0]',
    dot: 'bg-[#B86853] dark:bg-[#D68B77]',
  },
  {
    name: 'Soft Olive',
    lightBg: 'bg-[#EFF3E6]',
    lightBorder: 'border-l-[#6B8447] border-[#D5DFC3]',
    lightText: 'text-[#2B371B]',
    lightSubtext: 'text-[#526537]',
    darkBg: 'dark:bg-[#262E1F]',
    darkBorder: 'dark:border-l-[#98B472] dark:border-[#3B4730]',
    darkText: 'dark:text-[#E6EEDB]',
    darkSubtext: 'dark:text-[#B3C699]',
    dot: 'bg-[#6B8447] dark:bg-[#98B472]',
  },
  {
    name: 'Muted Plum',
    lightBg: 'bg-[#F6ECF2]',
    lightBorder: 'border-l-[#9E5B7D] border-[#E4CBD9]',
    lightText: 'text-[#422031]',
    lightSubtext: 'text-[#74415B]',
    darkBg: 'dark:bg-[#32232B]',
    darkBorder: 'dark:border-l-[#C988A8] dark:border-[#4B3440]',
    darkText: 'dark:text-[#F3E2EB]',
    darkSubtext: 'dark:text-[#CFA6BA]',
    dot: 'bg-[#9E5B7D] dark:bg-[#C988A8]',
  },
  {
    name: 'Calm Slate',
    lightBg: 'bg-[#EDF0F2]',
    lightBorder: 'border-l-[#5E707D] border-[#D2DAE0]',
    lightText: 'text-[#232D33]',
    lightSubtext: 'text-[#4D5E69]',
    darkBg: 'dark:bg-[#23292D]',
    darkBorder: 'dark:border-l-[#8FA4B3] dark:border-[#374147]',
    darkText: 'dark:text-[#E2E8EC]',
    darkSubtext: 'dark:text-[#A8B8C4]',
    dot: 'bg-[#5E707D] dark:bg-[#8FA4B3]',
  },
];

export function parseTimeToMinutes(timeStr: string): number {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const meridiem = m[3].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export function formatMinutesToTime(totalMin: number): string {
  const hours24 = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${meridiem}`;
}

export function formatTimeDisplay(timeStr: string): string {
  return timeStr.replace(/(AM|PM)$/i, ' $1').trim();
}

export function formatDaysCompact(days: DayCode[]): string {
  return days.join('');
}

export function formatDaysReadable(days: DayCode[]): string {
  return days.map((d) => DAY_NAMES[d].short).join(', ');
}

/**
 * Extracts the exact numeric course number.
 * Examples: CS 100 -> 100, ECON 121 -> 121, CLCA 1213 -> 1213, ECON 2301 -> 2301, FINN 341A -> 341, MATH 001 -> 1.
 */
export function getCourseNumber(code: string): number {
  const match = code.match(/\b(\d{1,4})[A-Z]?$/);
  if (!match) return 0;
  return parseInt(match[1], 10);
}

/**
 * Checks whether a course's numeric code falls strictly within [minVal, maxVal] (inclusive).
 * Example: 100 to 150 includes 100..150 only (excludes 151+ and 1000+ courses).
 */
export function matchesCourseLevelRange(
  code: string,
  minVal: number | null,
  maxVal: number | null
): boolean {
  const num = getCourseNumber(code);
  if (minVal !== null && num < minVal) return false;
  if (maxVal !== null && num > maxVal) return false;
  return true;
}

/**
 * Parses manual day text like "TR", "MW", "Tue Thu", "Tuesday Thursday", "Mon, Wed, Fri"
 * into normalized DayCode[].
 */
export function parseManualDaysInput(input: string): DayCode[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const found: DayCode[] = [];
  const add = (d: DayCode) => {
    if (!found.includes(d)) found.push(d);
  };

  // Check if user wrote full/abbreviated words (contains spaces, commas, or lowercase letters like "Tue Thu")
  const hasWordTokens =
    /\b(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\b/i.test(
      trimmed
    );

  if (hasWordTokens) {
    const tokens = trimmed.toLowerCase().split(/[\s,;&/+]+/).filter(Boolean);
    for (const tok of tokens) {
      if (tok.startsWith('mo') || tok === 'm') add('M');
      else if (tok.startsWith('tu') || tok === 't') add('T');
      else if (tok.startsWith('we') || tok === 'w') add('W');
      else if (tok.startsWith('th') || tok === 'r') add('R');
      else if (tok.startsWith('fr') || tok === 'f') add('F');
      else if (tok.startsWith('sa') || tok === 's') add('S');
      else if (tok.startsWith('su') || tok === 'u') add('U');
    }
    return found;
  }

  // Compact LUMS notation like "TR", "MW", "MWF", "FSU"
  const upper = trimmed.toUpperCase().replace(/[^MTWRFSU]/g, '');
  for (const ch of upper) {
    if (DAY_ORDER.includes(ch as DayCode)) {
      add(ch as DayCode);
    }
  }
  return found;
}

/**
 * Returns true if a section's primary meeting(s) fit inside the requested day/time slot.
 * - If multiple days are selected (e.g., ['T', 'R']), every meeting day must be in `slot.days`
 *   AND the section must meet on at least one of those days, with start/end inside [startMin, endMin].
 * - If a single day is selected (e.g., dragging on Tuesday on the grid), any section that meets on
 *   that day with startMin >= slot.startMin && endMin <= slot.endMin matches (so TR courses on Tue
 *   still show up when dragging on Tuesday!).
 */
export function sectionMatchesTimeSlot(
  section: SectionOption,
  slot: TimeSlotFilter
): boolean {
  if (slot.days.length === 0) {
    // Only time window specified (any day)
    return section.meetings.every(
      (m) => m.startMin >= slot.startMin && m.endMin <= slot.endMin
    );
  }

  const slotDaySet = new Set(slot.days);

  if (slot.days.length === 1) {
    // Single-day selection (e.g. dragging on Tuesday): match any section that has a meeting on that day within the window
    return section.meetings.some(
      (m) =>
        m.days.some((d) => slotDaySet.has(d)) &&
        m.startMin >= slot.startMin &&
        m.endMin <= slot.endMin
    );
  }

  // Multi-day selection (e.g. Tue & Thu 12-3 PM): every meeting day of the section is within selected days
  // and all times fall cleanly inside [startMin, endMin].
  return section.meetings.every(
    (m) =>
      m.days.length > 0 &&
      m.days.every((d) => slotDaySet.has(d)) &&
      m.startMin >= slot.startMin &&
      m.endMin <= slot.endMin
  );
}

export function resolveCourse(
  course: Course,
  courseMap: Map<string, Course>
): Course {
  if (course.crossListedWith) {
    const primary = courseMap.get(course.crossListedWith);
    if (primary) {
      return {
        ...course,
        sections: primary.sections,
      };
    }
  }
  return course;
}

export function getBlocksForSelection(
  course: Course,
  section: SectionOption,
  linkedOption: SectionComponent | undefined,
  colorIndex: number,
  displayCode: string,
  isPreview = false
): GridBlock[] {
  const blocks: GridBlock[] = [];
  const hasCompanion =
    Boolean(section.pairedComponent) ||
    (section.linkedOptions?.length ?? 0) > 0;

  const toTag = (type: string): 'LEC' | 'RAC' | 'LAB' | undefined => {
    if (!hasCompanion) return undefined;
    if (type === 'LEC' || type === 'RAC' || type === 'LAB') return type;
    return undefined;
  };

  const pushMeetings = (
    meetings: Meeting[],
    sectionLabel: string,
    idPrefix: string,
    componentTag?: 'LEC' | 'RAC' | 'LAB'
  ) => {
    meetings.forEach((meeting, mIdx) => {
      meeting.days.forEach((day) => {
        blocks.push({
          id: `${idPrefix}-${day}-${mIdx}-${isPreview ? 'preview' : 'real'}`,
          entryCourseCode: displayCode,
          courseCode: displayCode,
          courseTitle: course.title,
          credits: course.credits,
          sectionLabel,
          componentTag,
          day,
          startMin: meeting.startMin,
          endMin: meeting.endMin,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          session: meeting.session,
          instructors: meeting.instructors,
          colorIndex,
          isPreview,
        });
      });
    });
  };

  pushMeetings(
    section.meetings,
    section.name,
    `${displayCode}-${section.id}`,
    toTag(section.type)
  );

  if (section.pairedComponent) {
    pushMeetings(
      section.pairedComponent.meetings,
      section.pairedComponent.name,
      `${displayCode}-${section.pairedComponent.id}`,
      toTag(section.pairedComponent.type)
    );
  }

  if (linkedOption) {
    pushMeetings(
      linkedOption.meetings,
      linkedOption.name,
      `${displayCode}-${linkedOption.id}`,
      toTag(linkedOption.type)
    );
  }

  return blocks;
}

export function meetingsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function sessionsOverlap(sessionA: string, sessionB: string): boolean {
  const a = sessionA.toLowerCase();
  const b = sessionB.toLowerCase();
  if (
    (a.includes('8wk1') && b.includes('8wk2')) ||
    (a.includes('8wk2') && b.includes('8wk1'))
  ) {
    return false;
  }
  if (
    (a.includes('8w1') && b.includes('8w2')) ||
    (a.includes('8w2') && b.includes('8w1'))
  ) {
    return false;
  }
  if (
    (a.includes('first half') && b.includes('second half')) ||
    (a.includes('second half') && b.includes('first half'))
  ) {
    return false;
  }
  return true;
}

export function buildTimetableBlocks(
  entries: SelectedCourseEntry[],
  courseMap: Map<string, Course>
): GridBlock[] {
  const blocks: GridBlock[] = [];

  for (const entry of entries) {
    const rawCourse =
      courseMap.get(entry.courseCode) ?? courseMap.get(entry.primaryCode);
    if (!rawCourse) continue;
    const resolved = resolveCourse(rawCourse, courseMap);
    const section = resolved.sections.find((s) => s.id === entry.sectionId);
    if (!section) continue;
    const linked = entry.linkedOptionId
      ? section.linkedOptions?.find((l) => l.id === entry.linkedOptionId)
      : undefined;

    blocks.push(
      ...getBlocksForSelection(
        resolved,
        section,
        linked,
        entry.colorIndex,
        entry.courseCode,
        false
      )
    );
  }

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.day !== b.day) continue;
      if (!sessionsOverlap(a.session, b.session)) continue;
      if (meetingsOverlap(a.startMin, a.endMin, b.startMin, b.endMin)) {
        a.hasConflict = true;
        b.hasConflict = true;
        a.conflictWith = Array.from(
          new Set([...(a.conflictWith ?? []), `${b.courseCode} ${b.sectionLabel}`])
        );
        b.conflictWith = Array.from(
          new Set([...(b.conflictWith ?? []), `${a.courseCode} ${a.sectionLabel}`])
        );
      }
    }
  }

  return blocks;
}

export function findConflictsForMeetings(
  candidateMeetings: Meeting[],
  existingBlocks: GridBlock[],
  ignoreCourseCode?: string
): ConflictDetail[] {
  const conflicts: ConflictDetail[] = [];
  const seen = new Set<string>();

  for (const meeting of candidateMeetings) {
    for (const day of meeting.days) {
      for (const block of existingBlocks) {
        if (block.isPreview) continue;
        if (ignoreCourseCode && block.entryCourseCode === ignoreCourseCode) continue;
        if (block.day !== day) continue;
        if (!sessionsOverlap(meeting.session, block.session)) continue;
        if (meetingsOverlap(meeting.startMin, meeting.endMin, block.startMin, block.endMin)) {
          const key = `${block.courseCode}-${block.sectionLabel}-${day}`;
          if (!seen.has(key)) {
            seen.add(key);
            conflicts.push({
              withCourseCode: block.courseCode,
              withSection: block.sectionLabel,
              day,
              overlapLabel: `${DAY_NAMES[day].short} ${formatTimeDisplay(block.startTime)}–${formatTimeDisplay(block.endTime)}`,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

export function pickNextColorIndex(entries: SelectedCourseEntry[]): number {
  const used = new Set(entries.map((e) => e.colorIndex));
  for (let i = 0; i < COURSE_PALETTE.length; i++) {
    if (!used.has(i)) return i;
  }
  return entries.length % COURSE_PALETTE.length;
}
