
import { useState, useCallback } from 'react';

interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  dragOverTarget: string | null;
}

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItemId: null,
    dragOverTarget: null,
  });

  const handleDragStart = useCallback((itemId: string) => {
    setDragState({
      isDragging: true,
      draggedItemId: itemId,
      dragOverTarget: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItemId: null,
      dragOverTarget: null,
    });
  }, []);

  const handleDragOver = useCallback((targetId: string) => {
    setDragState(prev => ({
      ...prev,
      dragOverTarget: targetId,
    }));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dragOverTarget: null,
    }));
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
  };
};
