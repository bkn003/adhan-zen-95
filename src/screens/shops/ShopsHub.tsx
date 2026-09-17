import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMyShop } from '@/utils/shopApi';
import { ShopsScreen } from './ShopsScreen';
import { ShopDetailsScreen, type CartLine } from './ShopDetailsScreen';
import { ShopCheckoutScreen } from './ShopCheckoutScreen';
import { MyOrdersScreen } from './MyOrdersScreen';
import { SellerApplyScreen } from './SellerApplyScreen';
import { ShopManagerScreen } from './ShopManagerScreen';

type View =
  | { name: 'list' }
  | { name: 'shop'; shopId: string }
  | { name: 'checkout'; shopId: string; lines: CartLine[]; deliveryAvailable: boolean }
  | { name: 'orders' }
  | { name: 'apply' }
  | { name: 'manage' };

export const ShopsHub = () => {
  const [view, setView] = useState<View>({ name: 'list' });
  const { isSignedIn } = useAuth();

  const myShop = useQuery({ queryKey: ['my-shop'], queryFn: getMyShop, enabled: isSignedIn });
  const shop = myShop.data ?? null;

  const back = () => setView({ name: 'list' });

  if (view.name === 'shop') {
    return (
      <ShopDetailsScreen
        shopId={view.shopId}
        onBack={back}
        onCheckout={(shopId, lines) =>
          setView({ name: 'checkout', shopId, lines, deliveryAvailable: true })
        }
      />
    );
  }

  if (view.name === 'checkout') {
    return (
      <ShopCheckoutScreen
        shopId={view.shopId}
        lines={view.lines}
        deliveryAvailable={view.deliveryAvailable}
        onBack={() => setView({ name: 'shop', shopId: view.shopId })}
        onDone={() => setView({ name: 'orders' })}
      />
    );
  }

  if (view.name === 'orders') return <MyOrdersScreen onBack={back} />;

  if (view.name === 'apply') {
    return <SellerApplyScreen onBack={back} onApplied={() => myShop.refetch().then(back)} existing={shop} />;
  }

  if (view.name === 'manage') {
    if (shop && shop.status === 'approved') {
      return <ShopManagerScreen shop={shop} onBack={back} />;
    }
    return <SellerApplyScreen onBack={back} onApplied={back} existing={shop} />;
  }

  return (
    <ShopsScreen
      onOpenShop={(shopId) => setView({ name: 'shop', shopId })}
      onApply={() => setView({ name: 'apply' })}
      onMyOrders={() => setView({ name: 'orders' })}
      onManageShop={() => setView({ name: 'manage' })}
      hasShop={!!shop}
    />
  );
};
