import React, { createContext, useContext, useState, useCallback } from 'react';
const BackgroundTaskContext = createContext(null);
export function BackgroundTaskProvider({ children }) {
  const [task, setTask] = useState(null);
  // task: { id, name, pageName, pageRoute, current, total } | null
  const startTask = useCallback((id, name, pageName, pageRoute, total) => {
    setTask({ id, name, pageName, pageRoute, current: 0, total });
  }, []);
  const updateTask = useCallback((current, total) => {
    setTask(prev => prev ? { ...prev, current, total: total ?? prev.total } : prev);
  }, []);
  const finishTask = useCallback(() => {
    setTask(null);
  }, []);
  return (
    <BackgroundTaskContext.Provider value={{ task, startTask, updateTask, finishTask }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
}
export function useBackgroundTask() {
  return useContext(BackgroundTaskContext);
}
