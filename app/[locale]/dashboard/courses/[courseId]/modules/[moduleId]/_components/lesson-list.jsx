"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Grip, Pencil, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { CirclePlay } from "lucide-react";
import { PublishBadge } from "@/components/ui/publish-badge";

export const LessonList = ({ items, onReorder, onEdit }) => {
  const t = useTranslations("ChapterEdit");
  const tAlign = useTranslations("Alignment");
  const [isMounted, setIsMounted] = useState(false);
  const [modules, setModules] = useState(items);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setModules(items);
  }, [items]);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const startIndex = Math.min(result.source.index, result.destination.index);
    const endIndex = Math.max(result.source.index, result.destination.index);

    const updatedModules = items.slice(startIndex, endIndex + 1);

    setModules(items);

    const bulkUpdateData = updatedModules.map((module) => ({
      id: module.id,
      position: items.findIndex((item) => item.id === module.id),
    }));

    onReorder(bulkUpdateData);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="modules">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {modules.map((module, index) => (
              <Draggable key={module.id || index} draggableId={module.id || `lesson-${index}`} index={index}>
                {(provided) => (
                  <div
                    className={cn(
                      "flex items-center gap-x-2 bg-slate-200 border-slate-200 border text-slate-700 rounded-md mb-4 text-sm",
                      module.active &&
                        "bg-sky-100 border-sky-200 text-sky-700"
                    )}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                  >
                    <div
                      className={cn(
                        "px-2 py-3 border-e border-e-slate-200 hover:bg-slate-300 rounded-s-md transition",
                        module.active &&
                          "border-e-sky-200 hover:bg-sky-200"
                      )}
                      {...provided.dragHandleProps}
                    >
                      <Grip className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <CirclePlay size={18} />
                      <span dir="auto">{module.title}</span>
                    </div>
                    <div className="ms-auto pe-2 flex items-center gap-x-2">
                      {module.alignmentStatus === 'completed' ? (
                        <div title={tAlign("ready")} className="flex items-center text-green-600">
                          <CheckCircle2 size={14} />
                        </div>
                      ) : module.jobStatus === 'processing' || module.jobStatus === 'queued' ? (
                        <div title={tAlign("processing")} className="flex items-center text-amber-600">
                          <Loader2 size={14} className="animate-spin" />
                        </div>
                      ) : module.alignmentStatus === 'failed' ? (
                        <div title={tAlign("failed")} className="flex items-center text-red-600">
                          <AlertCircle size={14} />
                        </div>
                      ) : null}
                      <PublishBadge 
                        status={module.active ? "published" : "draft"} 
                      />
                      <Pencil
                        onClick={() => onEdit(module.id)}
                        className="w-4 h-4 cursor-pointer hover:opacity-75 transition"
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
