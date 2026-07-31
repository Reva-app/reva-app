"use client";

import type { ReactNode } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableExerciseListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (orderedIds: string[]) => void;
  /** Zonder bewerkrechten (bv. read-only REVA-schema) tonen we een gewone, niet-versleepbare lijst. */
  disabled?: boolean;
  renderItem: (item: T, index: number, dragHandle: ReactNode) => ReactNode;
}

/**
 * Herbruikbare sleep-volgorde-lijst (dnd-kit) voor oefeningen — gebruikt in
 * zowel de schema-bouwer (schedule_library_exercises) als het herstelplan van
 * een specifieke patiënt (patient_protocol_schedule_exercises). Elke rij krijgt
 * een dragHandle doorgegeven zodat de aanroeper zelf de visuele opmaak bepaalt.
 */
export function SortableExerciseList<T>({ items, getId, onReorder, disabled, renderItem }: SortableExerciseListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  if (disabled) {
    return <>{items.map((item, index) => <div key={getId(item)}>{renderItem(item, index, null)}</div>)}</>;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => getId(item) === active.id);
    const newIndex = items.findIndex((item) => getId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex).map(getId));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableExerciseRow key={getId(item)} id={getId(item)}>
            {(dragHandle) => renderItem(item, index, dragHandle)}
          </SortableExerciseRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableExerciseRow({ id, children }: { id: string; children: (dragHandle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Verslepen om volgorde te wijzigen"
      className="shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
    >
      <GripVertical size={14} />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}
