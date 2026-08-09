import { CodeEditor } from "./CodeEditor.jsx";
import { useApp } from "../context/AppContext.jsx";
import { useCourse } from "../context/CourseContext.jsx";
import { Eye } from "lucide-react";

// A non-runnable, syntax-highlighted code sample (for preview/reference code
// that needs a real Nix install and can't run in the browser evaluator).
export function StaticSnippet({ code, lang }) {
  const { themeVars, dark, fontSize } = useApp();
  const course = useCourse();
  const editorLang = lang || course?.editorLang || "clojure";
  return (
    <div className="snippet static-snippet" data-testid="static-snippet">
      <div className="snippet-toolbar">
        <span className="snippet-label">example — read only</span>
        <span className="static-badge"><Eye size={13} /> preview</span>
      </div>
      <div className="snippet-editor">
        <CodeEditor
          value={code}
          themeVars={themeVars}
          dark={dark}
          fontSize={fontSize}
          editable={false}
          lang={editorLang}
        />
      </div>
    </div>
  );
}

export default StaticSnippet;
