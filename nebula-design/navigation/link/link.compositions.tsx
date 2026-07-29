import React from 'react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Link, useLocation, useParams, useNavigate, useSearchQuery } from './link.js';

// Helper component for demo pages
const DemoPageContainer: React.FC<{ title: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, children, style }) => (
  <div style={{
    padding: 'var(--spacing-l)',
    backgroundColor: 'var(--colors-surface-primary)',
    borderRadius: 'var(--borders-radius-container)',
    marginBlockEnd: 'var(--spacing-l)',
    color: 'var(--colors-text-default)',
    fontFamily: 'var(--typography-font-family)',
    ...style
  }}>
    <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-m)', color: 'var(--colors-text-default)', fontFamily: 'var(--typography-font-family)' /* Assuming headings use this var and NebulaTheme handles 'Inter' override */ }}>{title}</h3>
    {children}
  </div>
);

const PageOne = () => <DemoPageContainer title="Page One"><p>This is Page One, accessed via a Nebula-styled internal link.</p></DemoPageContainer>;
const PageTwo = () => <DemoPageContainer title="Page Two"><p>Welcome to Page Two! Navigation was handled by a Nebula-styled link.</p></DemoPageContainer>;

export const InternalLinksWithNebulaTheme = () => {
  return (
    <MemoryRouter initialEntries={['/']}>
      <NebulaTheme>
        <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '250px' }}>
          <nav style={{ marginBottom: 'var(--spacing-l)', display: 'flex', gap: 'var(--spacing-m)' }}>
            <Link href="/page-one">Nebula Link to Page One</Link>
            <Link href="/page-two">Nebula Link to Page Two</Link>
          </nav>
          <Routes>
            <Route path="/page-one" element={<PageOne />} />
            <Route path="/page-two" element={<PageTwo />} />
            <Route path="/" element={
              <DemoPageContainer title="Nebula Link Demo - Home">
                <p>These links are styled according to the Nebula theme. Click them to navigate internally.</p>
              </DemoPageContainer>
            } />
          </Routes>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};

export const ExternalLinksWithNebulaTheme = () => {
  const handleExternalClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent actual navigation for demonstration purposes
    alert('Nebula external link clicked! Navigation prevented. Href: ' + e.currentTarget.href);
  };

  return (
    <NebulaTheme>
      <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '250px' }}>
        <DemoPageContainer title="External Links (Nebula Styled)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)'}}>
            <Link href="https://bit.cloud">
              Visit Bit.cloud (Nebula Style, opens in new tab by default)
            </Link>
            <Link href="https://components.ai" external>
              Explore Components.AI (Nebula Style, explicit external)
            </Link>
            <Link href="https://mdxjs.com" target="_self">
              MDXjs Docs (Nebula Style, opens in same tab)
            </Link>
            <Link href="https://example.com" external onClick={handleExternalClick}>
              Custom Click Handler Link (Nebula Style, alerts on click)
            </Link>
          </div>
        </DemoPageContainer>
      </div>
    </NebulaTheme>
  );
};

const HooksInfoDisplay: React.FC<{ routeContext?: string }> = ({ routeContext }) => {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useSearchQuery();

  return (
    <div style={{
      fontFamily: 'var(--typography-font-family)',
      color: 'var(--colors-text-secondary)',
      backgroundColor: 'var(--colors-surface-secondary)',
      padding: 'var(--spacing-m)',
      borderRadius: 'var(--borders-radius-medium)',
      marginTop: 'var(--spacing-m)',
      fontSize: '14px' // Hardcoded as no specific small body text size token in Nebula list
    }}>
      <p><strong>Route Context:</strong> {routeContext || 'N/A'}</p>
      <p><strong>Current Path (useLocation):</strong> {location.pathname}</p>
      <p><strong>Path Params (useParams):</strong> {Object.keys(params).length > 0 ? JSON.stringify(params) : 'None'}</p>
      <p><strong>Search Query (useSearchQuery):</strong> {searchQuery.toString() || 'None'}</p>
      <div style={{ marginTop: 'var(--spacing-m)', display: 'flex', gap: 'var(--spacing-s)'}}>
        <button
            onClick={() => navigate(-1)}
            style={{
              padding: 'var(--spacing-s) var(--spacing-m)',
              backgroundColor: 'var(--colors-secondary-default)',
              color: 'var(--colors-text-inverse)',
              border: '1px solid var(--colors-border-interactive)',
              borderRadius: 'var(--borders-radius-small)',
              cursor: 'var(--interactions-cursor-pointer)',
              fontFamily: 'var(--typography-font-family)'
            }}
        >
            Go Back (useNavigate)
        </button>
        <button
            onClick={() => setSearchQuery({ theme: 'nebula', example: 'hooks' })}
            style={{
              padding: 'var(--spacing-s) var(--spacing-m)',
              backgroundColor: 'var(--colors-secondary-default)',
              color: 'var(--colors-text-inverse)',
              border: '1px solid var(--colors-border-interactive)',
              borderRadius: 'var(--borders-radius-small)',
              cursor: 'var(--interactions-cursor-pointer)',
              fontFamily: 'var(--typography-font-family)'
            }}
        >
            Set Search Query
        </button>
      </div>
    </div>
  );
};

const UserPage = () => <DemoPageContainer title="User Profile"><p>Details for user will be displayed here, using params.</p><HooksInfoDisplay routeContext="User Profile Page (/user/:userId)" /></DemoPageContainer>;
const ItemPage = () => <DemoPageContainer title="Item Details"><p>Information about the item, based on ID from URL.</p><HooksInfoDisplay routeContext="Item Details Page (/item/:itemId)" /></DemoPageContainer>;
const QueryPage = () => <DemoPageContainer title="Query Demo Page"><p>This page demonstrates search query parameters.</p><HooksInfoDisplay routeContext="Query Demo Page (/query-test)" /></DemoPageContainer>;


export const ReExportedHooksWithNebulaTheme = () => {
  return (
    <MemoryRouter initialEntries={['/user/coder42?session=active']}>
      <NebulaTheme>
        <div style={{ padding: 'var(--spacing-l)', backgroundColor: 'var(--colors-surface-background)', minHeight: '450px' }}>
            <DemoPageContainer title="Nebula Link & Re-exported Hooks" style={{marginBottom: 'var(--spacing-l)'}}>
                <p style={{fontFamily: 'var(--typography-font-family)', color: 'var(--colors-text-default)'}}>
                    Use the Nebula-styled links below to navigate and observe how the re-exported React Router hooks capture information.
                </p>
                <nav style={{ marginBlock: 'var(--spacing-m) var(--spacing-l)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-m)'}}>
                    <Link href="/user/devsigner7">User: devsigner7</Link>
                    <Link href="/user/bitster?mode=edit">User: bitster (edit mode)</Link>
                    <Link href="/item/galaxy-pendant">Item: Galaxy Pendant</Link>
                    <Link href="/item/star-chart-nft?rarity=epic">Item: Star Chart NFT (epic)</Link>
                    <Link href="/query-test?filter=active&sort=newest">Query Test Page</Link>
                </nav>
                <Outlet />
            </DemoPageContainer>

            <Routes>
                <Route path="/user/:userId" element={<UserPage />} />
                <Route path="/item/:itemId" element={<ItemPage />} />
                <Route path="/query-test" element={<QueryPage />} />
                <Route path="*" element={<DemoPageContainer title="Page Not Found or Initial View"><p>The requested path was not found, or this is the initial view before navigation.</p><HooksInfoDisplay routeContext="Fallback/Initial" /></DemoPageContainer>} />
            </Routes>
        </div>
      </NebulaTheme>
    </MemoryRouter>
  );
};