import React from 'react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuraTheme } from '@luvktest/test.aura-theme';
import { Link, useLocation, useParams, useNavigate, useSearchQuery } from './link.js';

const DemoPageContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-primary)', borderRadius: 'var(--borders-radius-medium)', marginBlockEnd: 'var(--spacing-large)' }}>
    <h3 style={{ fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)', marginTop: 0, marginBottom: 'var(--spacing-default)' }}>{title}</h3>
    {children}
  </div>
);

const HooksDisplay: React.FC<{ path?: string }> = ({ path }) => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useSearchQuery();

  return (
    <div style={{
      fontFamily: 'var(--typography-font-family)',
      color: 'var(--colors-text-secondary)',
      backgroundColor: 'var(--colors-surface-secondary)',
      padding: 'var(--spacing-default)',
      borderRadius: 'var(--borders-radius-small)',
      marginTop: 'var(--spacing-default)',
      fontSize: 'var(--typography-sizes-body-small)'
    }}>
      <p><strong>Current Path (useLocation):</strong> {location.pathname}</p>
      <p><strong>Path Params (useParams from '{path || "/"}'):</strong> {JSON.stringify(params)}</p>
      <p><strong>Search Query (useSearchQuery):</strong> {searchQuery.toString()}</p>
      <div style={{ marginTop: 'var(--spacing-small)', display: 'flex', gap: 'var(--spacing-small)'}}>
        <button
            onClick={() => navigate(-1)}
            style={{ padding: 'var(--spacing-small)', backgroundColor: 'var(--colors-secondary-default)', border: '1px solid var(--colors-border-default)', borderRadius: 'var(--borders-radius-small)', cursor: 'var(--interactions-cursor-pointer)'}}
        >
            Go Back (useNavigate)
        </button>
        <button
            onClick={() => setSearchQuery({ q: 'test', page: '1' })}
            style={{ padding: 'var(--spacing-small)', backgroundColor: 'var(--colors-secondary-default)', border: '1px solid var(--colors-border-default)', borderRadius: 'var(--borders-radius-small)', cursor: 'var(--interactions-cursor-pointer)'}}
        >
            Set Search Query
        </button>
      </div>
    </div>
  );
};

const PageOne = () => <DemoPageContainer title="Page One"><p>This is Page One. Try the links above.</p><HooksDisplay path="/page-one" /></DemoPageContainer>;
const PageTwo = () => <DemoPageContainer title="Page Two (ID: {id})"><p>This is Page Two. You can see the ID from the URL in the params display below.</p><HooksDisplay path="/page-two/:id" /></DemoPageContainer>;
const PageWithQuery = () => <DemoPageContainer title="Page with Query Params"><p>This page demonstrates query parameters.</p><HooksDisplay path="/page-with-query" /></DemoPageContainer>;


export const BasicInternalLink = () => {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuraTheme>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
          <DemoPageContainer title="Internal Links">
            <Link href="/page-one">Go to Page One</Link>
            <br />
            <Link href="/page-two/123">Go to Page Two (ID: 123)</Link>
            <br />
            <Link href="/page-with-query?source=link">Go to Page with Query</Link>
          </DemoPageContainer>
          <Routes>
            <Route path="/page-one" element={<PageOne />} />
            <Route path="/page-two/:id" element={<PageTwo />} />
            <Route path="/page-with-query" element={<PageWithQuery />} />
            <Route path="/" element={<DemoPageContainer title="Home"><p>Welcome! Click the links to navigate.</p><HooksDisplay path="/" /></DemoPageContainer>} />
          </Routes>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const ExternalLinks = () => {
  const handleExternalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent actual navigation for demo
    alert('External link clicked! Href: ' + e.currentTarget.href);
  };

  return (
    <AuraTheme>
      <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
        <DemoPageContainer title="External Links">
          <Link href="https://bit.dev">
            External Link (bit.dev - default target: _blank)
          </Link>
          <br />
          <Link href="https://google.com" external>
            External Link (google.com - explicit external, default target: _blank)
          </Link>
          <br />
          <Link href="https://bing.com" target="_self">
            External Link (bing.com - target: _self)
          </Link>
          <br />
          <Link href="https://example.com" external onClick={handleExternalClick}>
            External Link with onClick (prevents navigation)
          </Link>
        </DemoPageContainer>
      </div>
    </AuraTheme>
  );
};

export const LinkWithCustomStylingAndProps = () => {
  return (
    <MemoryRouter>
      <AuraTheme>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
          <DemoPageContainer title="Customized Links">
            <Link
              href="/custom"
              className="custom-link-style"
              onClick={() => alert('Custom styled link clicked!')}
              target="_blank" // Technically for internal links, target is usually not _blank but for demo
              rel="noopener"
            >
              Internal Link with custom class, onClick, target, and rel
            </Link>
            <style>{`
              .custom-link-style {
                font-weight: var(--typography-font-weight-bold);
                color: var(--colors-status-positive-default) !important; /* Example override */
                padding: var(--spacing-small);
                border: 1px solid var(--colors-border-interactive-default);
                border-radius: var(--borders-radius-small);
              }
              .custom-link-style:hover {
                background-color: var(--colors-status-positive-subtle);
                text-decoration: none;
              }
            `}</style>
          </DemoPageContainer>
          <Routes>
            <Route path="/custom" element={<DemoPageContainer title="Custom Page"><p>Reached via custom link.</p></DemoPageContainer>} />
          </Routes>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

export const UsingReExportedHooks = () => {
  return (
    <MemoryRouter initialEntries={['/user/test-user/profile?tab=settings']}>
      <AuraTheme>
        <div style={{ padding: 'var(--spacing-large)', backgroundColor: 'var(--colors-surface-background)' }}>
            <DemoPageContainer title="React Router Hooks Demo">
                <p style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)'}}>
                    Navigate to different example routes to see the hooks in action.
                </p>
                <nav style={{ marginBottom: 'var(--spacing-default)', display: 'flex', gap: 'var(--spacing-default)'}}>
                    <Link href="/user/alpha/dashboard">User Alpha Dashboard</Link>
                    <Link href="/user/beta/profile?view=simple">User Beta Profile</Link>
                    <Link href="/product/123/details">Product 123 Details</Link>
                </nav>
                <Outlet /> {/* This will render the matched Route component */}
            </DemoPageContainer>

            <Routes>
                <Route path="/user/:userId/dashboard" element={<HooksDisplayWrapper path="/user/:userId/dashboard" />} />
                <Route path="/user/:userId/profile" element={<HooksDisplayWrapper path="/user/:userId/profile" />} />
                <Route path="/product/:productId/details" element={<HooksDisplayWrapper path="/product/:productId/details" />} />
                <Route path="*" element={<HooksDisplayWrapper path="Initial or unmatched path" />} />
            </Routes>
        </div>
      </AuraTheme>
    </MemoryRouter>
  );
};

const HooksDisplayWrapper: React.FC<{path: string}> = ({ path }) => {
    return (
        <div style={{
            border: `1px solid var(--colors-border-default)`,
            padding: 'var(--spacing-default)',
            borderRadius: 'var(--borders-radius-medium)',
            backgroundColor: 'var(--colors-surface-secondary)'
        }}>
            <h4 style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-primary)', marginTop: 0}}>Hooks Information for this Route:</h4>
            <HooksDisplay path={path} />
        </div>
    );
};