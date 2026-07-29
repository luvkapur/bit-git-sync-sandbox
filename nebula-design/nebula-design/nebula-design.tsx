import React, { useState, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeToggler, type ThemeDefinition } from '@luvktest/nebula-design.actions.theme-toggler';
import { Card } from '@luvktest/nebula-design.content.card';
import { TextInput } from '@luvktest/nebula-design.inputs.text-input';
import { Heading } from '@luvktest/nebula-design.typography.heading';
import { Paragraph } from '@luvktest/nebula-design.typography.paragraph';
import { PageLayout } from '@luvktest/test.layouts.page-layout';
import { SectionLayout } from '@luvktest/test.layouts.section-layout';
import { Button } from '@luvktest/test.actions.button';
import { Link } from '@luvktest/test.navigation.link';
import { Logo } from '@luvktest/test.content.logo';
import classNames from 'classnames';
import styles from './nebula-design.module.scss';
import { useAppBrand } from './app-theme.js';

// Placeholder metrics data
const metricsStaticData = {
  buildTimeSaved: "40%",
  locReused: "95%",
  auraTokensCount: 250,
  novaOverridesCount: 25,
  get novaReusePercentage() {
    if (this.auraTokensCount === 0) return "100";
    return (( (this.auraTokensCount - this.novaOverridesCount) / this.auraTokensCount) * 100).toFixed(0);
  }
};

// Page Components
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <PageLayout pageTitle="Nebula Design Showcase" pageDescription="Explore Aura and Nova themes with Nebula Design.">
      <div className={classNames(styles.heroSection)}>
        <Heading level={1} visualLevel={1} className={styles.heroTitle}>Nebula Design Showcase</Heading>
        <Paragraph className={styles.heroParagraph}>
          Instantly switch between Aura and Nova themes, built on the same React components. Witness the power of composable design tokens and see how easily UI can adapt to different brand identities.
        </Paragraph>
        <Button variant="primary" size="large" onClick={() => navigate('/gallery')} className={styles.heroButton}>
          Explore the Demo
        </Button>
      </div>
      <SectionLayout title="What You&apos;ll See" subtitle="A Journey Through Theming Capabilities">
        <Paragraph>
          This demo application is designed to highlight the flexibility of a token-based design system. You can navigate through different sections:
        </Paragraph>
        <ul>
          <li><strong>Component Gallery:</strong> View various UI components and see how they adapt to theme changes in real-time.</li>
          <li><strong>Book a Workspace:</strong> A practical wizard scenario where you can switch themes mid-flow without losing your progress.</li>
          <li><strong>Metrics:</strong> Understand the efficiency gains, such as token overrides and code reuse, conceptually.</li>
        </ul>
        <Paragraph>
          Use the sticky theme toggler (☀️/🌙 and Aura/Nova) at the top-right to change themes at any point.
        </Paragraph>
      </SectionLayout>
    </PageLayout>
  );
};

const ComponentGalleryPage: React.FC = () => {
  const [textInputValue, setTextInputValue] = useState('');
  return (
    <PageLayout pageTitle="Component Gallery - Nebula Design" pageDescription="Showcase of UI components with Aura and Nova themes.">
      <SectionLayout title="Component Gallery" subtitle="See components adapt to the selected theme. Use the theme toggler!">
        <div className={styles.galleryGrid}>
          <Card title="Cards" variant="outlined" className={styles.galleryItemCard}>
            <Heading level={3}>Card Variants</Heading>
            <div className={styles.componentExampleContainer}>
              <Card title="Default Card" image="https://images.unsplash.com/photo-1581092335331-5e00ac65e934?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxkZXNpZ24lMjBzeXN0ZW0lMjB0aGVtaW5nfGVufDF8MHx8Ymx1ZXwxNzQ5NzgwMjUzfDA&ixlib=rb-4.1.0&w=300" imageAlt="Abstract design system image">
                <Paragraph>This is a default card. It provides a balanced presentation for content.</Paragraph>
              </Card>
              <Card title="Elevated Card" variant="elevated" image="https://images.unsplash.com/photo-1476357471311-43c0db9fb2b4?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwyfHxkZXNpZ24lMjBzeXN0ZW0lMjB0aGVtaW5nfGVufDF8MHx8Ymx1ZXwxNzQ5NzgwMjUzfDA&ixlib=rb-4.1.0&w=300" imageAlt="Smartphone UI design">
                <Paragraph>An elevated card stands out with more prominent shadow.</Paragraph>
                <span slot="footer"><Button variant="secondary" size="small">Learn More</Button></span>
              </Card>
              <Card title="Outlined Card" variant="outlined" interactive>
                <Paragraph>An outlined card offers a lighter visual style, useful for secondary content or when less emphasis is needed. This one is interactive.</Paragraph>
              </Card>
            </div>
          </Card>

          <Card title="Buttons" variant="outlined" className={styles.galleryItemCard}>
            <Heading level={3}>Button States & Styles</Heading>
            <div className={styles.componentExampleContainer}>
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="tertiary">Tertiary Button</Button>
              <Button variant="primary" disabled>Primary Disabled</Button>
              <Button variant="secondary" href="#example-link">Link Button</Button>
            </div>
          </Card>

          <Card title="Text Inputs" variant="outlined" className={styles.galleryItemCard}>
            <Heading level={3}>Input Fields</Heading>
             <div className={styles.componentExampleContainer}>
              <TextInput
                value={textInputValue}
                onChange={setTextInputValue}
                placeholder="Enter your name..."
                aria-label="Name Input"
              />
              <TextInput
                value="password123"
                onChange={() => {}}
                type="password"
                placeholder="Password"
                aria-label="Password Input"
              />
              <TextInput
                value="Disabled Field"
                onChange={() => {}}
                disabled
                aria-label="Disabled Input"
              />
            </div>
          </Card>

           <Card title="Typography" variant="outlined" className={styles.galleryItemCard}>
            <Heading level={3}>Headings & Paragraphs</Heading>
            <div className={styles.componentExampleContainer}>
              <Heading level={1}>Heading 1</Heading>
              <Heading level={2}>Heading 2</Heading>
              <Heading level={3}>Heading 3 (visual H5)</Heading>
              <Paragraph>This is a standard paragraph. It showcases the default text styling. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Paragraph>
              <Paragraph element="blockquote">This is a blockquote, styled as a paragraph, to emphasize a quote or citation within the text flow.</Paragraph>
            </div>
          </Card>
        </div>
      </SectionLayout>
    </PageLayout>
  );
};

type WizardStep = 1 | 2 | 3;
interface WizardFormData {
  service?: string;
  date?: string;
  time?: string;
}

const WizardPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [formData, setFormData] = useState<WizardFormData>({});

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => (prev + 1) as WizardStep);
    } else {
      // eslint-disable-next-line no-alert
      alert(`Booking Confirmed!\nService: ${formData.service}\nDate: ${formData.date}\nTime: ${formData.time}`);
      // Reset wizard or navigate away
      setCurrentStep(1);
      setFormData({});
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as WizardStep);
    }
  };

  const updateFormData = (field: keyof WizardFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <PageLayout pageTitle="Book a Workspace - Nebula Design" pageDescription="Multi-step wizard for booking a workspace.">
      <SectionLayout title="Book a Workspace" subtitle={`Step ${currentStep} of 3`}>
        <Card className={styles.wizardStep}>
          {currentStep === 1 && (
            <div>
              <Heading level={3}>Select Service</Heading>
              <div className={styles.formGroup}>
                {['Hot Desk', 'Meeting Room', 'Private Office'].map(service => (
                  <Button
                    key={service}
                    variant={formData.service === service ? 'primary' : 'secondary'}
                    onClick={() => updateFormData('service', service)}
                    style={{ marginRight: 'var(--spacing-default)', marginBottom: 'var(--spacing-default)'}}
                  >
                    {service}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div>
              <Heading level={3}>Select Date & Time</Heading>
              <div className={styles.formGroup}>
                <label htmlFor="booking-date">Date</label>
                <TextInput id="booking-date" value={formData.date || ''} onChange={val => updateFormData('date', val)} placeholder="YYYY-MM-DD" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="booking-time">Time</label>
                <TextInput id="booking-time" value={formData.time || ''} onChange={val => updateFormData('time', val)} placeholder="HH:MM (e.g., 14:30)" />
              </div>
            </div>
          )}
          {currentStep === 3 && (
            <div>
              <Heading level={3}>Confirm Booking</Heading>
              <Paragraph><strong>Service:</strong> {formData.service || 'Not selected'}</Paragraph>
              <Paragraph><strong>Date:</strong> {formData.date || 'Not selected'}</Paragraph>
              <Paragraph><strong>Time:</strong> {formData.time || 'Not selected'}</Paragraph>
              <Paragraph>Please review your selections. Click &quot;Confirm Booking&quot; to finalize.</Paragraph>
            </div>
          )}
          <div className={styles.wizardNavigation}>
            <Button variant="secondary" onClick={handlePrevious} disabled={currentStep === 1}>
              Previous
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={currentStep === 1 && !formData.service}>
              {currentStep === 3 ? 'Confirm Booking' : 'Next'}
            </Button>
          </div>
        </Card>
      </SectionLayout>
    </PageLayout>
  );
};

const MetricsPage: React.FC = () => {
  const metrics = useMemo(() => metricsStaticData, []);

  return (
    <PageLayout pageTitle="Metrics - Nebula Design" pageDescription="Conceptual metrics on theme overrides and reuse.">
      <SectionLayout title="Theme Metrics & Efficiency" subtitle="Conceptual insights into design system benefits.">
        <div className={styles.galleryGrid}> {/* Reusing galleryGrid for layout */}
          <Card title="Build Time Saved" variant="elevated">
            <Heading level={1} visualLevel={2}>{metrics.buildTimeSaved}</Heading>
            <Paragraph>Estimated reduction in development time by reusing themed components vs. building from scratch.</Paragraph>
          </Card>
          <Card title="Lines of Code (LOC) Reused" variant="elevated">
            <Heading level={1} visualLevel={2}>{metrics.locReused}</Heading>
            <Paragraph>Percentage of UI codebase reused across different themes and applications.</Paragraph>
          </Card>
          <Card title="Token Overrides (Nova vs Aura)" variant="elevated">
            <Paragraph>Aura (Base) Tokens: <strong>{metrics.auraTokensCount}</strong></Paragraph>
            <Paragraph>Nova (Derived) Overrides: <strong>{metrics.novaOverridesCount}</strong></Paragraph>
            <Heading level={1} visualLevel={2}>{metrics.novaReusePercentage}%</Heading>
            <Paragraph>Percentage of Aura tokens reused by Nova, showcasing efficient derivation.</Paragraph>
          </Card>
        </div>
        <Paragraph style={{marginTop: 'var(--spacing-double)', textAlign: 'center'}}>
          These metrics are conceptual and represent the typical advantages of a well-structured, token-based design system.
          Live computation of these metrics in a real-world scenario would involve build-time analysis and token introspection.
        </Paragraph>
      </SectionLayout>
    </PageLayout>
  );
};

const NotFoundPage: React.FC = () => (
  <PageLayout pageTitle="Page Not Found - Nebula Design">
    <SectionLayout title="404 - Page Not Found">
      <Paragraph>Oops! The page you are looking for does not exist or has been moved.</Paragraph>
      <Link href="/"><Button variant="primary">Go to Homepage</Button></Link>
    </SectionLayout>
  </PageLayout>
);


export function NebulaDesign() {
const { brand, setBrand } = useAppBrand(); 

  return (
    <div className={styles.appContainer}>
    <div className={styles.fixedThemeToggler}>
        <ThemeToggler
          defaultThemeName="aura"
          ariaLabelLight="Switch to dark theme"
          ariaLabelDark="Switch to light theme"
          themeSelectorAriaLabel="Select brand theme"
          brand={brand}
          onBrandChange={setBrand}
        />
      </div>
      <header className={styles.appHeader}>
        <Logo href="/" text="Nebula" altText="Nebula Design Showcase Logo" size={32} />
        <nav className={styles.appNav}>
          <Link href="/">Home</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/wizard">Book Workspace</Link>
          <Link href="/metrics">Metrics</Link>
        </nav>
      </header>
      <main className={styles.mainContent}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/gallery" element={<ComponentGalleryPage />} />
          <Route path="/wizard" element={<WizardPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className={styles.appFooter}>
        <Paragraph>© {new Date().getFullYear()} Nebula Design Showcase. Powered by Composable Design Tokens.</Paragraph>
      </footer>
    </div>
  );
}