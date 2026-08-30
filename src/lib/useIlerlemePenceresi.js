import { useState, useEffect } from 'react';
import { useBackgroundTask } from '@/lib/BackgroundTaskContext';

/**
 * Kapatilabilir ilerleme penceresi.
 *
 * NICIN VAR: ilerleme pencereleri `open={islemSuruyor}` seklinde
 * yaziliyordu ve `onOpenChange` yoktu. Radix carpiya basildiginda
 * onOpenChange'i cagirir; tanimli olmayinca HICBIR SEY olmuyordu.
 * Kullanici islem bitene kadar ekranda kilitli kaliyordu.
 *
 * Bu kanca pencereyi kapatilabilir yapar. Islem arka planda surer;
 * ust bardaki serit yuzdeyi gostermeye devam eder.
 *
 * KULLANIM
 *   const ilerleme = useIlerlemePenceresi(importProgress.isImporting);
 *   <Dialog open={ilerleme.gorunur} onOpenChange={ilerleme.acikligiDegistir}>
 *
 * @param islemSuruyor İşlem devam ediyor mu (pencerenin var olma şartı)
 */
export function useIlerlemePenceresi(islemSuruyor) {
  const { setPanelAcik } = useBackgroundTask() || {};
  const [kapatildi, setKapatildi] = useState(false);

  // Yeni bir islem baslayinca pencere yeniden acilsin; aksi halde bir kez
  // kapatan kullanici bir daha hic ilerleme goremezdi.
  useEffect(() => {
    if (!islemSuruyor) setKapatildi(false);
  }, [islemSuruyor]);

  const gorunur = islemSuruyor && !kapatildi;

  // Serit yalnizca pencere kapaliyken cikar.
  useEffect(() => {
    setPanelAcik?.(gorunur);
  }, [gorunur, setPanelAcik]);

  return {
    gorunur,
    kapat: () => setKapatildi(true),
    acikligiDegistir: (acik) => { if (!acik) setKapatildi(true); },
  };
}
