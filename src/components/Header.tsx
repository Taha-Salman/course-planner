import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  Copy,
  Moon,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import type { Timetable } from '../types/course';

interface HeaderProps {
  timetables: Timetable[];
  activeTimetable: Timetable;
  totalCredits: number;
  conflictCount: number;
  showGaps: boolean;
  onToggleGaps: () => void;
  showWeekends: boolean;
  onToggleWeekends: () => void;
  dark: boolean;
  onToggleTheme: () => void;
  onSelectTimetable: (id: string) => void;
  onCreateTimetable: () => void;
  onDuplicateTimetable: (id: string) => void;
  onDeleteTimetable: (id: string) => void;
}

function isJauharName(input: string): boolean {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return false;

  const compact = normalized.replace(/\s+/g, '');

  // Matches jauhar / johar / jawhar / jouhar / jauher / joher
  if (/j[ao][uw]?h[ae]r/.test(compact)) return true;

  // Matches abdul rehman / abdurrehman / abdur rehman / abdul rahman / abdur rahman / abdulrahman
  if (/abdu[lr]r?[ae]hm[ae]n/.test(compact)) return true;

  return false;
}

export const Header: React.FC<HeaderProps> = ({
  timetables,
  activeTimetable,
  totalCredits,
  conflictCount,
  showGaps,
  onToggleGaps,
  showWeekends,
  onToggleWeekends,
  dark,
  onToggleTheme,
  onSelectTimetable,
  onCreateTimetable,
  onDuplicateTimetable,
  onDeleteTimetable,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [verdict, setVerdict] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const openModal = () => {
    setNameInput('');
    setVerdict(null);
    setModalOpen(true);
  };

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setVerdict(isJauharName(nameInput) ? 'no' : 'yes');
  };

  return (
    <>
      <header className="shrink-0 border-b border-[#E6E2D9] dark:border-[#262C29] bg-[#FAF9F6]/95 dark:bg-[#181C1A]/95 backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-1.5 md:gap-2 px-3 sm:px-3.5 py-2">
          {/* Center on desktop, top row on mobile */}
          <div className="order-1 md:order-2 flex items-center justify-between md:justify-center px-0.5 md:px-2">
            <button
              type="button"
              onClick={openModal}
              className="font-display text-[20px] sm:text-[25px] font-extrabold tracking-tight leading-none text-[#1E2421] dark:text-[#F4F6F4] hover:text-[#3D7A6E] dark:hover:text-[#86C4B6] transition-colors cursor-pointer select-none px-1 md:px-2 py-0.5 rounded-xl"
            >
              Mil jaye ga?
            </button>

            {/* Mobile-only right controls on row 1 */}
            <div className="flex md:hidden items-center gap-1.5">
              <div className="flex items-center gap-1 rounded-xl bg-[#F2EFE8] dark:bg-[#222725] px-2 py-1 text-[11px]">
                <span className="font-semibold text-[#2E6257] dark:text-[#86C4B6]">
                  {totalCredits} CH
                </span>
              </div>

              {conflictCount > 0 && (
                <div
                  className="inline-flex items-center gap-1 rounded-xl bg-[#FCEEEB] dark:bg-[#382320] border border-[#ECC9C2] dark:border-[#5D3731] px-2 py-1 text-[11px] font-semibold text-[#A84438] dark:text-[#E59288]"
                  title="Some selected classes overlap in time"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>{conflictCount}</span>
                </div>
              )}

              <button
                type="button"
                onClick={onToggleGaps}
                title="Show or hide free time between classes"
                className={`inline-flex h-7 items-center justify-center rounded-xl border px-2 text-[11px] font-medium transition-colors cursor-pointer ${
                  showGaps
                    ? 'border-[#CBE0D9] dark:border-[#2E4A43] bg-[#EDF5F2] dark:bg-[#1E312C] text-[#2E6257] dark:text-[#86C4B6]'
                    : 'border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#55605A] dark:text-[#BFC8C3]'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleWeekends}
                title="Show or hide Saturday and Sunday columns"
                className={`inline-flex h-7 items-center justify-center rounded-xl border px-2 text-[11px] font-medium transition-colors cursor-pointer ${
                  showWeekends
                    ? 'border-[#CBE0D9] dark:border-[#2E4A43] bg-[#EDF5F2] dark:bg-[#1E312C] text-[#2E6257] dark:text-[#86C4B6]'
                    : 'border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#55605A] dark:text-[#BFC8C3]'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#55605A] dark:text-[#C5CFC9] cursor-pointer"
              >
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Left: Compact Numbered Timetables (1, 2, 3, 4...) + Duplicate + New */}
          <div className="order-2 md:order-1 flex items-center gap-1.5 overflow-x-auto max-w-full justify-start">
            <div className="flex items-center gap-1 rounded-xl bg-[#EFECE5] dark:bg-[#222725] p-0.5">
              {timetables.map((tt) => {
                const isActive = tt.id === activeTimetable.id;

                return (
                  <div
                    key={tt.id}
                    className={`flex items-center rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-white dark:bg-[#191D1B] text-[#1E2421] dark:text-[#F0F3F0] shadow-2xs ring-1 ring-[#E2DDD3] dark:ring-[#323A36]'
                        : 'text-[#626C66] dark:text-[#96A29C] hover:text-[#1E2421] dark:hover:text-[#E5EBE7]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectTimetable(tt.id)}
                      title={`Timetable ${tt.name} (${tt.entries.length} courses)`}
                      className="min-w-[28px] px-2 py-1 text-xs font-semibold text-center cursor-pointer"
                    >
                      {tt.name}
                    </button>

                    {isActive && timetables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteTimetable(tt.id)}
                        title={`Delete timetable ${tt.name}`}
                        className="mr-1 rounded p-0.5 text-[#8A948E] hover:bg-[#F9ECEA] dark:hover:bg-[#382320] hover:text-[#B95246] dark:hover:text-[#E0877D] transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onDuplicateTimetable(activeTimetable.id)}
              title="Duplicate active timetable"
              className="inline-flex items-center gap-1 rounded-xl border border-[#CBE0D9] dark:border-[#2E4841] bg-[#EDF5F2] dark:bg-[#1E312C] px-2.5 py-1 text-xs font-semibold text-[#2E6257] dark:text-[#86C4B6] hover:bg-[#E1EFEA] dark:hover:bg-[#253C36] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Duplicate</span>
            </button>

            <button
              type="button"
              onClick={onCreateTimetable}
              title="New timetable"
              className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#343C38] dark:text-[#D5DDD8] hover:bg-[#F5F3EE] dark:hover:bg-[#2A312E] transition-colors cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right (Desktop md+): Stats + Sat/Sun + Theme */}
          <div className="hidden md:flex md:order-3 items-center justify-end gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-[#F2EFE8] dark:bg-[#222725] px-2.5 py-1 text-xs">
              <span className="font-medium text-[#4A544F] dark:text-[#BFC8C3]">
                {activeTimetable.entries.length}{' '}
                {activeTimetable.entries.length === 1 ? 'course' : 'courses'}
              </span>
              <span className="text-[#CBC5B9] dark:text-[#404844]">·</span>
              <span className="font-semibold text-[#2E6257] dark:text-[#86C4B6]">
                {totalCredits} CH
              </span>
            </div>

            {conflictCount > 0 && (
              <div
                className="inline-flex items-center gap-1 rounded-xl bg-[#FCEEEB] dark:bg-[#382320] border border-[#ECC9C2] dark:border-[#5D3731] px-2.5 py-1 text-xs font-semibold text-[#A84438] dark:text-[#E59288]"
                title="Some selected classes overlap in time"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>
                  {conflictCount} {conflictCount === 1 ? 'clash' : 'clashes'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleGaps}
              title="Show or hide free time between classes"
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                showGaps
                  ? 'border-[#CBE0D9] dark:border-[#2E4A43] bg-[#EDF5F2] dark:bg-[#1E312C] text-[#2E6257] dark:text-[#86C4B6]'
                  : 'border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#55605A] dark:text-[#BFC8C3] hover:bg-[#F5F3EE] dark:hover:bg-[#2A312E]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gaps</span>
            </button>

            <button
              type="button"
              onClick={onToggleWeekends}
              title="Show or hide Saturday and Sunday columns"
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                showWeekends
                  ? 'border-[#CBE0D9] dark:border-[#2E4A43] bg-[#EDF5F2] dark:bg-[#1E312C] text-[#2E6257] dark:text-[#86C4B6]'
                  : 'border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#55605A] dark:text-[#BFC8C3] hover:bg-[#F5F3EE] dark:hover:bg-[#2A312E]'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sat/Sun</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#E2DDD3] dark:border-[#2E3532] bg-white dark:bg-[#222725] text-[#55605A] dark:text-[#C5CFC9] hover:bg-[#F5F3EE] dark:hover:bg-[#2A312E] transition-colors cursor-pointer"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* "Kisko?" Interactive Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#E4E0D7] dark:border-[#2E3532] bg-[#FCFBF8] dark:bg-[#1C211F] p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-extrabold text-[#1E2421] dark:text-[#F0F3F0]">
                Kisko?
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-[#8A948E] hover:bg-[#EFECE5] dark:hover:bg-[#2A302D] hover:text-[#1E2421] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {verdict === null ? (
              <form onSubmit={handleSubmitName} className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name…"
                  className="w-full rounded-xl border border-[#DFDAD0] dark:border-[#313835] bg-white dark:bg-[#232926] px-3.5 py-2.5 text-sm text-[#1E2421] dark:text-[#F0F3F0] placeholder:text-[#96A09A] dark:placeholder:text-[#6C7872] focus:border-[#3D7A6E] dark:focus:border-[#72B0A2] focus:outline-none focus:ring-2 focus:ring-[#3D7A6E]/20"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-[#E2DDD3] dark:border-[#313835] bg-[#F5F3EE] dark:bg-[#252B28] px-3.5 py-2 text-xs font-medium text-[#525D57] dark:text-[#B9C4BE] hover:bg-[#EAE6DD] dark:hover:bg-[#2E3532] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!nameInput.trim()}
                    className="rounded-xl bg-[#3D7A6E] dark:bg-[#5B9B8E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#32675C] dark:hover:bg-[#4D8B7E] transition-colors cursor-pointer disabled:opacity-45"
                  >
                    Check
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                {verdict === 'no' ? (
                  <p className="font-display text-3xl font-extrabold tracking-tight text-[#C24D3F] dark:text-[#EA7B6D]">
                    NAHI MILNA
                  </p>
                ) : (
                  <p className="font-display text-3xl font-extrabold tracking-tight text-[#2E6257] dark:text-[#86C4B6]">
                    Mil jaye ga
                  </p>
                )}

                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput('');
                      setVerdict(null);
                    }}
                    className="rounded-xl border border-[#E2DDD3] dark:border-[#313835] bg-[#F5F3EE] dark:bg-[#252B28] px-3.5 py-2 text-xs font-medium text-[#525D57] dark:text-[#B9C4BE] hover:bg-[#EAE6DD] dark:hover:bg-[#2E3532] transition-colors cursor-pointer"
                  >
                    Check another
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl bg-[#3D7A6E] dark:bg-[#5B9B8E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#32675C] dark:hover:bg-[#4D8B7E] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
