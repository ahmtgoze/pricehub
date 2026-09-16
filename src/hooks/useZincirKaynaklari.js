import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';

/**
 * Zincir hesabinin (src/lib/zincirHesabi.js) ihtiyac duydugu kayitlar:
 * diger promosyon sayfalarinin secimleri + kampanyalar. Sorgu anahtarlari
 * sayfalardakiyle ayni; onbellek paylasilir, ek istek gitmez.
 */
export function useZincirKaynaklari(userEmail) {
  const sorgu = (anahtar, entity) => useQuery({
    queryKey: [anahtar, userEmail],
    queryFn: () => db.entities[entity].filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });
  const priceRanges = sorgu('trendyolPriceRanges', 'TrendyolPriceRange');
  const advantageTags = sorgu('advantageProductTags', 'AdvantageProductTag');
  const flashProducts = sorgu('flashProducts', 'FlashProduct');
  const plusTariffs = sorgu('plusProductCommissionTariffs', 'PlusProductCommissionTariff');
  const campaigns = sorgu('campaigns', 'Campaign');
  const campaignProducts = sorgu('campaignProducts', 'CampaignProduct');
  const ownDiscounts = sorgu('trendyolOwnDiscounts', 'TrendyolOwnDiscount');
  const hepsi = [priceRanges, advantageTags, flashProducts, plusTariffs, campaigns, campaignProducts, ownDiscounts];
  return {
    kaynaklar: {
      priceRanges: priceRanges.data || [],
      advantageTags: advantageTags.data || [],
      flashProducts: flashProducts.data || [],
      plusTariffs: plusTariffs.data || [],
      campaigns: campaigns.data || [],
      campaignProducts: campaignProducts.data || [],
      ownDiscounts: ownDiscounts.data || [],
    },
    hazir: hepsi.every((q) => q.isFetched),
  };
}
