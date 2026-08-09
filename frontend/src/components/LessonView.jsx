import { useRef, useState } from "react";
import { RunnableSnippet } from "./RunnableSnippet.jsx";
import { StaticSnippet } from "./StaticSnippet.jsx";
import { ReagentSnippet } from "./ReagentSnippet.jsx";
import { Exercise } from "./Exercise.jsx";
import { useApp } from "../context/AppContext.jsx";
import { useCourse } from "../context/CourseContext.jsx";
import { ChevronLeft, ChevronRight, CheckCircle2, Dumbbell, Info, ArrowRight, TerminalSquare, ExternalLink } from "lucide-react";

// Inline http(s):// URLs inside prose are auto-linked (case-insensitive).
// Trailing sentence punctuation stays as plain text outside the link, so
// "See https://nix.dev." links the URL and keeps the period. A closing
// paren that balances an opening paren inside the URL is kept (e.g.
// https://en.wikipedia.org/wiki/Nix_(package_manager)).
const INLINE_URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]>"'`]$/;

// The CSS tooltip bubble extends ~37px above the link (gap + arrow + bubble).
// When a link sits within this limit of the viewport top the bubble would
// clip, so LessonLink flips it to render below the link instead.
const TOOLTIP_FLIP_LIMIT = 48;

// Hover/focus tooltip: the domain plus a hint that the link opens a new tab.
// mailto: links open the mail client instead, so the hint reflects that.
function linkTooltip(url) {
  if (/^mailto:/i.test(url)) return "Opens your email client";
  let host;
  try {
    host = new URL(url).hostname || url;
  } catch {
    host = url;
  }
  return `${host} — opens in a new tab`;
}

function LessonLink({ url, testId, children }) {
  const ref = useRef(null);
  const [flip, setFlip] = useState(false);

  // The tooltip is a pure-CSS ::after bubble above the link; if the link is
  // near the top of the viewport the bubble would clip, so measure at
  // hover/focus time and switch to a below-link placement (lesson-link-flip).
  const updatePlacement = () => {
    const el = ref.current;
    if (!el) return;
    setFlip(el.getBoundingClientRect().top < TOOLTIP_FLIP_LIMIT);
  };

  return (
    <a
      ref={ref}
      className={flip ? "lesson-link lesson-link-flip" : "lesson-link"}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-tooltip={linkTooltip(url)}
      data-testid={testId}
      onMouseEnter={updatePlacement}
      onFocus={updatePlacement}
    >
      {children}
      <ExternalLink size={12} className="lesson-link-icon" aria-hidden="true" />
    </a>
  );
}

function AutoLinkText({ text }) {
  const parts = [];
  let last = 0;
  let key = 0;
  INLINE_URL_RE.lastIndex = 0;
  let m;
  while ((m = INLINE_URL_RE.exec(text))) {
    let url = m[0];
    let tail = "";
    while (url) {
      const ch = url[url.length - 1];
      if (!TRAILING_PUNCT.test(ch)) break;
      // Keep a trailing ") " when it closes a paren inside the URL itself
      // ("Nix_(package_manager)"), so only sentence-ending parens are stripped.
      if (ch === ")" && (url.match(/\(/g) || []).length >= (url.match(/\)/g) || []).length) break;
      tail = ch + tail;
      url = url.slice(0, -1);
    }
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (url) {
      parts.push(
        <LessonLink key={key} url={url} testId={`inline-link-${key}`}>
          {url}
        </LessonLink>
      );
      key += 1;
    }
    if (tail) parts.push(tail);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Block({ block, onSwitchCourse, onOpenRepl }) {
  switch (block.t) {
    case "h":
      return <h3 className="lesson-h">{block.text}</h3>;
    case "note":
      return (
        <div className="lesson-note">
          <Info size={16} />
          <span>{block.text}</span>
        </div>
      );
    case "cta":
      return (
        <div className="lesson-cta" data-testid="lesson-cta">
          {block.text && <p className="lesson-cta-text">{block.text}</p>}
          <button
            className="lesson-cta-btn"
            data-testid="lesson-cta-btn"
            onClick={() => onSwitchCourse && onSwitchCourse(block.courseId)}
          >
            {block.label || "Start the next course"} <ArrowRight size={16} />
          </button>
        </div>
      );
    case "repl":
      return (
        <div className="lesson-cta" data-testid="lesson-repl-cta">
          {block.text && <p className="lesson-cta-text">{block.text}</p>}
          <button
            className="lesson-cta-btn"
            data-testid="lesson-repl-btn"
            onClick={() => onOpenRepl && onOpenRepl()}
          >
            <TerminalSquare size={16} /> {block.label || "Practice in the REPL"} <ArrowRight size={16} />
          </button>
        </div>
      );
    case "code":
      return <RunnableSnippet code={block.code} />;
    case "read":
      return <StaticSnippet code={block.code} />;
    case "reagent":
      return <ReagentSnippet code={block.code} />;
    case "table":
      return (
        <div className="lesson-table-wrap">
          <table className="lesson-table">
            {block.head && (
              <thead>
                <tr>
                  {block.head.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "list":
      return (
        <ul className="lesson-list">
          {block.items.map((it, i) => (
            <li key={i}>
              {it && typeof it === "object" && it.url && /^(https?:|mailto:)/i.test(it.url) ? (
                <LessonLink url={it.url} testId={`lesson-link-${i}`}>
                  {it.text}
                </LessonLink>
              ) : (
                it
              )}
            </li>
          ))}
        </ul>
      );
    case "p":
      return (
        <p className="lesson-p">
          <AutoLinkText text={block.text} />
        </p>
      );
    default:
      return <p className="lesson-p">{block.text}</p>;
  }
}

export function LessonView({ index, onNavigate, onOpenRepl, onSwitchCourse }) {
  const { progress, markLessonDone } = useApp();
  const { LESSONS } = useCourse();
  const lesson = LESSONS[index];
  const prog = progress[lesson.id] || { done: false, exercises: {} };
  const totalEx = lesson.exercises?.length || 0;
  const doneEx = Object.keys(prog.exercises || {}).length;

  return (
    <article className="lesson" data-testid="lesson-view" key={lesson.id}>
      <div className="lesson-meta">
        <span className="lesson-kicker">
          {lesson.group} · Lesson {index + 1} of {LESSONS.length}
        </span>
        {prog.done && (
          <span className="lesson-done-badge" data-testid="lesson-done-badge">
            <CheckCircle2 size={14} /> Completed
          </span>
        )}
      </div>
      <h1 className="lesson-title">{lesson.title}</h1>
      <p className="lesson-summary">{lesson.summary}</p>

      <div className="lesson-body">
        {lesson.content.map((b, i) => (
          <Block key={i} block={b} onSwitchCourse={onSwitchCourse} onOpenRepl={onOpenRepl} />
        ))}
      </div>

      {totalEx > 0 && (
        <section className="exercises" data-testid="exercises-section">
          <div className="exercises-head">
            <Dumbbell size={18} />
            <h2>Practice</h2>
            <span className="exercises-count">
              {doneEx}/{totalEx} solved
            </span>
          </div>
          {lesson.exercises.map((ex, i) => (
            <Exercise key={i} lessonId={lesson.id} index={i} exercise={ex} />
          ))}
        </section>
      )}

      <div className="lesson-footer">
        <button
          className="ghost-btn"
          disabled={index === 0}
          onClick={() => onNavigate(index - 1)}
          data-testid="prev-lesson"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <button
          className={`complete-btn ${prog.done ? "is-done" : ""}`}
          onClick={() => markLessonDone(lesson.id, !prog.done)}
          data-testid="mark-complete"
        >
          <CheckCircle2 size={16} />
          {prog.done ? "Completed" : "Mark complete"}
        </button>

        <button
          className="ghost-btn"
          disabled={index === LESSONS.length - 1}
          onClick={() => onNavigate(index + 1)}
          data-testid="next-lesson"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

export default LessonView;
