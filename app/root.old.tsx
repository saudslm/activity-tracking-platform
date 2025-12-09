// ============================================
// FILE: app/root.tsx
// ============================================
import {
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { 
  MantineProvider, 
  ColorSchemeScript, 
  createTheme, 
  MantineColorsTuple 
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";

export const meta: MetaFunction = () => {
  return [
    { title: "TimeTrack - Smart Time Tracking" },
    { name: "description", content: "Privacy-first time tracking for modern teams" },
  ];
};

// Notion-inspired color palette
const notionGray: MantineColorsTuple = [
  '#f7f6f3',
  '#e9e9e7',
  '#d3d1cb',
  '#bcb8ae',
  '#a8a29a',
  '#9b948c',
  '#978f85',
  '#847c72',
  '#776f66',
  '#6a6157',
];

// Notion-like theme
const theme = createTheme({
  primaryColor: 'dark',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, monospace',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontWeight: '600',
  },
  colors: {
    notionGray,
  },
  defaultRadius: 'md',
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Button: {
      defaultProps: {
        fw: 500,
      },
      styles: {
        root: {
          transition: 'all 0.15s ease',
        },
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#ffffff' }}>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Oops! Something went wrong</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  );
}