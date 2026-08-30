import React, { createContext, useContext, useState, useCallback } from 'react';
import { yuzdeHesapla } from '@/lib/islemSeridi';

const BackgroundTaskContext = createContext(null);

/**
 * Uzun suren islemleri (fiyat hesaplama, Excel yukleme) takip eder.
 *
 * Kullanici ilerleme penceresini KAPATABILIR; islem arka planda surer ve
 * ust bardaki serit yuzdeyi gostermeye devam eder. Bu yuzden iki ayri
 * bilgi tutuluyor:
 *   task      — islem suruyor mu, nerede kaldi
 *   panelAcik — o islemin kendi penceresi su an ekranda mi
 * Serit yalnizca pencere KAPALIYKEN gorunur; ikisi ayni anda cikarsa
 * ayni bilgi iki yerde tekrar eder.
 */
export function BackgroundTaskProvider({ children }) {
  // task: { id, name, pageName, pageRoute, current, total } | null
  const [task, setTask] = useState(null);
  const [panelAcik, setPanelAcik] = useState(false);

  const startTask = useCallback((id, name, pageName, pageRoute, total) => {
    setTask({ id, name, pageName, pageRoute, current: 0, total });
    setPanelAcik(true);
  }, []);

  /**
   * Sayaci ilerletir. Ad da verilebilir: islem asama degistirdiginde
   * (hesaplama -> kaydetme) gorevi yeniden BASLATMAK yerine sadece adi
   * degistiriyoruz. startTask cagirmak sayaci sifirlar ve kullanici
   * cubugun %100'den 0'a dusup yeniden baslamasini bozukluk sanir.
   */
  const updateTask = useCallback((current, total, name) => {
    setTask(prev => (prev
      ? { ...prev, current, total: total ?? prev.total, name: name ?? prev.name }
      : prev));
  }, []);

  const finishTask = useCallback(() => {
    setTask(null);
    setPanelAcik(false);
  }, []);

  /** Yuzde — total bilinmiyorsa null (serit belirsiz durum gosterir). */
  const yuzde = task ? yuzdeHesapla(task.current, task.total) : null;

  return (
    <BackgroundTaskContext.Provider
      value={{ task, yuzde, panelAcik, setPanelAcik, startTask, updateTask, finishTask }}
    >
      {children}
    </BackgroundTaskContext.Provider>
  );
}

export function useBackgroundTask() {
  return useContext(BackgroundTaskContext);
}
