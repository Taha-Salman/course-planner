import { useCallback, useEffect, useState } from 'react';
import type { SelectedCourseEntry, Timetable } from '../types/course';
import { pickNextColorIndex } from '../lib/scheduleUtils';

const STORAGE_KEY = 'course-planner:timetables:v1';
const ACTIVE_ID_KEY = 'course-planner:active-timetable:v1';
const THEME_KEY = 'course-planner:theme:v1';

function createDefaultTimetable(name = '1'): Timetable {
  const now = Date.now();
  return {
    id: `tt-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: now,
    updatedAt: now,
    entries: [],
  };
}

function renumberTimetables(list: Timetable[]): Timetable[] {
  return list.map((tt, idx) => ({
    ...tt,
    name: String(idx + 1),
  }));
}

function loadTimetables(): Timetable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createDefaultTimetable('1')];
    const parsed = JSON.parse(raw) as Timetable[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return renumberTimetables(parsed);
    }
  } catch {
    // ignore corrupted storage
  }
  return [createDefaultTimetable('1')];
}

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [dark]);

  const toggleTheme = useCallback(() => setDark((d) => !d), []);
  return { dark, toggleTheme };
}

export function useTimetables() {
  const [timetables, setTimetables] = useState<Timetable[]>(loadTimetables);
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ID_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return '';
  });

  const activeTimetable =
    timetables.find((t) => t.id === activeId) ?? timetables[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timetables));
    } catch {
      // ignore quota errors
    }
  }, [timetables]);

  useEffect(() => {
    if (activeTimetable) {
      try {
        localStorage.setItem(ACTIVE_ID_KEY, activeTimetable.id);
      } catch {
        // ignore
      }
    }
  }, [activeTimetable]);

  const createTimetable = useCallback(() => {
    setTimetables((prev) => {
      const created = createDefaultTimetable(String(prev.length + 1));
      setActiveId(created.id);
      return renumberTimetables([...prev, created]);
    });
  }, []);

  const duplicateTimetable = useCallback((id: string) => {
    setTimetables((prev) => {
      const source = prev.find((t) => t.id === id);
      if (!source) return prev;
      const now = Date.now();
      const copy: Timetable = {
        id: `tt-${now}-${Math.random().toString(36).slice(2, 7)}`,
        name: String(prev.length + 1),
        createdAt: now,
        updatedAt: now,
        entries: source.entries.map((e) => ({ ...e })),
      };
      setActiveId(copy.id);
      return renumberTimetables([...prev, copy]);
    });
  }, []);

  const deleteTimetable = useCallback(
    (id: string) => {
      setTimetables((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = renumberTimetables(prev.filter((t) => t.id !== id));
        if (id === activeId || !next.some((t) => t.id === activeId)) {
          const fallback = next[Math.max(0, idx - 1)] ?? next[0];
          setActiveId(fallback.id);
        }
        return next;
      });
    },
    [activeId]
  );

  const upsertCourseEntry = useCallback(
    (
      courseCode: string,
      primaryCode: string,
      sectionId: string,
      linkedOptionId?: string
    ) => {
      if (!activeTimetable) return;
      setTimetables((prev) =>
        prev.map((t) => {
          if (t.id !== activeTimetable.id) return t;
          const existingIdx = t.entries.findIndex(
            (e) => e.courseCode === courseCode || e.primaryCode === primaryCode
          );
          if (existingIdx >= 0) {
            const nextEntries = [...t.entries];
            nextEntries[existingIdx] = {
              ...nextEntries[existingIdx],
              courseCode,
              primaryCode,
              sectionId,
              linkedOptionId,
            };
            return { ...t, entries: nextEntries, updatedAt: Date.now() };
          }
          const newEntry: SelectedCourseEntry = {
            courseCode,
            primaryCode,
            sectionId,
            linkedOptionId,
            colorIndex: pickNextColorIndex(t.entries),
          };
          return {
            ...t,
            entries: [...t.entries, newEntry],
            updatedAt: Date.now(),
          };
        })
      );
    },
    [activeTimetable]
  );

  const removeCourseEntry = useCallback(
    (courseCode: string) => {
      if (!activeTimetable) return;
      setTimetables((prev) =>
        prev.map((t) => {
          if (t.id !== activeTimetable.id) return t;
          return {
            ...t,
            entries: t.entries.filter((e) => e.courseCode !== courseCode),
            updatedAt: Date.now(),
          };
        })
      );
    },
    [activeTimetable]
  );

  const clearActiveTimetable = useCallback(() => {
    if (!activeTimetable) return;
    setTimetables((prev) =>
      prev.map((t) =>
        t.id === activeTimetable.id
          ? { ...t, entries: [], updatedAt: Date.now() }
          : t
      )
    );
  }, [activeTimetable]);

  return {
    timetables,
    activeTimetable,
    setActiveId,
    createTimetable,
    duplicateTimetable,
    deleteTimetable,
    upsertCourseEntry,
    removeCourseEntry,
    clearActiveTimetable,
  };
}
