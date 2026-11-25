import type {
  Course,
  DayCode,
  Meeting,
  ScheduleCatalog,
  SectionComponent,
  SectionOption,
  SectionType,
} from '../types/course';
import { parseTimeToMinutes } from './scheduleUtils.ts';

export interface RawSectionRow {
  name: string;
  type: SectionType;
  number: string;
  meetings: Meeting[];
}

export interface RawCourse {
  code: string;
  title: string;
  credits: number;
  crossListedWith?: string;
  rawSections: RawSectionRow[];
}

const VALID_DAYS = new Set<string>(['M', 'T', 'W', 'R', 'F', 'S', 'U']);

export function parseDays(dayStr: string): DayCode[] {
  const cleaned = dayStr.trim().replace(/Su/gi, 'U').toUpperCase();
  const days: DayCode[] = [];
  for (const ch of cleaned) {
    if (VALID_DAYS.has(ch) && !days.includes(ch as DayCode)) {
      days.push(ch as DayCode);
    }
  }
  return days;
}

export function getSectionType(sectionName: string): SectionType {
  const upper = sectionName.trim().toUpperCase();
  if (upper.startsWith('LEC')) return 'LEC';
  if (upper.startsWith('RAC') || upper.startsWith('REC')) return 'RAC';
  if (upper.startsWith('LAB')) return 'LAB';
  if (upper.startsWith('SEM')) return 'SEM';
  if (upper.startsWith('PRT')) return 'PRT';
  return 'OTHER';
}

export function getSectionNumber(sectionName: string): string {
  const m = sectionName.match(/(\d+[A-Z]?)$/);
  return m ? m[1] : '';
}

/**
 * Groups flat section rows of a course into structured SectionOption[]
 * handling:
 *  - Pattern A: LEC followed by 1 LAB/RAC (mandatory pairedComponent)
 *               or 2+ LAB/RAC (selectable linkedOptions, e.g. ECON 111 / ECON 121)
 *  - Pattern B: LAB k followed immediately by LEC k (pairedComponent, e.g. BIO 100 / CHEM 100 / ECON 2301 / ENGG 100)
 *  - Pattern C: Standalone LEC, LAB, SEM, PRT
 */
export function groupRawSections(
  courseCode: string,
  rawSections: RawSectionRow[]
): SectionOption[] {
  if (rawSections.length === 0) return [];

  // Check Pattern B: alternating LAB k + LEC k pairs (first row is LAB and next is LEC with same number)
  const isLabBeforeLecPattern =
    rawSections.length >= 2 &&
    rawSections[0].type === 'LAB' &&
    rawSections[1].type === 'LEC' &&
    rawSections[0].number === rawSections[1].number;

  if (isLabBeforeLecPattern) {
    const options: SectionOption[] = [];
    let i = 0;
    while (i < rawSections.length) {
      const curr = rawSections[i];
      const next = rawSections[i + 1];
      if (
        curr.type === 'LAB' &&
        next &&
        next.type === 'LEC' &&
        curr.number === next.number
      ) {
        options.push({
          id: `${courseCode}::${next.name}`,
          name: next.name,
          type: next.type,
          meetings: next.meetings,
          pairedComponent: {
            id: `${courseCode}::${curr.name}`,
            name: curr.name,
            type: curr.type,
            meetings: curr.meetings,
          },
        });
        i += 2;
      } else {
        options.push({
          id: `${courseCode}::${curr.name}`,
          name: curr.name,
          type: curr.type,
          meetings: curr.meetings,
        });
        i += 1;
      }
    }
    return options;
  }

  // Pattern A & C: LEC followed by 0, 1, or many RAC/LAB rows
  const hasAnyLec = rawSections.some((s) => s.type === 'LEC');
  if (!hasAnyLec) {
    // Pure LAB / SEM / PRT course
    return rawSections.map((s) => ({
      id: `${courseCode}::${s.name}`,
      name: s.name,
      type: s.type,
      meetings: s.meetings,
    }));
  }

  const options: SectionOption[] = [];
  let i = 0;
  while (i < rawSections.length) {
    const curr = rawSections[i];
    if (curr.type === 'LEC') {
      const children: SectionComponent[] = [];
      let j = i + 1;
      while (
        j < rawSections.length &&
        (rawSections[j].type === 'RAC' || rawSections[j].type === 'LAB')
      ) {
        const child = rawSections[j];
        children.push({
          id: `${courseCode}::${child.name}`,
          name: child.name,
          type: child.type,
          meetings: child.meetings,
        });
        j++;
      }

      const option: SectionOption = {
        id: `${courseCode}::${curr.name}`,
        name: curr.name,
        type: curr.type,
        meetings: curr.meetings,
      };

      if (children.length === 1) {
        option.pairedComponent = children[0];
      } else if (children.length > 1) {
        option.linkedOptions = children;
      }

      options.push(option);
      i = j;
    } else {
      options.push({
        id: `${courseCode}::${curr.name}`,
        name: curr.name,
        type: curr.type,
        meetings: curr.meetings,
      });
      i++;
    }
  }

  return options;
}

/**
 * Finalizes raw parsed courses into Course[] with cross-listing back-references.
 */
export function finalizeCourses(rawCourses: RawCourse[]): Course[] {
  const courses: Course[] = rawCourses.map((rc) => ({
    code: rc.code,
    title: rc.title,
    credits: rc.credits,
    ...(rc.crossListedWith ? { crossListedWith: rc.crossListedWith } : {}),
    sections: groupRawSections(rc.code, rc.rawSections),
  }));

  // Populate crossListings on primary courses
  const map = new Map<string, Course>();
  for (const c of courses) {
    map.set(c.code, c);
  }
  for (const c of courses) {
    if (c.crossListedWith) {
      const primary = map.get(c.crossListedWith);
      if (primary) {
        primary.crossListings = Array.from(
          new Set([...(primary.crossListings ?? []), c.code])
        );
      }
    }
  }

  return courses;
}

/**
 * Parses LUMS Class Schedule lines (from PDF text extraction or OCR).
 * Used by both the browser PDF uploader and catalog generation.
 */
export function parseScheduleText(
  text: string,
  source: 'bundled' | 'uploaded' = 'uploaded'
): ScheduleCatalog {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\uFFFD/g, '-').trim())
    .filter((l) => l.length > 0);

  let semester = 'Custom Schedule';
  let sessionDates: string | undefined;

  for (const line of lines.slice(0, 15)) {
    const semMatch = line.match(/Semester:\s*(.+?)(?:\s+Session Dates:|$)/i);
    if (semMatch) semester = semMatch[1].trim();
    const datesMatch = line.match(/Session Dates:\s*(.+)$/i);
    if (datesMatch) sessionDates = datesMatch[1].trim();
  }

  const rawCourses: RawCourse[] = [];
  let currentCourse: RawCourse | null = null;
  let currentSection: RawSectionRow | null = null;

  const COURSE_CODE_RE = /^([A-Z]{2,5}\s+\d{3,4}[A-Z]?)\b(.*)$/;
  const SECTION_MEETING_RE =
    /\b((?:LEC|LAB|RAC|REC|SEM|PRT)\s+\d+)\s+([A-Za-z0-9()\- ]+?)\s+([MTWRFSU]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s+(\d{1,2}:\d{2}\s*[AP]M)(?:\s+(.*))?$/;
  const CONTINUATION_MEETING_RE =
    /^([A-Za-z0-9()\- ]+?)\s+([MTWRFSU]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s+(\d{1,2}:\d{2}\s*[AP]M)(?:\s+(.*))?$/;
  const CROSSLIST_RE = /\bw\/\s*([A-Z]{2,5}\s+\d{3,4}[A-Z]?)\b/;

  const isHeaderOrFooter = (line: string): boolean => {
    return (
      /^Lahore University of Management Sciences/i.test(line) ||
      /^Class Schedule$/i.test(line) ||
      /^Semester:/i.test(line) ||
      /^Prepared on:/i.test(line) ||
      /^Note:/i.test(line) ||
      /^Course Code\s+Course Title/i.test(line) ||
      /^Hrs\.\s+Section/i.test(line) ||
      /^Office of the Registrar/i.test(line) ||
      /^Page\s+\d+\s+of/i.test(line) ||
      /^\d+$/.test(line)
    );
  };

  // Stop at the legend page (Session | Dates)
  const stopIdx = lines.findIndex(
    (l, idx) => idx > 20 && /^Session\s+Dates$/i.test(l)
  );
  const bodyLines = stopIdx === -1 ? lines : lines.slice(0, stopIdx);

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (isHeaderOrFooter(line)) continue;

    // 1. Check if this line starts a new course
    const courseMatch = line.match(COURSE_CODE_RE);
    if (courseMatch) {
      const code = courseMatch[1].replace(/\s+/g, ' ').trim();
      let rest = courseMatch[2].trim();

      // Join wrapped title/section lines if this line doesn't yet contain a section or cross-list
      while (
        !SECTION_MEETING_RE.test(rest) &&
        !CROSSLIST_RE.test(rest) &&
        i + 1 < bodyLines.length &&
        !isHeaderOrFooter(bodyLines[i + 1]) &&
        !COURSE_CODE_RE.test(bodyLines[i + 1])
      ) {
        i++;
        rest = `${rest} ${bodyLines[i]}`.trim();
      }

      const crossMatch = rest.match(CROSSLIST_RE);
      if (crossMatch) {
        const beforeCross = rest.slice(0, crossMatch.index).trim();
        const creditMatch = beforeCross.match(/^(.*?)\s+(\d+(?:\.\d+)?)$/);
        const title = creditMatch ? creditMatch[1].trim() : beforeCross;
        const credits = creditMatch ? parseFloat(creditMatch[2]) : 0;

        currentCourse = {
          code,
          title,
          credits,
          crossListedWith: crossMatch[1].replace(/\s+/g, ' ').trim(),
          rawSections: [],
        };
        rawCourses.push(currentCourse);
        currentSection = null;
        continue;
      }

      const secMatch = rest.match(SECTION_MEETING_RE);
      if (secMatch) {
        const beforeSec = rest.slice(0, secMatch.index).trim();
        const creditMatch = beforeSec.match(/^(.*?)\s+(\d+(?:\.\d+)?)$/);
        const title = creditMatch ? creditMatch[1].trim() : beforeSec;
        const credits = creditMatch ? parseFloat(creditMatch[2]) : 0;

        const secName = secMatch[1].replace(/\s+/g, ' ').trim();
        const session = secMatch[2].trim();
        const days = parseDays(secMatch[3]);
        const startTime = secMatch[4].replace(/\s+/g, '').toUpperCase();
        const endTime = secMatch[5].replace(/\s+/g, '').toUpperCase();
        const instructor = (secMatch[6] ?? '').trim();

        const meeting: Meeting = {
          days,
          startTime,
          endTime,
          startMin: parseTimeToMinutes(startTime),
          endMin: parseTimeToMinutes(endTime),
          session,
          instructors: instructor ? [instructor] : [],
        };

        currentSection = {
          name: secName,
          type: getSectionType(secName),
          number: getSectionNumber(secName),
          meetings: [meeting],
        };
        currentCourse = {
          code,
          title,
          credits,
          rawSections: [currentSection],
        };
        rawCourses.push(currentCourse);
        continue;
      }
    }

    // 2. Check if this line starts a new section for the current course
    if (currentCourse) {
      let candidate = line;
      // Handle EDUX wrapped session names like "SEM 1 EDUX(Altern\nate Sat-Sun) U 11:00AM 12:50PM ..."
      if (
        /^(?:LEC|LAB|RAC|REC|SEM|PRT)\s+\d+\s+EDUX\(/i.test(candidate) &&
        !SECTION_MEETING_RE.test(candidate) &&
        i + 1 < bodyLines.length
      ) {
        i++;
        candidate = `${candidate}${bodyLines[i]}`;
      }

      const secMatch = candidate.match(SECTION_MEETING_RE);
      if (secMatch && secMatch.index === 0) {
        const secName = secMatch[1].replace(/\s+/g, ' ').trim();
        const session = secMatch[2].trim();
        const days = parseDays(secMatch[3]);
        const startTime = secMatch[4].replace(/\s+/g, '').toUpperCase();
        const endTime = secMatch[5].replace(/\s+/g, '').toUpperCase();
        const instructor = (secMatch[6] ?? '').trim();

        currentSection = {
          name: secName,
          type: getSectionType(secName),
          number: getSectionNumber(secName),
          meetings: [
            {
              days,
              startTime,
              endTime,
              startMin: parseTimeToMinutes(startTime),
              endMin: parseTimeToMinutes(endTime),
              session,
              instructors: instructor ? [instructor] : [],
            },
          ],
        };
        currentCourse.rawSections.push(currentSection);
        continue;
      }

      // 3. Check if this line is a continuation meeting slot for the current section (e.g., PHIL 352, SS 189, EDUX)
      if (currentSection) {
        let contCandidate = line;
        if (
          /^EDUX\(/i.test(contCandidate) &&
          !CONTINUATION_MEETING_RE.test(contCandidate) &&
          i + 1 < bodyLines.length
        ) {
          i++;
          contCandidate = `${contCandidate}${bodyLines[i]}`;
        }

        const contMatch = contCandidate.match(CONTINUATION_MEETING_RE);
        if (contMatch) {
          const session = contMatch[1].trim();
          const days = parseDays(contMatch[2]);
          const startTime = contMatch[3].replace(/\s+/g, '').toUpperCase();
          const endTime = contMatch[4].replace(/\s+/g, '').toUpperCase();
          const instructor = (contMatch[5] ?? '').trim();

          if (days.length > 0) {
            currentSection.meetings.push({
              days,
              startTime,
              endTime,
              startMin: parseTimeToMinutes(startTime),
              endMin: parseTimeToMinutes(endTime),
              session,
              instructors: instructor ? [instructor] : [],
            });
            continue;
          }
        }

        // 4. Otherwise, it's an additional instructor line (or wrapped name continuation)
        const lastMeeting =
          currentSection.meetings[currentSection.meetings.length - 1];
        if (lastMeeting && line.length > 1 && line.length < 60) {
          const cleaned = line.replace(/\s+\.$/, '').trim();
          if (cleaned) {
            // Heuristic: single-word continuation of a wrapped name (e.g. "Khan", "Ali", "Rehman", "Rizvi", "Saleem", "Habib")
            const wordCount = cleaned.split(/\s+/).length;
            if (
              wordCount === 1 &&
              lastMeeting.instructors.length > 0 &&
              cleaned !== 'TBA'
            ) {
              lastMeeting.instructors[lastMeeting.instructors.length - 1] +=
                ` ${cleaned}`;
            } else {
              lastMeeting.instructors.push(cleaned);
            }
          }
        }
      }
    }
  }

  return {
    semester,
    sessionDates,
    source,
    courses: finalizeCourses(rawCourses),
  };
}
