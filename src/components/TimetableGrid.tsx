import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { DayCode, GridBlock } from '../types/course';
import {
  COURSE_PALETTE,
  DAY_NAMES,
  DAY_ORDER,
  formatDurationShort,
  formatMinutesToTime,
  formatTimeDisplay,
  type TimeSlotFilter,
} from '../lib/scheduleUtils';

interface TimetableGridProps {
  blocks: GridBlock[];
  previewBlocks: GridBlock[];
  selectedSlot: TimeSlotFilter | null;
  showGaps: boolean;
  showWeekends: boolean;
  onSelectSlot: (slot: TimeSlotFilter | null) => void;
  onFocusCourse: (courseCode: string) => void;
  onRemoveCourse: (courseCode: string) => void;
}

interface PositionedBlock {
  block: GridBlock;
  col: number;
  totalCols: number;
}

interface DragState {
  day: DayCode;
  anchorMin: number;
  currentMin: number;
}

const SNAP_MINUTES = 15;
const GRID_PAD_TOP = 16; // breathing room between header bar and 8 AM line
const GRID_PAD_BOTTOM = 12;
const BLOCK_MIN_HEIGHT_PX = 54;

interface VisualGap {
  key: string;
  topPx: number;
  heightPx: number;
  durationMin: number;
}

function layoutDayBlocks(dayBlocks: GridBlock[]): PositionedBlock[] {
  if (dayBlocks.length === 0) return [];

  const sorted = [...dayBlocks].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return b.endMin - a.endMin;
  });

  const clusters: GridBlock[][] = [];
  let currentCluster: GridBlock[] = [];
  let clusterEnd = -1;

  for (const block of sorted) {
    if (currentCluster.length === 0 || block.startMin < clusterEnd) {
      currentCluster.push(block);
      clusterEnd = Math.max(clusterEnd, block.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [block];
      clusterEnd = block.endMin;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const result: PositionedBlock[] = [];

  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const assigned: Array<{ block: GridBlock; col: number }> = [];

    for (const block of cluster) {
      let placedCol = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= block.startMin) {
          placedCol = c;
          colEnds[c] = block.endMin;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEnds.length;
        colEnds.push(block.endMin);
      }
      assigned.push({ block, col: placedCol });
    }

    const totalCols = Math.max(1, colEnds.length);
    for (const item of assigned) {
      result.push({
        block: item.block,
        col: item.col,
        totalCols,
      });
    }
  }

  return result;
}

function formatHourLabel(hour24: number): string {
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12} ${meridiem}`;
}

function formatInstructorShort(instructors: string[]): string {
  if (instructors.length === 0) return 'TBA';
  if (instructors.length === 1) return instructors[0];
  return `${instructors[0]} +${instructors.length - 1}`;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  blocks,
  previewBlocks,
  selectedSlot,
  showGaps,
  showWeekends,
  onSelectSlot,
  onFocusCourse,
  onRemoveCourse,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragColumnRef = useRef<HTMLDivElement | null>(null);
  const gridBodyRef = useRef<HTMLDivElement | null>(null);
  const [gridHeightPx, setGridHeightPx] = useState<number>(0);

  useEffect(() => {
    const el = gridBodyRef.current;
    if (!el) return;
    const update = () => {
      const innerH = el.clientHeight - GRID_PAD_TOP - GRID_PAD_BOTTOM;
      setGridHeightPx(Math.max(0, innerH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allBlocks = useMemo(
    () => [...blocks, ...previewBlocks],
    [blocks, previewBlocks]
  );

  const hasWeekendItems = useMemo(() => {
    const blockHasWeekend = allBlocks.some((b) => b.day === 'S' || b.day === 'U');
    const slotHasWeekend =
      selectedSlot?.days.some((d) => d === 'S' || d === 'U') ?? false;
    return blockHasWeekend || slotHasWeekend;
  }, [allBlocks, selectedSlot]);

  const visibleDays: DayCode[] = useMemo(() => {
    if (showWeekends || hasWeekendItems) {
      return DAY_ORDER;
    }
    return ['M', 'T', 'W', 'R', 'F'];
  }, [showWeekends, hasWeekendItems]);

  // Align to clean 2-hour boundaries (8 AM – 8 PM by default)
  const { startHour, endHour } = useMemo(() => {
    let minHour = 8;
    let maxHour = 20;
    for (const b of allBlocks) {
      minHour = Math.min(minHour, Math.floor(b.startMin / 120) * 2);
      maxHour = Math.max(maxHour, Math.ceil(b.endMin / 120) * 2);
    }
    if (selectedSlot) {
      minHour = Math.min(minHour, Math.floor(selectedSlot.startMin / 120) * 2);
      maxHour = Math.max(maxHour, Math.ceil(selectedSlot.endMin / 120) * 2);
    }
    return { startHour: minHour, endHour: maxHour };
  }, [allBlocks, selectedSlot]);

  const totalHours = endHour - startHour;
  const totalMinutes = totalHours * 60;

  const majorHours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h <= endHour; h += 2) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  const blocksByDay = useMemo(() => {
    const map = new Map<DayCode, PositionedBlock[]>();
    for (const day of visibleDays) {
      const dayItems = allBlocks.filter((b) => b.day === day);
      map.set(day, layoutDayBlocks(dayItems));
    }
    return map;
  }, [allBlocks, visibleDays]);

  // Compute exact pixel-level gaps between rendered course cards so labels sit dead-center
  // between actual card borders (accounting for BLOCK_MIN_HEIGHT_PX) with zero overlap.
  const gapsByDay = useMemo(() => {
    const map = new Map<DayCode, VisualGap[]>();
    if (!showGaps || gridHeightPx <= 0) return map;

    const startOffsetMin = startHour * 60;
    const minToPx = (m: number) => ((m - startOffsetMin) / totalMinutes) * gridHeightPx;

    for (const day of visibleDays) {
      const dayRealBlocks = blocks
        .filter((b) => b.day === day && !b.isPreview)
        .sort((a, b) => a.startMin - b.startMin);

      if (dayRealBlocks.length < 2) {
        map.set(day, []);
        continue;
      }

      // Merge overlapping time spans while tracking actual visual top & bottom pixels
      const spans: Array<{
        startMin: number;
        endMin: number;
        visualTop: number;
        visualBottom: number;
      }> = [];

      for (const b of dayRealBlocks) {
        const durMin = Math.max(40, b.endMin - b.startMin);
        const topPx = minToPx(b.startMin) + 1;
        const rawHeightPx = (durMin / totalMinutes) * gridHeightPx - 2;
        const heightPx = Math.max(BLOCK_MIN_HEIGHT_PX, rawHeightPx);
        const bottomPx = topPx + heightPx;

        const last = spans[spans.length - 1];
        if (!last || b.startMin > last.endMin) {
          spans.push({
            startMin: b.startMin,
            endMin: b.endMin,
            visualTop: topPx,
            visualBottom: bottomPx,
          });
        } else {
          last.endMin = Math.max(last.endMin, b.endMin);
          last.visualTop = Math.min(last.visualTop, topPx);
          last.visualBottom = Math.max(last.visualBottom, bottomPx);
        }
      }

      const visualGaps: VisualGap[] = [];
      for (let i = 0; i < spans.length - 1; i++) {
        const durationMin = spans[i + 1].startMin - spans[i].endMin;
        const gapTop = spans[i].visualBottom;
        const gapBottom = spans[i + 1].visualTop;
        const gapHeight = gapBottom - gapTop;

        if (durationMin > 0 && gapHeight >= 12) {
          visualGaps.push({
            key: `gap-${day}-${spans[i].endMin}`,
            topPx: gapTop,
            heightPx: gapHeight,
            durationMin,
          });
        }
      }

      map.set(day, visualGaps);
    }

    return map;
  }, [showGaps, blocks, visibleDays, gridHeightPx, startHour, totalMinutes]);

  const toPct = useCallback(
    (minutesFromStart: number) => (minutesFromStart / totalMinutes) * 100,
    [totalMinutes]
  );

  const clientYToMinutes = useCallback(
    (clientY: number, rect: DOMRect): number => {
      const usableHeight = rect.height - GRID_PAD_TOP - GRID_PAD_BOTTOM;
      if (usableHeight <= 0) return startHour * 60;
      const ratio = Math.max(
        0,
        Math.min(1, (clientY - rect.top - GRID_PAD_TOP) / usableHeight)
      );
      const rawMinutes = startHour * 60 + ratio * totalMinutes;
      const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
      return Math.max(startHour * 60, Math.min(endHour * 60, snapped));
    },
    [startHour, endHour, totalMinutes]
  );

  const handleColumnPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    day: DayCode
  ) => {
    if ((e.target as HTMLElement).closest('[data-block="true"]')) return;
    if (e.button !== 0) return;

    const colEl = e.currentTarget;
    dragColumnRef.current = colEl;
    colEl.setPointerCapture(e.pointerId);

    const mins = clientYToMinutes(e.clientY, colEl.getBoundingClientRect());
    setDragState({
      day,
      anchorMin: mins,
      currentMin: Math.min(endHour * 60, mins + 60),
    });
  };

  const handleColumnPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || !dragColumnRef.current) return;
    const mins = clientYToMinutes(
      e.clientY,
      dragColumnRef.current.getBoundingClientRect()
    );
    setDragState((prev) => (prev ? { ...prev, currentMin: mins } : null));
  };

  const handleColumnPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const startMin = Math.min(dragState.anchorMin, dragState.currentMin);
    let endMin = Math.max(dragState.anchorMin, dragState.currentMin);

    if (endMin - startMin < 30) {
      endMin = Math.min(endHour * 60, startMin + 120);
    }

    onSelectSlot({
      days: [dragState.day],
      startMin,
      endMin,
      source: 'grid',
    });
    setDragState(null);
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-x-auto overflow-y-auto lg:overflow-y-hidden bg-[#F6F4EF] dark:bg-[#141716] p-1.5 sm:p-2">
      <div className="flex flex-col flex-1 min-h-[540px] lg:min-h-0 min-w-[540px] sm:min-w-[640px] rounded-2xl border border-[#E6E2D9] dark:border-[#282E2B] bg-white dark:bg-[#1B1F1D] shadow-xs overflow-hidden">
        {/* Day Headers */}
        <div
          className="grid shrink-0 border-b border-[#EAE6DD] dark:border-[#282E2B] bg-[#FAF9F6] dark:bg-[#1F2422]"
          style={{
            gridTemplateColumns: `50px repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="px-1 py-2 text-center text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-wider text-[#909A94] dark:text-[#6E7A74] border-r border-[#EAE6DD] dark:border-[#282E2B]">
            Time
          </div>
          {visibleDays.map((day) => {
            const count = blocks.filter((b) => b.day === day).length;
            const isDayHighlighted =
              dragState?.day === day ||
              (selectedSlot?.days.includes(day) ?? false);
            return (
              <div
                key={day}
                className={`px-1.5 sm:px-3 py-2 text-center border-r last:border-r-0 border-[#EAE6DD] dark:border-[#282E2B] transition-colors ${
                  isDayHighlighted
                    ? 'bg-[#EDF5F2]/80 dark:bg-[#1E312C]/70'
                    : ''
                }`}
              >
                <span
                  className={`text-[12px] sm:text-[13px] font-semibold ${
                    isDayHighlighted
                      ? 'text-[#2B5E53] dark:text-[#86C4B6]'
                      : 'text-[#262E2A] dark:text-[#E5EBE7]'
                  }`}
                >
                  <span className="sm:hidden">{DAY_NAMES[day].short}</span>
                  <span className="hidden sm:inline">{DAY_NAMES[day].full}</span>
                </span>
                {count > 0 && (
                  <span className="ml-1 sm:ml-1.5 rounded-full bg-[#EFECE5] dark:bg-[#2B312E] px-1.5 py-0.5 text-[10px] sm:text-[10.5px] font-medium text-[#646E68] dark:text-[#9BA6A0]">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Full-Height 2-Hour Interval Grid with Top Breathing Room */}
        <div
          ref={gridBodyRef}
          className="grid flex-1 min-h-0 relative select-none"
          style={{
            gridTemplateColumns: `50px repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Time Axis (2-hour labels) */}
          <div
            className="relative h-full border-r border-[#EAE6DD] dark:border-[#282E2B] bg-[#FCFBF8] dark:bg-[#191D1B]"
            style={{
              paddingTop: `${GRID_PAD_TOP}px`,
              paddingBottom: `${GRID_PAD_BOTTOM}px`,
            }}
          >
            <div className="relative h-full">
              {majorHours.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 pr-2 text-right text-[11px] font-semibold text-[#848E88] dark:text-[#7F8B85] -translate-y-1/2"
                  style={{
                    top: `${((hour - startHour) / totalHours) * 100}%`,
                  }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>
          </div>

          {/* Day Columns */}
          {visibleDays.map((day) => {
            const positioned = blocksByDay.get(day) ?? [];
            const dayGaps = gapsByDay.get(day) ?? [];

            const showLiveDrag = dragState?.day === day;
            const liveStart = showLiveDrag
              ? Math.min(dragState.anchorMin, dragState.currentMin)
              : 0;
            const liveEnd = showLiveDrag
              ? Math.max(dragState.anchorMin, dragState.currentMin)
              : 0;

            const showCommittedSlot =
              !dragState &&
              selectedSlot !== null &&
              (selectedSlot.days.length === 0 ||
                selectedSlot.days.includes(day));

            return (
              <div
                key={day}
                onPointerDown={(e) => handleColumnPointerDown(e, day)}
                onPointerMove={handleColumnPointerMove}
                onPointerUp={handleColumnPointerUp}
                style={{
                  paddingTop: `${GRID_PAD_TOP}px`,
                  paddingBottom: `${GRID_PAD_BOTTOM}px`,
                }}
                className="relative h-full border-r last:border-r-0 border-[#EAE6DD] dark:border-[#282E2B] cursor-crosshair touch-pan-x hover:bg-[#FAF9F6]/50 dark:hover:bg-[#1F2422]/35 transition-colors"
              >
                <div className="relative h-full">
                  {/* 2-hour solid lines + 1-hour subtle midpoint lines */}
                  {majorHours.map((hour, idx) => (
                    <React.Fragment key={hour}>
                      <div
                        className="absolute left-0 right-0 border-t border-[#ECE8DF] dark:border-[#262D2A] pointer-events-none"
                        style={{
                          top: `${((hour - startHour) / totalHours) * 100}%`,
                        }}
                      />
                      {idx < majorHours.length - 1 && (
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-[#F4F1EB] dark:border-[#202623] pointer-events-none"
                          style={{
                            top: `${((hour + 1 - startHour) / totalHours) * 100}%`,
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}

                  {/* Live Drag Selection Box */}
                  {showLiveDrag && liveEnd > liveStart && (
                    <div
                      style={{
                        top: `${toPct(liveStart - startHour * 60)}%`,
                        height: `${toPct(liveEnd - liveStart)}%`,
                      }}
                      className="absolute inset-x-1.5 z-15 rounded-xl border-2 border-[#3D7A6E] dark:border-[#72B0A2] bg-[#3D7A6E]/15 dark:bg-[#72B0A2]/20 pointer-events-none flex items-start justify-center p-1.5"
                    >
                      <span className="rounded-full bg-[#3D7A6E] dark:bg-[#5B9B8E] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs whitespace-nowrap">
                        {formatMinutesToTime(liveStart)} –{' '}
                        {formatMinutesToTime(liveEnd)}
                      </span>
                    </div>
                  )}

                  {/* Committed Selected Slot Highlight WITH Inline Close (X) Button */}
                  {showCommittedSlot && selectedSlot && (
                    <div
                      style={{
                        top: `${toPct(selectedSlot.startMin - startHour * 60)}%`,
                        height: `${toPct(selectedSlot.endMin - selectedSlot.startMin)}%`,
                      }}
                      className="absolute inset-x-1.5 z-15 rounded-xl border-2 border-dashed border-[#3D7A6E]/70 dark:border-[#72B0A2]/65 bg-[#3D7A6E]/10 dark:bg-[#72B0A2]/14 pointer-events-none flex items-start justify-between gap-1 p-1.5"
                    >
                      <span className="rounded-full bg-[#EDF5F2]/95 dark:bg-[#1E312C]/95 border border-[#CBE0D9] dark:border-[#2E4A43] px-2 py-0.5 text-[11px] font-semibold text-[#2B5E53] dark:text-[#8CC8BA] truncate">
                        {formatMinutesToTime(selectedSlot.startMin)} –{' '}
                        {formatMinutesToTime(selectedSlot.endMin)}
                      </span>

                      <button
                        type="button"
                        data-block="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSlot(null);
                        }}
                        title="Clear selected slot"
                        className="pointer-events-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EDF5F2] dark:bg-[#233631] border border-[#CBE0D9] dark:border-[#395B52] text-[#2B5E53] dark:text-[#9FD3C7] hover:bg-[#3D7A6E] hover:text-white dark:hover:bg-[#5B9B8E] dark:hover:text-[#141716] transition-colors cursor-pointer shadow-2xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Free-Time Gaps Dead-Centered Between Actual Card Borders (Zero Overlap) */}
                  {showGaps &&
                    dayGaps.map((gap) => {
                      const label = formatDurationShort(gap.durationMin);
                      const hasRoomForPill = gap.heightPx >= 28;
                      const hasRoomForLine = gap.heightPx >= 46;

                      return (
                        <div
                          key={gap.key}
                          style={{
                            top: `${gap.topPx}px`,
                            height: `${gap.heightPx}px`,
                          }}
                          className="absolute inset-x-2 z-5 pointer-events-none flex items-center justify-center overflow-hidden"
                        >
                          {hasRoomForLine && (
                            <div className="absolute inset-y-2.5 left-1/2 -translate-x-1/2 border-l border-dashed border-[#C9C4BA]/45 dark:border-[#363E3A]/55" />
                          )}
                          {hasRoomForPill ? (
                            <span className="relative rounded-full px-2 py-0.5 text-[10px] font-medium leading-none whitespace-nowrap bg-[#F7F5F0]/90 dark:bg-[#191D1B]/90 border border-[#E6E2D9] dark:border-[#2A302D] text-[#848E88] dark:text-[#76827C]">
                              {label} free
                            </span>
                          ) : (
                            <span className="relative text-[9.5px] font-medium leading-none whitespace-nowrap text-[#848E88] dark:text-[#78847E]">
                              {label} free
                            </span>
                          )}
                        </div>
                      );
                    })}

                  {/* Course Blocks (guaranteed minHeight so all details always fit cleanly) */}
                  {positioned.map(({ block, col, totalCols }) => {
                    const topPct = toPct(block.startMin - startHour * 60);
                    const durationMin = Math.max(40, block.endMin - block.startMin);
                    const heightPct = toPct(durationMin);
                    const widthPct = 100 / totalCols;
                    const leftPct = col * widthPct;
                    const palette =
                      COURSE_PALETTE[block.colorIndex % COURSE_PALETTE.length];
                    const instructorLabel = formatInstructorShort(block.instructors);

                    if (block.isPreview) {
                      return (
                        <div
                          key={block.id}
                          style={{
                            top: `calc(${topPct}% + 1px)`,
                            height: `calc(${heightPct}% - 2px)`,
                            minHeight: `${BLOCK_MIN_HEIGHT_PX}px`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${widthPct}% - 8px)`,
                          }}
                          className="absolute z-25 rounded-xl border border-dashed border-[#6E7A74]/50 dark:border-[#495550]/65 bg-[#3A433E]/8 dark:bg-[#1D2220]/70 px-2.5 py-1 pointer-events-none overflow-hidden flex flex-col justify-center gap-0.5 opacity-80"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[12px] font-semibold text-[#47524C] dark:text-[#8E9B94] truncate leading-tight">
                                {block.courseCode}
                              </span>
                              {block.componentTag && (
                                <span className="rounded px-1 py-0.5 text-[9px] font-bold leading-none bg-black/8 dark:bg-white/10 text-[#55615B] dark:text-[#8E9B94] shrink-0">
                                  {block.componentTag}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-[#64706A] dark:text-[#78857E] shrink-0">
                              {block.credits} CH
                            </span>
                          </div>
                          <p className="text-[10.5px] font-medium text-[#5A6660] dark:text-[#7D8A83] truncate leading-tight">
                            {formatTimeDisplay(block.startTime).replace(':00', '')} –{' '}
                            {formatTimeDisplay(block.endTime).replace(':00', '')}
                          </p>
                          <p className="text-[10.5px] text-[#6B7771] dark:text-[#6E7B74] truncate leading-tight">
                            {instructorLabel}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={block.id}
                        data-block="true"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusCourse(block.entryCourseCode);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onFocusCourse(block.entryCourseCode);
                          }
                        }}
                        title={
                          block.hasConflict
                            ? `CLASH with ${block.conflictWith?.join(', ')} · ${block.courseCode} (${block.courseTitle})`
                            : `${block.courseCode} — ${block.courseTitle} (${block.credits} CH · ${block.sectionLabel})\n${formatTimeDisplay(block.startTime)} – ${formatTimeDisplay(block.endTime)}\n${block.instructors.join(', ') || 'TBA'}\nClick to change section`
                        }
                        style={{
                          top: `calc(${topPct}% + 1px)`,
                          height: `calc(${heightPct}% - 2px)`,
                          minHeight: `${BLOCK_MIN_HEIGHT_PX}px`,
                          left: `calc(${leftPct}% + 4px)`,
                          width: `calc(${widthPct}% - 8px)`,
                        }}
                        className={`group absolute z-10 flex flex-col justify-center gap-0.5 overflow-hidden rounded-xl border border-l-[4px] px-2.5 py-1 text-left transition-all duration-150 cursor-pointer hover:z-30 hover:shadow-md ${
                          block.hasConflict
                            ? 'bg-[#FCEEEB] dark:bg-[#3A221F] border-[#E8BCB5] dark:border-[#6A3D37] border-l-[#C24D3F] dark:border-l-[#E37A6D] text-[#4C1E18] dark:text-[#F8DFDC] ring-1 ring-[#D97A6E]/40'
                            : `${palette.lightBg} ${palette.darkBg} ${palette.lightBorder} ${palette.darkBorder} ${palette.lightText} ${palette.darkText}`
                        }`}
                      >
                        {/* Row 1: Course Code ONLY + LEC/RAC/LAB (if linked) + CH + Always-visible Remove X */}
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[12px] font-bold truncate leading-tight">
                              {block.courseCode}
                            </span>
                            {block.componentTag && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold leading-none shrink-0 ${
                                  block.hasConflict
                                    ? 'bg-[#C24D3F]/20 dark:bg-[#E37A6D]/25 text-[#8A2F24] dark:text-[#F8C9C3]'
                                    : 'bg-black/10 dark:bg-white/15'
                                }`}
                              >
                                {block.componentTag}
                              </span>
                            )}
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold leading-none shrink-0 ${
                                block.hasConflict
                                  ? 'bg-[#F5D8D3] dark:bg-[#522D28] text-[#9A382C] dark:text-[#F4B4AC]'
                                  : 'bg-white/80 dark:bg-black/25'
                              }`}
                            >
                              {block.credits} CH
                            </span>
                          </div>

                          <button
                            type="button"
                            data-block="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveCourse(block.entryCourseCode);
                            }}
                            title={`Remove ${block.courseCode}`}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/8 dark:bg-white/12 hover:bg-[#C24D3F] hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        {/* Row 2: Time */}
                        <div
                          className={`text-[10.5px] font-semibold truncate leading-tight ${
                            block.hasConflict
                              ? 'text-[#7A3229] dark:text-[#ECC0BA]'
                              : `${palette.lightSubtext} ${palette.darkSubtext}`
                          }`}
                        >
                          {formatTimeDisplay(block.startTime).replace(':00', '')} –{' '}
                          {formatTimeDisplay(block.endTime).replace(':00', '')}
                        </div>

                        {/* Row 3: Instructor Name (+ Clash badge if overlapping) */}
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span
                            className={`text-[10.5px] font-medium truncate leading-tight ${
                              block.hasConflict
                                ? 'text-[#8F3A30] dark:text-[#E59E95]'
                                : `${palette.lightSubtext} ${palette.darkSubtext}`
                            }`}
                          >
                            {instructorLabel}
                          </span>

                          {block.hasConflict && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#C24D3F] px-1.5 py-0.5 text-[9px] font-bold text-white leading-none shrink-0">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Clash
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
