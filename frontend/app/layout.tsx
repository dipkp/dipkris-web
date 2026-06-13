import './globals.css';

export const metadata = {
  title: 'Kosmi Rave Clone',
  description: 'Watch party platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `var global = window; window.process = { env: { NODE_ENV: 'production' } };` }} />
      </head>
      <body className="bg-gray-950 text-white min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
