import { ReactNode } from "react";

interface TemplatePageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function TemplatePageHeader({ eyebrow, title, description, actions }: TemplatePageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm uppercase text-muted-foreground">{eyebrow}</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
