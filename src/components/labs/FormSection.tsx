import type { ReactNode } from 'react';
export default function FormSection({title,summary,children}:{title:string;summary:ReactNode;children:ReactNode}) {
  return <details className="instrument-form-section" open><summary><span>{title}</span><small>{summary}</small><span className="instrument-chevron" aria-hidden="true">⌄</span></summary><div className="instrument-form-body">{children}</div></details>;
}
