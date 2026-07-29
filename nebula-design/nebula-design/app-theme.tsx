import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { AuraTheme }   from '@luvktest/test.aura-theme';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';

export type Brand = 'aura' | 'nebula' | 'nova';

const BrandCtx = createContext<{
  brand: Brand;
  setBrand: (b: Brand) => void;
} | null>(null);

export const useAppBrand = () => {
  const ctx = useContext(BrandCtx);
  if (!ctx) throw new Error('useAppBrand must be inside <AppTheme>');
  return ctx;
};

export const AppTheme = ({
  children,
  initialBrand = 'aura',
}: {
  children: ReactNode;
  initialBrand?: Brand;
}) => {
  const [brand, setBrand] = useState<Brand>(initialBrand);

  const Wrapper = useMemo(() => {
    switch (brand) {
      case 'nebula':
        return NebulaTheme;
      default:
        return AuraTheme;
    }
  }, [brand]);

  return (
    <BrandCtx.Provider value={{ brand, setBrand }}>
      <Wrapper /* initialTheme stays defaulted inside each wrapper */>
        {children}
      </Wrapper>
    </BrandCtx.Provider>
  );
};
