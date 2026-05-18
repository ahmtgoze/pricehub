/**
 * Türkiye sayı formatı: 1.253,89
 * Binlik ayırıcı: nokta (.)
 * Ondalık ayırıcı: virgül (,)
 */
export const formatTurkishCurrency = (num, decimals = 2) => {
  if (num === null || num === undefined) return '—';
  
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '—';
  
  const fixed = numValue.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');
  
  // Binlik ayırıcı (.) ekle
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Ondalık kısmı virgül (,) ile ayır
  return `${formattedInteger},${decimalPart}`;
};

/**
 * Yüzde formatı: %25,50
 */
export const formatTurkishPercent = (num) => {
  if (num === null || num === undefined) return '—';
  
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '—';
  
  return `%${numValue.toFixed(1).replace('.', ',')}`;
};
