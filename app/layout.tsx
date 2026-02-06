import './globals.css';
import Script from 'next/script'; // Import Script component

export const metadata = {
  title: 'CC.AI',
  description: 'A Chinese learning site built with Next.js, Flask.py, and Puter.js.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        {children}
        {/* Add Puter JS script */}
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      </body>
    </html>
  )
}
