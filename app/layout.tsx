import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script'; // Import Script component

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        {children}
        {/* Add Puter JS script */}
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
      </body>
    </html>
  )
}
