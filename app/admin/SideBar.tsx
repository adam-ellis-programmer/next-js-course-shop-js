'use client'
import { adminLinks } from '@/utils/links'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

function Sidebar() {
  // to match the link
  const pathname = usePathname()

  return (
    <aside>
      {adminLinks.map((link, i) => {
        const isActivePage = pathname === link.href
        // console.log('path',pathname)
        // console.log('lik',link.href)
        const variant = isActivePage ? 'default' : 'ghost'
        return (
          <Button
            asChild
            className='w-full mb-2 capitalize font-normal justify-start'
            variant={variant}
            key={i}
          >
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          </Button>
        )
      })}
    </aside>
  )
}
export default Sidebar
