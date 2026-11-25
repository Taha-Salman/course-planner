import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Link2,
  MousePointerClick,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type {
  Course,
  DayCode,
  GridBlock,
  ScheduleCatalog,
  SectionComponent,
  SectionOption,
  SelectedCourseEntry,
} from '../types/course';
import {
  COURSE_PALETTE,
  DAY_NAMES,
  findConflictsForMeetings,
  formatDaysCompact,
  formatDaysReadable,
  formatMinutesToTime,
  formatTimeDisplay,
  matchesCourseLevelRange,
  resolveCourse,
  sectionMatchesTimeSlot,
  type TimeSlotFilter,
} from '../lib/scheduleUtils';

interface CourseSidebarProps {
  catalog: ScheduleCatalog;
  courses: Course[];
  courseMap: Map<string, Course>;
  entries: SelectedCourseEntry[];
  existingBlocks: GridBlock[];
  timeSlotFilter: TimeSlotFilter | null;
  onTimeSlotFilterChange: (slot: TimeSlotFilter | null) => void;
  focusedCourseCode: string | null;
  onClearFocus: () => void;
  onSelectSection: (
    courseCode: string,
    primaryCode: string,
    sectionId: string,
    linkedOptionId?: string
  ) => void;
  onRemoveCourse: (courseCode: string) => void;
  onClearTimetable: () => void;
  onPreviewChange: (
    preview: {
      course: Course;
      section: SectionOption;
      linkedOption?: SectionComponent;
    } | null
  ) => void;
}

const FILTER_DAYS: DayCode[] = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

function normalizeQuery(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '');
}

function getPairDaySuggestion(
  days: DayCode[]
): { pairDay: DayCode; label: string } | null {
  if (days.length !== 1) return null;
  const d = days[0];
  if (d === 'M') return { pairDay: 'W', label: '+ Wed (MW)' };
  if (d === 'W') return { pairDay: 'M', label: '+ Mon (MW)' };
  if (d === 'T') return { pairDay: 'R', label: '+ Thu (TR)' };
  if (d === 'R') return { pairDay: 'T', label: '+ Tue (TR)' };
  return null;
}

interface FixedTimeInputProps {
  label: string;
  minutes: number;
  onChange: (newMinutes: number) => void;
}

const FixedTimeInput: React.FC<FixedTimeInputProps> = ({
  label,
  minutes,
  onChange,
}) => {
  const minInputRef = useRef<HTMLInputElement>(null);

  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const isPm = hours24 >= 12;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const [hourDraft, setHourDraft] = useState(String(hours12));
  const [minDraft, setMinDraft] = useState(String(mins).padStart(2, '0'));

  useEffect(() => {
    setHourDraft(String(hours12));
    setMinDraft(String(mins).padStart(2, '0'));
  }, [hours12, mins]);

  const commit = (h12: number, m: number, pm: boolean) => {
    const clampedH = Math.max(1, Math.min(12, h12));
    const clampedM = Math.max(0, Math.min(59, m));
    let h24 = clampedH % 12;
    if (pm) h24 += 12;
    onChange(h24 * 60 + clampedM);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    setHourDraft(digits);
    if (digits.length > 0) {
      const parsed = parseInt(digits, 10);
      if (parsed >= 1 && parsed <= 12) {
        commit(parsed, mins, isPm);
        if (digits.length === 2 || parsed >= 2) {
          minInputRef.current?.focus();
          minInputRef.current?.select();
        }
      }
    }
  };

  const handleHourBlur = () => {
    const parsed = parseInt(hourDraft, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 12) {
      commit(parsed, mins, isPm);
    } else {
      setHourDraft(String(hours12));
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMinDraft(digits);
    if (digits.length === 2) {
      const parsed = parseInt(digits, 10);
      if (parsed >= 0 && parsed <= 59) {
        commit(hours12, parsed, isPm);
      }
    }
  };

  const handleMinBlur = () => {
    const parsed = parseInt(minDraft, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 59) {
      commit(hours12, parsed, isPm);
      setMinDraft(String(parsed).padStart(2, '0'));
    } else {
      setMinDraft(String(mins).padStart(2, '0'));
    }
  };

  return (
    <div className="space-y-1">
      <span className="block text-[10.5px] font-medium text-[#707A74] dark:text-[#8E9A94]">
        {label}
      </span>
      <div className="flex items-center justify-between rounded-xl border border-[#E2DDD3] dark:border-[#313835] bg-[#FAF9F6] dark:bg-[#252B28] px-1.5 py-1.5 focus-within:border-[#3D7A6E] dark:focus-within:border-[#72B0A2] transition-colors">
        <div className="flex items-center">
          <input
            type="text"
            inputMode="numeric"
            aria-label={`${label} hour`}
            value={hourDraft}
            onChange={handleHourChange}
            onBlur={handleHourBlur}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                commit(hours12, mins, false);
              } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                commit(hours12, mins, true);
              }
            }}
            placeholder="12"
            className="w-5 bg-transparent text-center text-xs font-semibold text-[#1E2421] dark:text-[#EFF2EF] outline-none"
          />
          <span className="text-xs font-semibold text-[#8A948E]">:</span>
          <input
            ref={minInputRef}
            type="text"
            inputMode="numeric"
            aria-label={`${label} minutes`}
            value={minDraft}
            onChange={handleMinChange}
            onBlur={handleMinBlur}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                commit(hours12, mins, false);
              } else if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                commit(hours12, mins, true);
              }
            }}
            placeholder="00"
            className="w-5 bg-transparent text-center text-xs font-semibold text-[#1E2421] dark:text-[#EFF2EF] outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => commit(hours12, mins, !isPm)}
          title="Click or press A/P to toggle AM/PM"
          className="rounded-md bg-[#EAE6DD] dark:bg-[#323A36] px-1.5 py-0.5 text-[10px] font-bold text-[#2E6257] dark:text-[#86C4B6] hover:bg-[#DFD9CE] dark:hover:bg-[#3C4641] transition-colors cursor-pointer"
        >
          {isPm ? 'PM' : 'AM'}
        </button>
      </div>
    </div>
  );
};

export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  catalog,
  courses,
  courseMap,
  entries,
  existingBlocks,
  timeSlotFilter,
  onTimeSlotFilterChange,
  focusedCourseCode,
  onClearFocus,
  onSelectSection,
  onRemoveCourse,
  onClearTimetable,
  onPreviewChange,
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(() => entries.length === 0);

  // Committed course level filter
  const [minLevel, setMinLevel] = useState<number | null>(null);
  const [maxLevel, setMaxLevel] = useState<number | null>(null);

  // Draft state inside the Filter panel (applied on Save, discarded on Cancel)
  const [draftMinLevel, setDraftMinLevel] = useState('');
  const [draftMaxLevel, setDraftMaxLevel] = useState('');
  const [draftDays, setDraftDays] = useState<DayCode[]>([]);
  const [draftStartMin, setDraftStartMin] = useState(12 * 60);
  const [draftEndMin, setDraftEndMin] = useState(15 * 60);
  const [draftTimeTouched, setDraftTimeTouched] = useState(false);

  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [expandedLecId, setExpandedLecId] = useState<string | null>(null);

  // Automatically open filter panel when timetable becomes empty, close when courses are added or user drags a grid slot
  const prevEntriesLenRef = useRef(entries.length);
  useEffect(() => {
    if (entries.length === 0 && prevEntriesLenRef.current > 0) {
      setShowFilters(true);
    } else if (entries.length > 0 && prevEntriesLenRef.current === 0) {
      setShowFilters(false);
    }
    prevEntriesLenRef.current = entries.length;
  }, [entries.length]);

  useEffect(() => {
    if (timeSlotFilter?.source === 'grid') {
      setShowFilters(false);
    }
  }, [timeSlotFilter]);

  const openFilters = () => {
    setDraftMinLevel(minLevel !== null ? String(minLevel) : '');
    setDraftMaxLevel(maxLevel !== null ? String(maxLevel) : '');
    setDraftDays(timeSlotFilter?.days ?? []);
    setDraftStartMin(timeSlotFilter?.startMin ?? 12 * 60);
    setDraftEndMin(timeSlotFilter?.endMin ?? 15 * 60);
    setDraftTimeTouched(timeSlotFilter !== null);
    setShowFilters(true);
  };

  const handleToggleFilters = () => {
    if (showFilters) {
      setShowFilters(false);
    } else {
      openFilters();
    }
  };

  const handleSaveFilters = () => {
    const parsedMin = parseInt(draftMinLevel.trim(), 10);
    const parsedMax = parseInt(draftMaxLevel.trim(), 10);
    setMinLevel(Number.isNaN(parsedMin) ? null : parsedMin);
    setMaxLevel(Number.isNaN(parsedMax) ? null : parsedMax);

    if (draftDays.length > 0 || draftTimeTouched) {
      const startMin = draftStartMin;
      const endMin =
        draftEndMin > draftStartMin
          ? draftEndMin
          : Math.min(23 * 60, draftStartMin + 60);
      onTimeSlotFilterChange({
        days: draftDays,
        startMin,
        endMin,
        source: 'filter',
      });
    } else {
      onTimeSlotFilterChange(null);
    }

    setExpandedCode(null);
    setShowFilters(false);
  };

  const handleCancelFilters = () => {
    setShowFilters(false);
  };

  const handleRemoveAllFilters = () => {
    setDraftMinLevel('');
    setDraftMaxLevel('');
    setDraftDays([]);
    setDraftStartMin(12 * 60);
    setDraftEndMin(15 * 60);
    setDraftTimeTouched(false);
    setMinLevel(null);
    setMaxLevel(null);
    onTimeSlotFilterChange(null);
    setExpandedCode(null);
    setShowFilters(false);
  };

  useEffect(() => {
    if (focusedCourseCode) {
      setQuery(focusedCourseCode);
      setExpandedCode(focusedCourseCode);
      onClearFocus();
    }
  }, [focusedCourseCode, onClearFocus]);

  const entryByCode = useMemo(() => {
    const map = new Map<string, SelectedCourseEntry>();
    for (const e of entries) {
      map.set(e.courseCode, e);
      map.set(e.primaryCode, e);
    }
    return map;
  }, [entries]);

  const hasLevelFilter = minLevel !== null || maxLevel !== null;
  const hasTimeFilter = timeSlotFilter !== null;
  const activeFilterCount = (hasLevelFilter ? 1 : 0) + (hasTimeFilter ? 1 : 0);
  const isSearchingOrFiltering =
    query.trim().length > 0 || hasLevelFilter || hasTimeFilter;

  const filteredResults = useMemo(() => {
    if (!isSearchingOrFiltering) return [];

    const q = query.trim().toLowerCase();
    const qCompact = normalizeQuery(query);

    const results: Array<{
      course: Course;
      resolved: Course;
      matchingSectionIds: Set<string>;
    }> = [];

    for (const course of courses) {
      if (hasLevelFilter && !matchesCourseLevelRange(course.code, minLevel, maxLevel)) {
        continue;
      }

      const resolved = resolveCourse(course, courseMap);

      if (q) {
        const codeMatch = normalizeQuery(course.code).includes(qCompact);
        const titleMatch = course.title.toLowerCase().includes(q);
        const crossMatch =
          course.crossListedWith &&
          normalizeQuery(course.crossListedWith).includes(qCompact);
        let instructorMatch = false;
        if (!codeMatch && !titleMatch && !crossMatch) {
          for (const sec of resolved.sections) {
            if (
              sec.meetings.some((m) =>
                m.instructors.some((inst) => inst.toLowerCase().includes(q))
              )
            ) {
              instructorMatch = true;
              break;
            }
            if (
              sec.linkedOptions?.some((opt) =>
                opt.meetings.some((m) =>
                  m.instructors.some((inst) => inst.toLowerCase().includes(q))
                )
              )
            ) {
              instructorMatch = true;
              break;
            }
          }
        }
        if (!codeMatch && !titleMatch && !crossMatch && !instructorMatch) {
          continue;
        }
      }

      const matchingSectionIds = new Set<string>();
      if (timeSlotFilter) {
        for (const sec of resolved.sections) {
          if (sectionMatchesTimeSlot(sec, timeSlotFilter)) {
            matchingSectionIds.add(sec.id);
          }
        }
        if (matchingSectionIds.size === 0) continue;
      } else {
        for (const sec of resolved.sections) {
          matchingSectionIds.add(sec.id);
        }
      }

      results.push({ course, resolved, matchingSectionIds });
    }

    return results;
  }, [
    courses,
    courseMap,
    query,
    minLevel,
    maxLevel,
    hasLevelFilter,
    timeSlotFilter,
    isSearchingOrFiltering,
  ]);

  const effectiveExpandedCode =
    expandedCode ??
    (filteredResults.length === 1 ? filteredResults[0].course.code : null);

  const visibleResults = useMemo(
    () => filteredResults.slice(0, 60),
    [filteredResults]
  );

  const toggleDraftDay = (day: DayCode) => {
    setDraftDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const pairSuggestion = timeSlotFilter
    ? getPairDaySuggestion(timeSlotFilter.days)
    : null;

  const hasAnyDraftOrActiveFilter =
    draftMinLevel.trim() !== '' ||
    draftMaxLevel.trim() !== '' ||
    draftDays.length > 0 ||
    draftTimeTouched ||
    activeFilterCount > 0;

  return (
    <aside className="flex flex-col h-full w-full lg:w-[272px] xl:w-[292px] shrink-0 border-r border-[#E6E2D9] dark:border-[#2A302D] bg-[#FCFBF8] dark:bg-[#191D1B]">
      {/* Brand Row (Full-Height Sidebar Top) */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#ECE8DF] dark:border-[#262C29]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3D7A6E] dark:bg-[#529184] text-white shadow-2xs">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="leading-tight min-w-0">
          <h1 className="text-[13.5px] font-bold tracking-tight text-[#1E2421] dark:text-[#F0F3F0] truncate">
            Course Planner
          </h1>
          <p className="text-[10.5px] text-[#727C76] dark:text-[#8E9A94] truncate">
            {catalog.semester}
          </p>
        </div>
      </div>

      {/* Search Bar + Filter Toggle */}
      <div className="p-2.5 space-y-2 border-b border-[#ECE8DF] dark:border-[#262C29]">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#838D87]" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                setExpandedCode(null);
                if (next.trim().length > 0) setShowFilters(false);
              }}
              placeholder="Search CS 100, HIST 127…"
              className="w-full rounded-xl border border-[#E2DDD3] dark:border-[#2F3633] bg-white dark:bg-[#212624] pl-8 pr-6 py-1.5 text-[13px] text-[#1E2421] dark:text-[#F0F3F0] placeholder:text-[#909A94] dark:placeholder:text-[#6E7A74] focus:border-[#3D7A6E] dark:focus:border-[#72B0A2] focus:outline-none focus:ring-2 focus:ring-[#3D7A6E]/15 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setExpandedCode(null);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#8A948E] hover:bg-[#EFECE5] dark:hover:bg-[#2D3330] hover:text-[#1E2421] dark:hover:text-white transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleFilters}
            title="Filter by course level or day & time"
            className={`relative inline-flex items-center gap-1 rounded-xl border px-2 py-1.5 text-xs font-medium transition-all cursor-pointer shrink-0 ${
              showFilters || activeFilterCount > 0
                ? 'border-[#3D7A6E] dark:border-[#6BA89B] bg-[#EDF5F2] dark:bg-[#1E312C] text-[#2B5E53] dark:text-[#8CC8BA]'
                : 'border-[#E2DDD3] dark:border-[#2F3633] bg-white dark:bg-[#212624] text-[#4C5651] dark:text-[#C4CEC8] hover:bg-[#F4F1EA] dark:hover:bg-[#282E2B]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#3D7A6E] dark:bg-[#6BA89B] px-1 text-[10px] font-bold text-white dark:text-[#141716]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Manual Filter Panel with Save & Cancel */}
        {showFilters && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveFilters();
            }}
            className="rounded-xl border border-[#E4E0D7] dark:border-[#2C3330] bg-white dark:bg-[#1F2422] p-3 space-y-3 shadow-xs"
          >
            {/* Manual Course Level Range */}
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-semibold text-[#3B443F] dark:text-[#D1DAD5]">
                Course Level{' '}
                <span className="font-normal text-[#838D87] dark:text-[#7E8A84]">
                  (Optional)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <span className="block text-[10.5px] font-medium text-[#707A74] dark:text-[#8E9A94]">
                    From
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draftMinLevel}
                    onChange={(e) =>
                      setDraftMinLevel(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="100"
                    className="w-full rounded-lg border border-[#E2DDD3] dark:border-[#313835] bg-[#FAF9F6] dark:bg-[#252B28] px-2 py-1 text-xs font-medium text-[#1E2421] dark:text-[#EFF2EF] placeholder:text-[#9AA39E] dark:placeholder:text-[#66726C] focus:border-[#3D7A6E] dark:focus:border-[#72B0A2] focus:outline-none"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[10.5px] font-medium text-[#707A74] dark:text-[#8E9A94]">
                    To
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={draftMaxLevel}
                    onChange={(e) =>
                      setDraftMaxLevel(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="150"
                    className="w-full rounded-lg border border-[#E2DDD3] dark:border-[#313835] bg-[#FAF9F6] dark:bg-[#252B28] px-2 py-1 text-xs font-medium text-[#1E2421] dark:text-[#EFF2EF] placeholder:text-[#9AA39E] dark:placeholder:text-[#66726C] focus:border-[#3D7A6E] dark:focus:border-[#72B0A2] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Days (Clean Buttons Only — No Empty Bar) & Fixed-Format Time */}
            <div className="space-y-2 pt-2.5 border-t border-[#EFECE5] dark:border-[#2A302D]">
              <label className="block text-[11.5px] font-semibold text-[#3B443F] dark:text-[#D1DAD5]">
                Days &amp; Time{' '}
                <span className="font-normal text-[#838D87] dark:text-[#7E8A84]">
                  (Optional)
                </span>
              </label>

              <div className="grid grid-cols-7 gap-1">
                {FILTER_DAYS.map((day) => {
                  const selected = draftDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDraftDay(day)}
                      title={DAY_NAMES[day].full}
                      className={`rounded-md py-1 text-[10.5px] font-semibold transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#3D7A6E] dark:bg-[#5B9B8E] text-white'
                          : 'bg-[#F3F0E9] dark:bg-[#272D2A] text-[#5C6660] dark:text-[#9BA6A0] hover:bg-[#E8E4DB] dark:hover:bg-[#303734]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <FixedTimeInput
                  label="Start (HH:MM)"
                  minutes={draftStartMin}
                  onChange={(m) => {
                    setDraftStartMin(m);
                    setDraftTimeTouched(true);
                  }}
                />
                <FixedTimeInput
                  label="End (HH:MM)"
                  minutes={draftEndMin}
                  onChange={(m) => {
                    setDraftEndMin(m);
                    setDraftTimeTouched(true);
                  }}
                />
              </div>
            </div>

            {/* Remove all, Cancel & Save Action Buttons */}
            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#EFECE5] dark:border-[#2A302D]">
              <button
                type="button"
                onClick={handleRemoveAllFilters}
                disabled={!hasAnyDraftOrActiveFilter}
                className="text-[11.5px] font-medium text-[#A84438] dark:text-[#E59288] hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-default"
              >
                Remove all
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelFilters}
                  className="rounded-lg border border-[#E2DDD3] dark:border-[#313835] bg-[#FAF9F6] dark:bg-[#252B28] px-2.5 py-1.5 text-xs font-medium text-[#525D57] dark:text-[#B9C4BE] hover:bg-[#EFECE5] dark:hover:bg-[#2E3532] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#3D7A6E] dark:bg-[#5B9B8E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#32675C] dark:hover:bg-[#4D8B7E] transition-colors cursor-pointer shadow-2xs"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Active Filter / Grid Slot Indicators (Click to edit/remove inside Filter tab) */}
        {(hasLevelFilter || hasTimeFilter) && (
          <div className="flex flex-wrap items-center gap-1">
            {hasLevelFilter && (
              <button
                type="button"
                onClick={openFilters}
                title="Open filters to edit or remove"
                className="inline-flex items-center gap-1 rounded-full bg-[#EDF5F2] dark:bg-[#1E312C] border border-[#CBE0D9] dark:border-[#2E4A43] px-2.5 py-0.5 text-[11px] font-medium text-[#2B5E53] dark:text-[#8CC8BA] hover:bg-[#E0EFEA] dark:hover:bg-[#263E38] transition-colors cursor-pointer"
              >
                <span>
                  {minLevel !== null && maxLevel !== null
                    ? `${minLevel}–${maxLevel}`
                    : minLevel !== null
                      ? `≥ ${minLevel}`
                      : `≤ ${maxLevel}`}
                </span>
              </button>
            )}

            {timeSlotFilter && (
              <button
                type="button"
                onClick={openFilters}
                title="Open filters to edit or remove"
                className="inline-flex items-center gap-1 rounded-full bg-[#EDF5F2] dark:bg-[#1E312C] border border-[#CBE0D9] dark:border-[#2E4A43] px-2.5 py-0.5 text-[11px] font-medium text-[#2B5E53] dark:text-[#8CC8BA] hover:bg-[#E0EFEA] dark:hover:bg-[#263E38] transition-colors cursor-pointer"
              >
                <CalendarClock className="h-3 w-3 shrink-0" />
                <span>
                  {timeSlotFilter.days.length > 0
                    ? `${formatDaysCompact(timeSlotFilter.days)} · `
                    : ''}
                  {formatMinutesToTime(timeSlotFilter.startMin)}–
                  {formatMinutesToTime(timeSlotFilter.endMin)}
                </span>
              </button>
            )}

            {pairSuggestion && timeSlotFilter && (
              <button
                type="button"
                onClick={() =>
                  onTimeSlotFilterChange({
                    ...timeSlotFilter,
                    days: [...timeSlotFilter.days, pairSuggestion.pairDay],
                  })
                }
                className="inline-flex items-center rounded-full border border-dashed border-[#9EC3B9] dark:border-[#43685F] bg-white dark:bg-[#1F2422] px-2 py-0.5 text-[10.5px] font-medium text-[#3D7A6E] dark:text-[#86C4B6] hover:bg-[#EDF5F2] dark:hover:bg-[#233631] transition-colors cursor-pointer"
              >
                {pairSuggestion.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Body: Results OR Current Courses */}
      <div
        className="flex-1 overflow-y-auto"
        onMouseLeave={() => onPreviewChange(null)}
      >
        {isSearchingOrFiltering ? (
          <div>
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#F6F4EE]/80 dark:bg-[#1E2321]/70 border-b border-[#ECE8DF] dark:border-[#262C29]">
              <span className="text-[11.5px] font-medium text-[#626C66] dark:text-[#96A29C]">
                {filteredResults.length}{' '}
                {filteredResults.length === 1 ? 'course fits' : 'courses found'}
              </span>
              {query.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setExpandedCode(null);
                  }}
                  className="text-[11.5px] font-medium text-[#3D7A6E] dark:text-[#86C4B6] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>

            {visibleResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <BookOpen className="h-6 w-6 text-[#C5C0B5] dark:text-[#454D49] mb-2" />
                <p className="text-[13px] font-semibold text-[#3A433E] dark:text-[#D5DDD8]">
                  No courses match
                </p>
                <p className="text-[11.5px] text-[#79847E] dark:text-[#8C9892] mt-1 leading-relaxed">
                  Try widening your time window or level range.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFECE5] dark:divide-[#262C29]">
                {visibleResults.map(({ course, resolved, matchingSectionIds }) => {
                  const primaryCode = course.crossListedWith ?? course.code;
                  const selectedEntry =
                    entryByCode.get(course.code) ?? entryByCode.get(primaryCode);
                  const isExpanded = effectiveExpandedCode === course.code;

                  const orderedSections = timeSlotFilter
                    ? [
                        ...resolved.sections.filter((s) =>
                          matchingSectionIds.has(s.id)
                        ),
                        ...resolved.sections.filter(
                          (s) => !matchingSectionIds.has(s.id)
                        ),
                      ]
                    : resolved.sections;

                  return (
                    <div key={course.code} className="bg-[#FCFBF8] dark:bg-[#191D1B]">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedCode(isExpanded ? null : course.code);
                          setExpandedLecId(null);
                          onPreviewChange(null);
                        }}
                        className={`w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-[#EDF5F2]/65 dark:bg-[#1E2E2A]/60'
                            : 'hover:bg-[#F5F2EB] dark:hover:bg-[#202523]'
                        }`}
                      >
                        <div className="mt-0.5 text-[#8A948E]">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-[#3D7A6E] dark:text-[#72B0A2]" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12.5px] font-bold text-[#2E6257] dark:text-[#86C4B6]">
                              {course.code}
                            </span>
                            <span className="rounded-full bg-[#EFECE5] dark:bg-[#262C29] px-1.5 py-0.5 text-[10px] font-medium text-[#606A64] dark:text-[#9CA8A2]">
                              {course.credits} CH
                            </span>
                            {course.crossListedWith && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#EAF2F8] dark:bg-[#1D2D38] px-1.5 py-0.5 text-[10px] font-medium text-[#3C6985] dark:text-[#8EBCD7]">
                                <Link2 className="h-2.5 w-2.5" />
                                w/ {course.crossListedWith}
                              </span>
                            )}
                            {selectedEntry && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E6F4EE] dark:bg-[#1E362E] px-1.5 py-0.5 text-[10px] font-semibold text-[#2B6756] dark:text-[#86CBB6]">
                                <Check className="h-2.5 w-2.5" />
                                Added
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-medium text-[#1E2421] dark:text-[#EFF2EF] mt-0.5 leading-snug">
                            {course.title}
                          </p>
                        </div>

                        <span className="shrink-0 text-[11px] text-[#838D87] mt-0.5">
                          {timeSlotFilter
                            ? `${matchingSectionIds.size}`
                            : `${resolved.sections.length}`}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-1.5 space-y-1.5 bg-[#F6F4EE]/70 dark:bg-[#151817]/70 border-t border-[#ECE8DF] dark:border-[#242A27]">
                          {orderedSections.map((section) => {
                            const matchesSlot = matchingSectionIds.has(section.id);
                            const isThisSectionSelected =
                              selectedEntry?.sectionId === section.id;
                            const hasLinkedChoices =
                              (section.linkedOptions?.length ?? 0) > 0;
                            const isLecExpanded =
                              expandedLecId === section.id ||
                              (isThisSectionSelected && hasLinkedChoices);

                            const sectionMeetings = [
                              ...section.meetings,
                              ...(section.pairedComponent?.meetings ?? []),
                            ];
                            const conflicts = findConflictsForMeetings(
                              sectionMeetings,
                              existingBlocks,
                              selectedEntry?.courseCode
                            );

                            return (
                              <div
                                key={section.id}
                                className={`rounded-xl border transition-all duration-150 ${
                                  !matchesSlot && timeSlotFilter ? 'opacity-55' : ''
                                } ${
                                  isThisSectionSelected
                                    ? 'border-[#3D7A6E] dark:border-[#6BA89B] bg-[#EDF5F2]/80 dark:bg-[#1E312C]/80'
                                    : conflicts.length > 0
                                      ? 'border-[#EBCAC3] dark:border-[#5C3933] bg-white dark:bg-[#1E2220]'
                                      : 'border-[#E5E1D8] dark:border-[#2B312E] bg-white dark:bg-[#1E2220] hover:border-[#9EC3B9] dark:hover:border-[#497067]'
                                }`}
                              >
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onMouseEnter={() =>
                                    onPreviewChange({ course: resolved, section })
                                  }
                                  onClick={() => {
                                    if (hasLinkedChoices) {
                                      setExpandedLecId(
                                        isLecExpanded ? null : section.id
                                      );
                                    } else {
                                      if (isThisSectionSelected && selectedEntry) {
                                        onRemoveCourse(selectedEntry.courseCode);
                                      } else {
                                        onSelectSection(
                                          course.code,
                                          primaryCode,
                                          section.id
                                        );
                                      }
                                      onPreviewChange(null);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.currentTarget.click();
                                    }
                                  }}
                                  className="p-2.5 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span className="text-[12px] font-bold text-[#1E2421] dark:text-[#F0F3F0]">
                                        {section.name}
                                      </span>
                                      {section.pairedComponent && (
                                        <span className="rounded-full bg-[#EDF5F2] dark:bg-[#223731] px-1.5 py-0.5 text-[10px] font-semibold text-[#2E6257] dark:text-[#86C4B6]">
                                          + {section.pairedComponent.name}
                                        </span>
                                      )}
                                      {hasLinkedChoices && (
                                        <span className="rounded-full bg-[#F7F0E2] dark:bg-[#31291D] px-1.5 py-0.5 text-[10px] font-medium text-[#7C5A25] dark:text-[#D9B06C]">
                                          +{section.linkedOptions!.length}{' '}
                                          {section.linkedOptions![0].type}
                                        </span>
                                      )}
                                    </div>

                                    {isThisSectionSelected ? (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#3D7A6E] dark:bg-[#5B9B8E] px-2 py-0.5 text-[10px] font-semibold text-white">
                                        <Check className="h-2.5 w-2.5" />
                                        Added
                                      </span>
                                    ) : hasLinkedChoices ? (
                                      <span className="text-[11px] font-semibold text-[#3D7A6E] dark:text-[#86C4B6]">
                                        {isLecExpanded ? 'Hide' : 'Pick'}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-[#3D7A6E] dark:text-[#86C4B6]">
                                        + Add
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 space-y-0.5">
                                    {section.meetings.map((m, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-1 text-[11.5px] text-[#4A544F] dark:text-[#C5CFC9]"
                                      >
                                        <Clock className="h-3 w-3 shrink-0 text-[#8A948E]" />
                                        <span className="font-semibold text-[#2B332F] dark:text-[#E6ECE8]">
                                          {formatDaysReadable(m.days)}
                                        </span>
                                        <span className="text-[#9AA39E]">·</span>
                                        <span>
                                          {formatTimeDisplay(m.startTime)}–
                                          {formatTimeDisplay(m.endTime)}
                                        </span>
                                      </div>
                                    ))}

                                    {section.pairedComponent &&
                                      section.pairedComponent.meetings.map(
                                        (m, idx) => (
                                          <div
                                            key={`paired-${idx}`}
                                            className="flex items-center gap-1 text-[11.5px] text-[#2E6257] dark:text-[#86C4B6]"
                                          >
                                            <Clock className="h-3 w-3 shrink-0 opacity-75" />
                                            <span className="font-semibold">
                                              {section.pairedComponent!.name}:{' '}
                                              {formatDaysCompact(m.days)}
                                            </span>
                                            <span>
                                              {formatTimeDisplay(m.startTime)}–
                                              {formatTimeDisplay(m.endTime)}
                                            </span>
                                          </div>
                                        )
                                      )}

                                    {section.meetings[0]?.instructors.length > 0 && (
                                      <div className="flex items-start gap-1 text-[11px] text-[#717C76] dark:text-[#929E98]">
                                        <User className="h-3 w-3 shrink-0 mt-0.5 text-[#9AA39E]" />
                                        <span className="leading-snug">
                                          {section.meetings[0].instructors.join(', ')}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {conflicts.length > 0 && (
                                    <div className="mt-1.5 flex items-start gap-1 rounded-lg bg-[#FCEEEB] dark:bg-[#382320] px-2 py-1 text-[11px] font-medium text-[#A84438] dark:text-[#E59288]">
                                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                      <span>
                                        Clashes w/{' '}
                                        {conflicts
                                          .map((c) => c.withCourseCode)
                                          .join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {hasLinkedChoices && isLecExpanded && (
                                  <div className="border-t border-[#EFECE5] dark:border-[#282E2B] px-2 pb-2 pt-1.5 bg-[#FAF8F4] dark:bg-[#191D1B] rounded-b-xl space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <p className="text-[10.5px] font-semibold text-[#505A55] dark:text-[#B4BEB8]">
                                        Pick 1 {section.linkedOptions![0].type}:
                                      </p>
                                      {isThisSectionSelected && selectedEntry && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveCourse(selectedEntry.courseCode);
                                          }}
                                          className="text-[10.5px] font-medium text-[#A84438] dark:text-[#E59288] hover:underline cursor-pointer"
                                        >
                                          Remove
                                        </button>
                                      )}
                                    </div>

                                    {section.linkedOptions!.map((opt) => {
                                      const isOptSelected =
                                        isThisSectionSelected &&
                                        selectedEntry?.linkedOptionId === opt.id;
                                      const optConflicts = findConflictsForMeetings(
                                        opt.meetings,
                                        existingBlocks,
                                        selectedEntry?.courseCode
                                      );

                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onMouseEnter={() =>
                                            onPreviewChange({
                                              course: resolved,
                                              section,
                                              linkedOption: opt,
                                            })
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectSection(
                                              course.code,
                                              primaryCode,
                                              section.id,
                                              opt.id
                                            );
                                            onPreviewChange(null);
                                          }}
                                          className={`w-full text-left rounded-lg border px-2 py-1.5 transition-all cursor-pointer ${
                                            isOptSelected
                                              ? 'border-[#3D7A6E] dark:border-[#6BA89B] bg-[#E9F3EF] dark:bg-[#213530]'
                                              : optConflicts.length > 0
                                                ? 'border-[#EBCAC3] dark:border-[#5C3933] bg-white dark:bg-[#202422]'
                                                : 'border-[#E5E1D8] dark:border-[#2B312E] bg-white dark:bg-[#202422] hover:border-[#9EC3B9]'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-[11px] font-bold text-[#1E2421] dark:text-[#EFF2EF]">
                                              {opt.name}
                                            </span>
                                            {isOptSelected ? (
                                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#2E6257] dark:text-[#86C4B6]">
                                                <Check className="h-3 w-3" />
                                                Picked
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-semibold text-[#3D7A6E] dark:text-[#86C4B6]">
                                                + Add
                                              </span>
                                            )}
                                          </div>
                                          {opt.meetings.map((m, idx) => (
                                            <div
                                              key={idx}
                                              className="mt-0.5 text-[11px] text-[#55605A] dark:text-[#A9B4AE]"
                                            >
                                              <strong className="font-semibold text-[#2B332F] dark:text-[#DDE4E0]">
                                                {formatDaysReadable(m.days)}
                                              </strong>{' '}
                                              · {formatTimeDisplay(m.startTime)}–
                                              {formatTimeDisplay(m.endTime)}
                                            </div>
                                          ))}
                                          {optConflicts.length > 0 && (
                                            <p className="mt-1 text-[10px] font-medium text-[#A84438] dark:text-[#E59288] flex items-center gap-1">
                                              <AlertCircle className="h-3 w-3 shrink-0" />
                                              Clashes w/{' '}
                                              {optConflicts
                                                .map((c) => c.withCourseCode)
                                                .join(', ')}
                                            </p>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredResults.length > visibleResults.length && (
                  <div className="px-3 py-2.5 text-center text-[11.5px] text-[#838D87]">
                    Showing {visibleResults.length} of {filteredResults.length}. Type to narrow down.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Default Calm State: Current Courses */
          <div className="p-3 space-y-2">
            {entries.length === 0 ? (
              <div className="rounded-xl border border-[#EAE6DD] dark:border-[#282E2B] bg-white/80 dark:bg-[#1E2321]/80 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDF5F2] dark:bg-[#1E312C] text-[#3D7A6E] dark:text-[#86C4B6]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#1E2421] dark:text-[#EFF2EF]">
                      Plan your semester
                    </h3>
                    <p className="text-[11px] text-[#737E78] dark:text-[#8E9A94]">
                      {courses.length} courses ready
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-[12px] text-[#525D57] dark:text-[#A8B4AE] leading-snug">
                  <li className="flex items-start gap-2">
                    <Search className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#3D7A6E] dark:text-[#72B0A2]" />
                    <span>
                      Search <strong className="font-semibold text-[#1E2421] dark:text-[#EFF2EF]">CS 100</strong> or{' '}
                      <strong className="font-semibold text-[#1E2421] dark:text-[#EFF2EF]">ECON 121</strong> above.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#3D7A6E] dark:text-[#72B0A2]" />
                    <span>
                      Filter by <strong className="font-semibold text-[#1E2421] dark:text-[#EFF2EF]">level</strong> or{' '}
                      <strong className="font-semibold text-[#1E2421] dark:text-[#EFF2EF]">day &amp; time</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MousePointerClick className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#3D7A6E] dark:text-[#72B0A2]" />
                    <span>
                      <strong className="font-semibold text-[#1E2421] dark:text-[#EFF2EF]">Drag</strong> on any grid slot to see courses that fit.
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A847E] dark:text-[#8A9690]">
                    Your Courses ({entries.length})
                  </h3>
                  <button
                    type="button"
                    onClick={onClearTimetable}
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#A84438] dark:text-[#E59288] hover:underline cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                </div>

                {entries.map((entry) => {
                  const rawCourse =
                    courseMap.get(entry.courseCode) ??
                    courseMap.get(entry.primaryCode);
                  if (!rawCourse) return null;
                  const resolved = resolveCourse(rawCourse, courseMap);
                  const section = resolved.sections.find(
                    (s) => s.id === entry.sectionId
                  );
                  const linked = entry.linkedOptionId
                    ? section?.linkedOptions?.find(
                        (l) => l.id === entry.linkedOptionId
                      )
                    : undefined;
                  const palette =
                    COURSE_PALETTE[entry.colorIndex % COURSE_PALETTE.length];

                  return (
                    <div
                      key={entry.courseCode}
                      className="rounded-xl border border-[#E6E2D9] dark:border-[#2B312E] bg-white dark:bg-[#1E2321] p-2.5 transition-all hover:border-[#CFCAC0] dark:hover:border-[#3A433F]"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${palette.dot}`}
                          />
                          <span className="text-[12.5px] font-bold text-[#2E6257] dark:text-[#86C4B6]">
                            {entry.courseCode}
                          </span>
                          <span className="rounded-full bg-[#F2EFE8] dark:bg-[#272D2A] px-1.5 py-0.5 text-[10px] font-medium text-[#646E68] dark:text-[#9CA8A2]">
                            {rawCourse.credits} CH
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setQuery(entry.courseCode);
                              setExpandedCode(entry.courseCode);
                            }}
                            className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[#3D7A6E] dark:text-[#86C4B6] hover:bg-[#EDF5F2] dark:hover:bg-[#1E312C] transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveCourse(entry.courseCode)}
                            title="Remove course"
                            className="rounded-md p-0.5 text-[#8A948E] hover:bg-[#FCEEEB] hover:text-[#A84438] dark:hover:bg-[#382320] dark:hover:text-[#E59288] transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[12.5px] font-medium text-[#1E2421] dark:text-[#EFF2EF] mt-0.5 leading-snug">
                        {rawCourse.title}
                      </p>

                      {section && (
                        <div className="mt-1.5 space-y-0.5 border-t border-[#F0EDE6] dark:border-[#282E2B] pt-1.5 text-[11px] text-[#646E68] dark:text-[#9CA8A2]">
                          <div>
                            <strong className="font-semibold text-[#2E3632] dark:text-[#DDE4E0]">
                              {section.name}
                            </strong>{' '}
                            ·{' '}
                            {section.meetings
                              .map(
                                (m) =>
                                  `${formatDaysCompact(m.days)} ${formatTimeDisplay(m.startTime)}–${formatTimeDisplay(m.endTime)}`
                              )
                              .join(', ')}
                          </div>
                          {section.pairedComponent && (
                            <div>
                              <strong className="font-semibold text-[#2E3632] dark:text-[#DDE4E0]">
                                {section.pairedComponent.name}
                              </strong>{' '}
                              ·{' '}
                              {section.pairedComponent.meetings
                                .map(
                                  (m) =>
                                    `${formatDaysCompact(m.days)} ${formatTimeDisplay(m.startTime)}–${formatTimeDisplay(m.endTime)}`
                                )
                                .join(', ')}
                            </div>
                          )}
                          {linked && (
                            <div>
                              <strong className="font-semibold text-[#2E3632] dark:text-[#DDE4E0]">
                                {linked.name}
                              </strong>{' '}
                              ·{' '}
                              {linked.meetings
                                .map(
                                  (m) =>
                                    `${formatDaysCompact(m.days)} ${formatTimeDisplay(m.startTime)}–${formatTimeDisplay(m.endTime)}`
                                )
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
