import { useMemo, useState, useEffect } from "react";
import fuzzysort from "fuzzysort";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog.jsx";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
} from "./ui/command.jsx";
import { useCourse } from "../context/CourseContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import { MOD_KEY } from "../lib/platform.js";
import {
  TerminalSquare,
  BookMarked,
  Sun,
  Moon,
  Plus,
  Minus,
  FileText,
  CornerDownLeft,
} from "lucide-react";

// Build a searchable text blob for each lesson (title + summary + prose + code).
function buildIndex(LESSONS) {
  return LESSONS.map((l, index) => {
    const parts = [l.title, l.summary, l.group];
    (l.content || []).forEach((b) => {
      if (b.text) parts.push(b.text);
      if (b.code) parts.push(b.code);
      if (b.items) {
        parts.push(b.items.map((it) => (typeof it === "string" ? it : it.text || "")).join(" "));
      }
    });
    (l.exercises || []).forEach((ex) => {
      if (ex.prompt) parts.push(ex.prompt);
    });
    const text = parts.join("  ·  ");
    return { index, id: l.id, title: l.title, group: l.group, text };
  });
}

// fuzzysort v3 dropped `highlight()`, so wrap matched chars ourselves. Indexes
// are the sorted char positions of the match within the target string.
function highlight(text, indexes, cls = "palette-match") {
  if (!indexes || !indexes.length) return text;
  let out = "";
  let prev = 0;
  for (const i of indexes) {
    out += text.slice(prev, i) + `<b class="${cls}">` + text[i] + "</b>";
    prev = i + 1;
  }
  out += text.slice(prev);
  return out;
}

// Build a pre/match/post snippet anchored on the first matched index, where the
// matched span runs from the first to the last matched char (may include a few
// un-matched middle chars for fuzzy gaps — looks natural in a snippet).
function buildSnippet(text, indexes) {
  if (!indexes || !indexes.length) return null;
  const first = indexes[0];
  const last = indexes[indexes.length - 1];
  const winStart = Math.max(0, first - 34);
  const winEnd = Math.min(text.length, last + 1 + 46);
  return {
    pre: (winStart > 0 ? "… " : "") + text.slice(winStart, first),
    match: text.slice(first, last + 1),
    post: text.slice(last + 1, winEnd) + (winEnd < text.length ? " …" : ""),
  };
}

// Title matches rank above body matches: with observed scores of 0..1 for good
// matches, subtracting 100 makes every title match beat every body match — the
// Flakes lesson always wins over a lesson that merely mentions flakes.
const BODY_PENALTY = 100;
// Only keep matches that clear this bar (scores are 0..1 for good matches).
const MIN_SCORE = -1000;

/**
 * Unified command palette (Cmd/Ctrl+K).
 *
 * Replaces the old search-only dialog: quick navigation commands (REPL, cheat
 * sheet, theme, font size) plus full-text lesson search, both powered by
 * fuzzysort's VS Code-style subsequence scorer — "opr" finds
 * "Open REPL Playground". Browsing (empty query) stays grouped by module.
 */
export function CommandPalette({ open, onOpenChange, onSelectLesson, onOpenRepl, onOpenCheatsheet }) {
  const { LESSONS, GROUPS } = useCourse();
  const { effectiveThemeKey, toggleTheme, changeFont } = useApp();
  const index = useMemo(() => buildIndex(LESSONS), [LESSONS]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const query = q.trim();

  const actions = useMemo(() => {
    const otherTheme = effectiveThemeKey === "kanagawa" ? "Gruvbox" : "Kanagawa";
    const mk = (id, label, keywords, run, keepsOpen, icon) => ({
      id,
      label,
      searchable: `${label} ${keywords.join(" ")}`,
      run,
      keepsOpen,
      icon,
    });
    return [
      mk("repl", "Open REPL Playground", ["terminal", "playground", "practice", "eval", "expression"], onOpenRepl, false, <TerminalSquare size={15} />),
      mk("cheatsheet", "Open Cheat Sheet", ["reference", "commands", "quick", "builtins", "shortcuts"], onOpenCheatsheet, false, <BookMarked size={15} />),
      mk("theme", `Switch to ${otherTheme} theme`, ["appearance", "dark", "light", "mode", "colors"], toggleTheme, true, effectiveThemeKey === "kanagawa" ? <Sun size={15} /> : <Moon size={15} />),
      mk("font-inc", "Increase font size", ["text", "bigger", "larger", "zoom", "readability"], () => changeFont(1), true, <Plus size={15} />),
      mk("font-dec", "Decrease font size", ["text", "smaller", "zoom"], () => changeFont(-1), true, <Minus size={15} />),
    ];
  }, [effectiveThemeKey, toggleTheme, changeFont, onOpenRepl, onOpenCheatsheet]);

  // Prepared targets so repeated queries are cheap.
  const searchable = useMemo(() => {
    return GROUPS.flatMap((g) =>
      g.items.map((it) => {
        const entry = index[it.index];
        return {
          index: it.index,
          id: it.id,
          title: it.title,
          group: g.name,
          text: entry ? entry.text : it.title,
          titlePrepared: fuzzysort.prepare(it.title),
          textPrepared: fuzzysort.prepare(entry ? entry.text : it.title),
        };
      })
    );
  }, [GROUPS, index]);

  const visibleActions = useMemo(() => {
    if (!query) return actions.map((a) => ({ ...a, labelHtml: a.label }));
    const out = [];
    for (const a of actions) {
      const labelRes = fuzzysort.single(query, a.label);
      const combinedRes = labelRes || fuzzysort.single(query, a.searchable);
      if (!combinedRes) continue;
      out.push({
        ...a,
        labelHtml: labelRes ? highlight(a.label, labelRes.indexes) : a.label,
        score: combinedRes.score,
      });
    }
    return out.sort((x, y) => y.score - x.score);
  }, [query, actions]);

  // Fuzzy lesson search: title matches beat body matches; results are flat and
  // score-sorted (the per-row group label replaces the module headings here).
  const fuzzyLessons = useMemo(() => {
    if (!query) return [];
    const out = [];
    for (const it of searchable) {
      const titleRes = fuzzysort.single(query, it.titlePrepared);
      const bodyRes = fuzzysort.single(query, it.textPrepared);
      const score = Math.max(
        titleRes ? titleRes.score : -Infinity,
        bodyRes ? bodyRes.score - BODY_PENALTY : -Infinity
      );
      if (score <= MIN_SCORE) continue;
      out.push({ it, titleRes, bodyRes, score });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, searchable]);

  // Browse mode (empty query): grouped by module; only render groups with items.
  const groups = useMemo(() => {
    return GROUPS.map((g) => ({
      name: g.name,
      items: g.items.map((it) => ({ ...index[it.index], ...it })),
    })).filter((g) => g.items.length > 0);
  }, [GROUPS, index]);

  const totalVisible =
    visibleActions.length + (query === "" ? groups.reduce((n, g) => n + g.items.length, 0) : fuzzyLessons.length);

  const pick = (item) => {
    item.run();
    if (!item.keepsOpen) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden palette-dialog max-w-[680px]" data-testid="command-palette">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to any lesson, open the REPL or cheat sheet, or adjust appearance.
        </DialogDescription>
        <Command shouldFilter={false} className="palette-command">
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder="Type a command or search lessons…"
            data-testid="palette-input"
          />
          <CommandList className="palette-list">
            {totalVisible === 0 && <CommandEmpty>No matches for “{q}”.</CommandEmpty>}
            {visibleActions.length > 0 && (
              <CommandGroup heading="Actions" data-testid="palette-actions">
                {visibleActions.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`action:${a.id}`}
                    onSelect={() => pick(a)}
                    className="palette-item palette-action"
                    data-testid={`palette-action-${a.id}`}
                  >
                    <span className="palette-action-icon">{a.icon}</span>
                    <span
                      className="palette-action-label"
                      dangerouslySetInnerHTML={{ __html: a.labelHtml }}
                    />
                    <CornerDownLeft size={13} className="palette-action-enter" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {query === "" ? (
              groups.map((g) => (
                <CommandGroup key={g.name} heading={g.name}>
                  {g.items.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={`lesson:${r.id}`}
                      onSelect={() => onSelectLesson(r.index)}
                      className="palette-item"
                      data-testid={`palette-result-${r.index}`}
                    >
                      <FileText size={15} className="palette-item-icon" />
                      <div className="palette-item-body">
                        <div className="palette-item-title">
                          <span className="palette-item-num">{r.index + 1}</span>
                          {r.title}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup heading="Lessons" data-testid="palette-lessons">
                {fuzzyLessons.map(({ it, titleRes, bodyRes }) => (
                  <CommandItem
                    key={it.id}
                    value={`lesson:${it.id}`}
                    onSelect={() => onSelectLesson(it.index)}
                    className="palette-item"
                    data-testid={`palette-result-${it.index}`}
                  >
                    <FileText size={15} className="palette-item-icon" />
                    <div className="palette-item-body">
                      <div className="palette-item-title">
                        <span className="palette-item-num">{it.index + 1}</span>
                        {titleRes ? (
                          <span
                            className="palette-item-title-text"
                            dangerouslySetInnerHTML={{ __html: highlight(it.title, titleRes.indexes) }}
                          />
                        ) : (
                          <span className="palette-item-title-text">{it.title}</span>
                        )}
                        <span className="palette-item-group">{it.group}</span>
                      </div>
                      {!titleRes && bodyRes && (
                        <SnippetBlock text={it.text} indexes={bodyRes.indexes} />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          <div className="palette-footer" data-testid="palette-footer">
            <span className="palette-footer-item">
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate
            </span>
            <span className="palette-footer-item">
              <kbd>↵</kbd> select
            </span>
            <span className="palette-footer-item">
              <kbd>esc</kbd> close
            </span>
            <span className="palette-footer-item palette-footer-shortcut">
              <kbd>{MOD_KEY}</kbd>
              <kbd>K</kbd> open anytime
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function SnippetBlock({ text, indexes }) {
  const s = useMemo(() => buildSnippet(text, indexes), [text, indexes]);
  if (!s) return null;
  return (
    <div className="palette-item-snippet">
      {s.pre}
      <mark>{s.match}</mark>
      {s.post}
    </div>
  );
}

export default CommandPalette;
