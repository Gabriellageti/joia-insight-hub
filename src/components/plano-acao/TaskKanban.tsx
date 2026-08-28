import { useMemo } from "react";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import type { Task } from "@/types";

interface TaskKanbanProps {
  tasks: Task[];
  savingTaskIds: string[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task["status"]) => void;
}

export function TaskKanban({ tasks, savingTaskIds, onEdit, onDelete, onToggleComplete, onStatusChange }: TaskKanbanProps) {
  const savingIds = useMemo(() => new Set(savingTaskIds), [savingTaskIds]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const tasksByColumn = useMemo(
    () => Object.fromEntries(TASK_STATUSES.map(({ id }) => [id, tasks.filter((task) => task.status === id)])) as Record<Task["status"], Task[]>,
    [tasks],
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const status = String(over.id) as Task["status"];
    const task = tasks.find((item) => item.id === String(active.id));
    if (!task || task.status === status || savingIds.has(task.id) || !TASK_STATUSES.some((item) => item.id === status)) return;
    onStatusChange(task, status);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex snap-x gap-4 overflow-x-auto pb-4" aria-label="Kanban de tarefas">
        {TASK_STATUSES.map((column) => (
          <KanbanColumn key={column.id} status={column.id} title={column.label} count={tasksByColumn[column.id].length}>
            {tasksByColumn[column.id].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                saving={savingIds.has(task.id)}
                onClick={() => onEdit(task)}
                onDelete={() => onDelete(task)}
                onToggleComplete={() => onToggleComplete(task)}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </DndContext>
  );
}
