
import { useState, useEffect } from 'react';

export const useSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage, default to false if not found
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chat-sidebar-collapsed');
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  });

  useEffect(() => {
    // Save state to localStorage whenever it changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-sidebar-collapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return {
    isCollapsed,
    toggleSidebar,
  };
};
