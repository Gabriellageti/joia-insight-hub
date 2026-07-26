import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types";
import type { ReactNode } from "react";

interface KanbanColumnProps {
  status: Task["status"];
  title: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ status, title, count, children }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section className="min-w-0" aria-labelledby={`column-${status}`}>
      <Card ref={setNodeRef} className={`bg-muted/30 transition-colors ${isOver ? "ring-2 ring-primary/50" : ""}`}>
        <CardHeader className="p-4 pb-2">
          <CardTitle id={`column-${status}`} className="flex items-center justify-between text-sm">
            {title}
            <Badge variant="outline">{count}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-28 space-y-2 p-3 pt-1">{children}</CardContent>
      </Card>
    </section>
  );
}
