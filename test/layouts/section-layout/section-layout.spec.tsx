import { render } from '@testing-library/react';
import { SectionLayout } from './section-layout.js';
import styles from './section-layout.module.scss';

describe('SectionLayout', () => {
  it('should render children within the content wrapper', () => {
    const { container } = render(
      <SectionLayout>
        <div data-testid="child">Hello, world!</div>
      </SectionLayout>
    );

    const contentWrapper = container.querySelector(`.${styles.contentWrapper}`);
    expect(contentWrapper).toBeInTheDocument();

    const childElement = container.querySelector('[data-testid="child"]');
    expect(childElement).toBeInTheDocument();
    expect(contentWrapper?.contains(childElement)).toBe(true);
  });

  it('should render title, subtitle, and caption when provided', () => {
    const titleText = 'Section Title';
    const subtitleText = 'Section Subtitle';
    const captionText = 'Section Caption';

    const { container } = render(
      <SectionLayout title={titleText} subtitle={subtitleText} caption={captionText}>
        <div>Content</div>
      </SectionLayout>
    );

    const titleElement = container.querySelector(`.${styles.title}`);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent(titleText);

    const subtitleElement = container.querySelector(`.${styles.subtitle}`);
    expect(subtitleElement).toBeInTheDocument();
    expect(subtitleElement).toHaveTextContent(subtitleText);

    const captionElement = container.querySelector(`.${styles.caption}`);
    expect(captionElement).toBeInTheDocument();
    expect(captionElement).toHaveTextContent(captionText);
  });

  it('should apply a custom class name when provided', () => {
    const customClassName = 'custom-section';
    const { container } = render(
      <SectionLayout className={customClassName}>
        <div>Content</div>
      </SectionLayout>
    );

    const sectionLayoutElement = container.querySelector(`.${styles.sectionLayout}`) as HTMLElement;
    expect(sectionLayoutElement).toBeInTheDocument();
    expect(sectionLayoutElement.classList.contains(customClassName)).toBe(true);
  });
});