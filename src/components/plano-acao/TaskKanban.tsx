import { useCallback, useMemo } from "react";
import {
  closestCorners,
  defaultKeyboardCoordinateGetter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
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
  const getKeyboardCoordinates = useCallback<KeyboardCoordinateGetter>((event, args) => {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") {
      return defaultKeyboardCoordinateGetter(event, args);
    }

    const activeTask = tasks.find((task) => task.id === String(args.active));
    const currentStatus = TASK_STATUSES.some(({ id }) => id === args.context.over?.id)
      ? String(args.context.over?.id)
      : activeTask?.status;
    const currentIndex = TASK_STATUSES.findIndex(({ id }) => id === currentStatus);
    const targetIndex = currentIndex + (event.code === "ArrowRight" ? 1 : -1);
    const targetStatus = TASK_STATUSES[targetIndex]?.id;
    const targetContainer = targetStatus ? args.context.droppableContainers.get(targetStatus) : undefined;
    const targetRect = targetStatus
      ? args.context.droppableRects.get(targetStatus)
        ?? targetContainer?.rect.current
        ?? targetContainer?.node.current?.getBoundingClientRect()
      : undefined;

    return targetRect ? { x: targetRect.left, y: args.currentCoordinates.y } : args.currentCoordinates;
  }, [tasks]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: getKeyboardCoordinates }),
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
                onStatusChange={(status) => onStatusChange(task, status)}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </DndContext>
  );
}
