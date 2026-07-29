import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Paragraph } from '@luvktest/test.typography.paragraph';
import { Heading } from '@luvktest/test.typography.heading';
import { SectionLayout } from './section-layout.js';

const commonContainerStyle: React.CSSProperties = {
  padding: 'var(--spacing-large) 0', // Add some vertical padding for visual separation of sections
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  borderRadius: 'var(--borders-radius-medium)',
  objectFit: 'cover',
  maxHeight: '400px', // To prevent overly large images in compositions
  display: 'block',
  margin: 'var(--spacing-default) 0',
};

export const FullFeaturedSectionLayout = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={commonContainerStyle}>
        <SectionLayout
          title="Explore Our Innovations"
          subtitle="Cutting-Edge Solutions for Modern Challenges"
          caption="Discover how our latest advancements are shaping the future. We are committed to pushing boundaries and delivering excellence in every project."
        >
          <Paragraph>
            Welcome to a showcase of our groundbreaking work. This section highlights the key features and benefits of our new platform. We've meticulously designed every aspect to provide an unparalleled user experience. Dive in to learn more about the technology that powers our solutions and the impact it has on industries worldwide.
          </Paragraph>
          <img
            src="https://images.unsplash.com/photo-1653897221847-43eac640ddf8?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWMlMjBsaW5lc3xlbnwxfDB8fGJsdWV8MTc0OTc3NjkxOXww&ixlib=rb-4.1.0"
            alt="Abstract blue geometric lines"
            style={imageStyle}
          />
          <Paragraph>
            Our approach combines innovative design with robust engineering, ensuring that our products are not only aesthetically pleasing but also reliable and scalable. We believe in the power of collaboration and continuous improvement, which is reflected in the quality and performance of our offerings. Join us on this journey of discovery and see what's possible.
          </Paragraph>
        </SectionLayout>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const TextHeavySectionLayout = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={commonContainerStyle}>
        <SectionLayout
          title="Deep Dive into Content Strategy"
          subtitle="Crafting Narratives that Resonate"
        >
          <Heading level={3} visualLevel={5}>Understanding Your Audience</Heading>
          <Paragraph>
            Effective content strategy begins with a profound understanding of your target audience. This involves more than just demographics; it's about comprehending their needs, motivations, and pain points. By creating detailed personas, we can tailor messages that speak directly to them, fostering engagement and building trust.
          </Paragraph>
          <Paragraph>
            The next step is to define clear objectives for your content. Are you looking to increase brand awareness, generate leads, educate your customers, or drive sales? Each goal requires a different type of content and a unique approach to distribution. Aligning your content with these objectives ensures that every piece serves a purpose and contributes to your overall strategy.
          </Paragraph>
          <Heading level={3} visualLevel={5}>Content Creation and Distribution</Heading>
          <Paragraph>
            Once the groundwork is laid, the focus shifts to creating high-quality, valuable content. This could range from blog posts and articles to videos, infographics, and podcasts. The key is to provide information that is relevant, engaging, and shareable. Consistency in voice and messaging across all platforms is crucial for building a cohesive brand identity.
          </Paragraph>
          <Paragraph>
            Distribution is just as important as creation. Identifying the right channels to reach your audience—be it social media, email newsletters, SEO, or paid advertising—maximizes the impact of your content. Analyzing performance metrics and iterating on your strategy will lead to continuous improvement and better results over time.
          </Paragraph>
        </SectionLayout>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const MinimalContentSectionLayout = () => (
  <MemoryRouter>
    <AuraTheme>
      <div style={commonContainerStyle}>
        <SectionLayout>
          <Heading level={2} visualLevel={3} style={{ textAlign: 'center', color: 'var(--colors-text-interactive-default)' }}>
            Simplicity is the Ultimate Sophistication.
          </Heading>
          <Paragraph style={{ textAlign: 'center', fontSize: 'var(--typography-sizes-body-large)' }}>
            This section demonstrates the layout with minimal header elements, focusing purely on the child content.
            Even a single, impactful message can be effectively presented.
          </Paragraph>
          <img
            src="https://images.unsplash.com/photo-1633538475696-a93e30810e09?ixid=M3w3MDc2NDF8MHwxfHNlYXJjaHw3fHxhYnN0cmFjdCUyMGJsdWUlMjBnZW9tZXRyaWMlMjBsaW5lc3xlbnwxfDB8fGJsdWV8MTc0OTc3NjkxOXww&ixlib=rb-4.1.0"
            alt="Dark blue abstract pattern"
            style={{ ...imageStyle, maxHeight: '300px', marginTop: 'var(--spacing-large)' }}
          />
        </SectionLayout>
      </div>
    </AuraTheme>
  </MemoryRouter>
);

export const SectionLayoutWithCustomStyling = () => (
  <MemoryRouter>
    <AuraTheme>
      <style>{`
        .custom-section-background {
          background-color: var(--colors-surface-secondary);
          border-radius: var(--borders-radius-large);
          box-shadow: var(--effects-shadows-medium);
        }
        .custom-section-background .${'section-layout_title__+([a-zA-Z0-9_-]{5})'} { /* Example targeting an internal class if needed, but prefer direct child styling */
          color: var(--colors-primary-default) !important; /* Ensure high specificity if overriding */
        }
        .custom-section-background .${'section-layout_caption__+([a-zA-Z0-9_-]{5})'} {
          color: var(--colors-text-interactive-default) !important;
        }
      `}</style>
      <div style={commonContainerStyle}>
        <SectionLayout
          title="Custom Styled Section"
          caption="This section uses a custom CSS class to alter its appearance, showcasing background and text color modifications."
          className="custom-section-background"
        >
          <Paragraph>
            By applying a custom class name, <code>custom-section-background</code>, we can override or extend the default styles of the SectionLayout. This composition demonstrates a different background color (using <code>--colors-surface-secondary</code>), a border radius, and a box shadow.
          </Paragraph>
          <Paragraph>
            The title and caption colors have also been customized using more specific CSS rules targeting them within the custom class. This illustrates the flexibility of the component when integrating with bespoke design requirements.
          </Paragraph>
        </SectionLayout>
      </div>
    </AuraTheme>
  </MemoryRouter>
);