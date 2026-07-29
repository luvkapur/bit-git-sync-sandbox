import React from 'react';
import { render, screen } from '@testing-library/react';
import { NebulaTheme } from './nebula-theme.js';
import { type AuraThemeOverrides, type ThemeMode, useTheme, useThemeController } from '@luvktest/test.aura-theme'; 
import classNames from 'classnames'; 

vi.mock('@luvktest/test.aura-theme', async () => {
  const originalModule = await vi.importActual<typeof import('@luvktest/test.aura-theme')>('@luvktest/test.aura-theme');
  return {
    ...originalModule,
    AuraTheme: vi.fn(({ children, overrides, initialTheme, className }: { 
        children: React.ReactNode; 
        overrides?: AuraThemeOverrides; 
        initialTheme?: ThemeMode; 
        className?: string; 
    }) => (
      <div data-testid="aura-theme" className={classNames('mock-aura-theme', className)} data-initialtheme={initialTheme} data-overrides={JSON.stringify(overrides || {})}>
        {children}
      </div>
    )),
    useTheme: vi.fn(() => ({ 
        colors: { 
            primary: { default: '#000000' }, 
            surface: { background: '#111111' }, 
            text: { primary: '#FFFFFF', secondary: '#CCCCCC', inverse: '#000000', statusInfo: '#5555FF' }, 
            status: { 
                positive: { default: '#00FF00' },
                negative: { default: '#FF0000' },
                warning: { default: '#FFA500' },
                info: { default: '#0000FF' },
            },
            border: { default: '#333333'}
        }, 
        typography: { fontFamily: 'Arial' },
        borders: { 
            radius: { container: '0px', small: '2px', medium: '4px', large: '8px', circle: '50%' },
            default: { width: '1px', style: 'solid'}
        },
        spacing: { x4: '4px', small: '8px', default: '16px', large: '24px', xl: '32px', x8: '48px'},
        shadows: { small: 's', medium: 'm', large: 'l'},
        interactions: { cursor: { pointer: 'pointer', disabled: 'not-allowed'}}
    })),
    useThemeController: vi.fn(() => ({ 
        themeMode: 'dark' as ThemeMode,
        toggleTheme: vi.fn(),
        setThemeMode: vi.fn(),
    })),
  };
});


describe('NebulaTheme', () => {
  const TestComponent: React.FC = () => {
    const theme = useTheme(); 
    const { themeMode } = useThemeController(); 
    return (
      <div>
        <p data-testid="font-family" style={{ fontFamily: theme.typography?.fontFamily }}>Hello Nebula</p>
        <p data-testid="primary-color" style={{ color: theme.colors?.primary?.default }}>Primary Color Text</p>
        <p data-testid="theme-mode">Mode: {themeMode}</p>
      </div>
    );
  };

  it('should render children and apply default Nebula tokens to AuraTheme', () => {
    render(
      <NebulaTheme>
        <TestComponent />
      </NebulaTheme>
    );

    const auraThemeDiv = screen.getByTestId('aura-theme');
    expect(auraThemeDiv).toBeInTheDocument();
    expect(screen.getByText('Hello Nebula')).toBeInTheDocument();

    expect(auraThemeDiv).toHaveAttribute('data-initialtheme', 'dark');

    const overrides = JSON.parse(auraThemeDiv.getAttribute('data-overrides') || '{}');
    expect(overrides.colors.primary.default).toBe('#C48CFF'); 
    expect(overrides.typography.fontFamily).toBe("'Inter', sans-serif");
    expect(overrides.colors.surface.primary).toBe('#22212C');
    expect(overrides.colors.border.default).toBe('#22212C');
    expect(overrides.colors.status.positive.default).toBe('#22D3EE'); // Changed from success to positive
    expect(overrides.borders.radius.container).toBe('8px');
  });

  it('should pass custom runtime overrides to AuraTheme, merged with Nebula defaults', () => {
    const runtimeOverrides: AuraThemeOverrides = {
      colors: {
        primary: {
          default: '#ABCDEF', 
        },
        text: { 
          primary: '#DDDDDD'
        }
      },
      typography: {
        fontFamily: 'Impact, sans-serif',
      },
    };

    render(
      <NebulaTheme overrides={runtimeOverrides}>
        <TestComponent />
      </NebulaTheme>
    );

    const auraThemeDiv = screen.getByTestId('aura-theme');
    const finalOverrides = JSON.parse(auraThemeDiv.getAttribute('data-overrides') || '{}');

    expect(finalOverrides.colors.primary.default).toBe('#ABCDEF');
    expect(finalOverrides.typography.fontFamily).toBe('Impact, sans-serif');
    expect(finalOverrides.colors.text.primary).toBe('#DDDDDD'); 
    expect(finalOverrides.colors.surface.primary).toBe('#22212C'); 
    expect(finalOverrides.borders.radius.container).toBe('8px'); 
  });

  it('should allow Aura initialTheme to be set via NebulaTheme props', () => {
    render(
      <NebulaTheme initialTheme="light">
        <TestComponent />
      </NebulaTheme>
    );
    const auraThemeDiv = screen.getByTestId('aura-theme');
    expect(auraThemeDiv).toHaveAttribute('data-initialtheme', 'light');
  });


  it('should apply CSS variables from final tokens to its own root div', () => {
    const { container } = render(
      <NebulaTheme>
        <div>Test Content</div>
      </NebulaTheme>
    );
    const nebulaRootDiv = container.firstChild as HTMLElement;
    expect(nebulaRootDiv).toHaveStyle('--colors-primary-default: #C48CFF');
    expect(nebulaRootDiv).toHaveStyle("--typography-font-family: 'Inter', sans-serif");
    expect(nebulaRootDiv).toHaveStyle('--colors-surface-primary: #22212C');
    expect(nebulaRootDiv).toHaveStyle('--colors-border-default: #22212C');
    expect(nebulaRootDiv).toHaveStyle('--colors-status-positive-default: #22D3EE'); // Changed from success to positive
    expect(nebulaRootDiv).toHaveStyle('--borders-radius-container: 8px');
    expect(nebulaRootDiv).toHaveStyle('--colors-secondary-default: #03DAC6'); 
  });

  it('should use runtime overridden values for CSS variables on its root div', () => {
    const runtimeOverrides: AuraThemeOverrides = {
      colors: { primary: { default: '#FF00FF' } },
      typography: { fontFamily: 'Georgia, serif' },
      borders: { radius: { container: '15px' } }
    };
    const { container } = render(
      <NebulaTheme overrides={runtimeOverrides}>
        <div>Test Content</div>
      </NebulaTheme>
    );
    const nebulaRootDiv = container.firstChild as HTMLElement;
    expect(nebulaRootDiv).toHaveStyle('--colors-primary-default: #FF00FF');
    expect(nebulaRootDiv).toHaveStyle('--typography-font-family: Georgia, serif');
    expect(nebulaRootDiv).toHaveStyle('--borders-radius-container: 15px');
    expect(nebulaRootDiv).toHaveStyle('--colors-surface-primary: #22212C'); // This comes from defaultNebulaTokens
  });

  it('should pass className to its root div', () => {
    const customClass = "my-custom-nebula-class";
    render(<NebulaTheme className={customClass}><div /></NebulaTheme>);
    const auraThemeMockElement = screen.getByTestId('aura-theme');
    // NebulaTheme renders a div that wraps AuraTheme. We're checking the class on NebulaTheme's root.
    const nebulaRootDiv = auraThemeMockElement.parentElement; 
    expect(nebulaRootDiv).toHaveClass(customClass);
    expect(nebulaRootDiv).toHaveClass('nebula-theme-root'); 
  });
});