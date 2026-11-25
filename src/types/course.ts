export type DayCode = 'M' | 'T' | 'W' | 'R' | 'F' | 'S' | 'U';

export type SectionType = 'LEC' | 'RAC' | 'LAB' | 'SEM' | 'PRT' | 'OTHER';

export interface Meeting {
  days: DayCode[];
  startTime: string;
  endTime: string;
  startMin: number;
  endMin: number;
  session: string;
  instructors: string[];
}

export interface SectionComponent {
  id: string;
  name: string;
  type: SectionType;
  meetings: Meeting[];
}

export interface SectionOption {
  id: string;
  name: string;
  type: SectionType;
  meetings: Meeting[];
  /** Mandatory 1:1 companion component (e.g., CS 200 LEC 1 + LAB 1, BIO 100 LEC 1 + LAB 1) */
  pairedComponent?: SectionComponent;
  /** Multiple selectable companion components (e.g., ECON 121 LEC 1 -> RAC 1 / RAC 2 / RAC 3) */
  linkedOptions?: SectionComponent[];
}

export interface Course {
  code: string;
  title: string;
  credits: number;
  crossListedWith?: string;
  crossListings?: string[];
  sections: SectionOption[];
}

export interface ScheduleCatalog {
  semester: string;
  sessionDates?: string;
  source: 'bundled' | 'uploaded';
  courses: Course[];
}

export interface SelectedCourseEntry {
  courseCode: string;
  primaryCode: string;
  sectionId: string;
  linkedOptionId?: string;
  colorIndex: number;
}

export interface Timetable {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  entries: SelectedCourseEntry[];
}

export interface GridBlock {
  id: string;
  entryCourseCode: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  sectionLabel: string;
  /** Populated only when the course has a linked/paired component (shows LEC / RAC / LAB on the grid) */
  componentTag?: 'LEC' | 'RAC' | 'LAB';
  day: DayCode;
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
  session: string;
  instructors: string[];
  colorIndex: number;
  isPreview?: boolean;
  hasConflict?: boolean;
  conflictWith?: string[];
}

export interface ConflictDetail {
  withCourseCode: string;
  withSection: string;
  day: DayCode;
  overlapLabel: string;
}
