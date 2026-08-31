import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // 'xlsx' -> 'xlsx-js-style'
      //
      // xlsx-js-style, xlsx 0.18.5'in stil YAZABILEN catallanmisidir; API'si
      // birebir aynidir. Kaynakta herkes 'xlsx' yazmaya devam eder, paket
      // burada tek kutuphaneye baglanir.
      //
      // NICIN TAKMA AD: yalnizca bir sayfada dogrudan 'xlsx-js-style' import
      // edilince IKI kutuphane birden pakete giriyordu (neredeyse ayni kod) ve
      // gzip boyutu 693 KB -> 1.024 KB'a ciktu. Takma adla tek kopya kalir ve
      // stil yazma yetenegini butun sayfalar kazanir.
      "xlsx": "xlsx-js-style",
    },
  },
})