import "./globals.css";

export const metadata = {
  title: "مُعلم",
  description: "Sales OS - مُعلم",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#CE1126" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="مُعلم" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}