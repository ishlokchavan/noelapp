import { View, Text } from 'react-native';
import { Coins } from 'lucide-react-native';
import type { CreditAward } from '@/types/listing';
import { credits } from '@/lib/format';

/** The signature Noel hook: commission you'd have paid, returned as credits. */
export function CreditBadge({ award, large = false }: { award: CreditAward; large?: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full bg-accent ${large ? 'px-4 py-2' : 'px-3 py-1.5'}`}
    >
      <Coins size={large ? 18 : 14} color="#ffffff" />
      <Text className={`font-semibold text-white ${large ? 'text-base' : 'text-xs'}`}>
        +{credits(award.credits)} credits
      </Text>
    </View>
  );
}
