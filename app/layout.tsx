import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar/Navbar'
import Container from '@/components/global/Container'
import Providers from './providers'
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next Storefront',
  description: 'A nifty store built with Next.js',
}

// prettier-ignore
export default function RootLayout({children,}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className}>
        {/* under the hood we use 
            react context api here 
            to pass down props classes and ifno
        */} 
        <Providers>
          <Navbar />
          <Container className='py-20'>{children}</Container>
        </Providers>
      </body>
    </html>
  )
}
