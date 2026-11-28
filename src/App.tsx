import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import spring2027Data from './data/spring2027.json';
import type {
  Course,
  ScheduleCatalog,
  SectionComponent,
  SectionOption,
} from './types/course';
import {
  buildTimetableBlocks,
  getBlocksForSelection,
  type TimeSlotFilter,
} from './lib/scheduleUtils';
import { useTheme, useTimetables } from './hooks/useTimetables';
import { Header } from './components/Header';
import { CourseSidebar } from './components/CourseSidebar';
import { TimetableGrid } from './components/TimetableGrid';

const BUNDLED_CATALOG = spring2027Data as ScheduleCatalog;

export function App() {
  const { dark, toggleTheme } = useTheme();
  const {
    timetables,
    activeTimetable,
    setActiveId,
    createTimetable,
    duplicateTimetable,
    deleteTimetable,
    upsertCourseEntry,
    removeCourseEntry,
    clearActiveTimetable,
  } = useTimetables();

  const [showGaps, setShowGaps] = useState(true);
  const [showWeekends, setShowWeekends] = useState(false);
  const [mobileTab, setMobileTab] = useState<'timetable' | 'courses'>(
    'timetable'
  );
  const [focusedCourseCode, setFocusedCourseCode] = useState<string | null>(
    null
  );
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeSlotFilter | null>(
    null
  );
  const [previewTarget, setPreviewTarget] = useState<{
    course: Course;
    section: SectionOption;
    linkedOption?: SectionComponent;
  } | null>(null);

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of BUNDLED_CATALOG.courses) {
      map.set(c.code, c);
    }
    return map;
  }, []);

  const blocks = useMemo(
    () => buildTimetableBlocks(activeTimetable.entries, courseMap),
    [activeTimetable.entries, courseMap]
  );

  const previewBlocks = useMemo(() => {
    if (!previewTarget) return [];
    const existing = activeTimetable.entries.find(
      (e) =>
        e.courseCode === previewTarget.course.code ||
        e.primaryCode === previewTarget.course.code
    );
    if (existing && existing.sectionId === previewTarget.section.id) {
      if (
        !previewTarget.linkedOption ||
        existing.linkedOptionId === previewTarget.linkedOption.id
      ) {
        return [];
      }
      const all = getBlocksForSelection(
        previewTarget.course,
        previewTarget.section,
        previewTarget.linkedOption,
        0,
        previewTarget.course.code,
        true
      );
      return all.filter(
        (b) => b.sectionLabel === previewTarget.linkedOption!.name
      );
    }
    return getBlocksForSelection(
      previewTarget.course,
      previewTarget.section,
      previewTarget.linkedOption,
      0,
      previewTarget.course.code,
      true
    );
  }, [previewTarget, activeTimetable.entries]);

  const totalCredits = useMemo(() => {
    return activeTimetable.entries.reduce((sum, entry) => {
      const c =
        courseMap.get(entry.courseCode) ?? courseMap.get(entry.primaryCode);
      return sum + (c?.credits ?? 0);
    }, 0);
  }, [activeTimetable.entries, courseMap]);

  const conflictCount = useMemo(() => {
    const pairs = new Set<string>();
    for (const b of blocks) {
      if (b.hasConflict && b.conflictWith) {
        for (const other of b.conflictWith) {
          const pair = [`${b.courseCode} ${b.sectionLabel}`, other]
            .sort()
            .join('|');
          pairs.add(pair);
        }
      }
    }
    return pairs.size;
  }, [blocks]);

  const handleClearFocus = useCallback(() => setFocusedCourseCode(null), []);

  const handleFocusCourse = useCallback((code: string) => {
    setFocusedCourseCode(code);
    setMobileTab('courses');
  }, []);

  const handleGridSelectSlot = useCallback((slot: TimeSlotFilter | null) => {
    setTimeSlotFilter(slot);
    if (slot && slot.source === 'grid') {
      setMobileTab('courses');
    }
  }, []);

  const headerProps = {
    timetables,
    activeTimetable,
    totalCredits,
    conflictCount,
    showGaps,
    onToggleGaps: () => setShowGaps((v) => !v),
    showWeekends,
    onToggleWeekends: () => setShowWeekends((v) => !v),
    dark,
    onToggleTheme: toggleTheme,
    onSelectTimetable: setActiveId,
    onCreateTimetable: createTimetable,
    onDuplicateTimetable: duplicateTimetable,
    onDeleteTimetable: deleteTimetable,
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen overflow-hidden bg-[#F6F4EF] dark:bg-[#141716]">
      {/* Mobile-Only Pinned Top Header */}
      <div className="lg:hidden shrink-0">
        <Header {...headerProps} />
      </div>

      {/* Left Sidebar: Full-height on desktop, switchable tab on mobile */}
      <div
        className={`${
          mobileTab === 'courses' ? 'flex flex-1 min-h-0' : 'hidden'
        } lg:flex lg:flex-none lg:h-full`}
      >
        <CourseSidebar
          catalog={BUNDLED_CATALOG}
          courses={BUNDLED_CATALOG.courses}
          courseMap={courseMap}
          entries={activeTimetable.entries}
          existingBlocks={blocks}
          timeSlotFilter={timeSlotFilter}
          onTimeSlotFilterChange={setTimeSlotFilter}
          focusedCourseCode={focusedCourseCode}
          onClearFocus={handleClearFocus}
          onSelectSection={upsertCourseEntry}
          onRemoveCourse={removeCourseEntry}
          onClearTimetable={clearActiveTimetable}
          onPreviewChange={setPreviewTarget}
        />
      </div>

      {/* Right Side: Desktop Header + Timetable Grid */}
      <div
        className={`${
          mobileTab === 'timetable' ? 'flex' : 'hidden'
        } lg:flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden`}
      >
        <div className="hidden lg:block shrink-0">
          <Header {...headerProps} />
        </div>

        <TimetableGrid
          blocks={blocks}
          previewBlocks={previewBlocks}
          selectedSlot={timeSlotFilter}
          showGaps={showGaps}
          showWeekends={showWeekends}
          onSelectSlot={handleGridSelectSlot}
          onFocusCourse={handleFocusCourse}
          onRemoveCourse={removeCourseEntry}
        />
      </div>

      {/* Mobile Bottom Tab Switcher (< lg only) */}
      <nav className="lg:hidden shrink-0 grid grid-cols-2 border-t border-[#E6E2D9] dark:border-[#262C29] bg-[#FCFBF8]/95 dark:bg-[#181C1A]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => setMobileTab('timetable')}
          className={`flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors cursor-pointer ${
            mobileTab === 'timetable'
              ? 'text-[#2E6257] dark:text-[#86C4B6] bg-[#EDF5F2]/60 dark:bg-[#1E312C]/50'
              : 'text-[#6A746E] dark:text-[#8E9A94]'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Timetable</span>
          {activeTimetable.entries.length > 0 && (
            <span className="rounded-full bg-[#3D7A6E]/15 dark:bg-[#72B0A2]/20 px-1.5 py-0.5 text-[10.5px] font-bold text-[#2E6257] dark:text-[#86C4B6] leading-none">
              {activeTimetable.entries.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('courses')}
          className={`flex items-center justify-center gap-2 py-3 text-xs font-semibold border-l border-[#ECE8DF] dark:border-[#262C29] transition-colors cursor-pointer ${
            mobileTab === 'courses'
              ? 'text-[#2E6257] dark:text-[#86C4B6] bg-[#EDF5F2]/60 dark:bg-[#1E312C]/50'
              : 'text-[#6A746E] dark:text-[#8E9A94]'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Courses</span>
          {timeSlotFilter && (
            <span className="h-2 w-2 rounded-full bg-[#3D7A6E] dark:bg-[#72B0A2]" />
          )}
        </button>
      </nav>
    </div>
  );
}

export default App;
