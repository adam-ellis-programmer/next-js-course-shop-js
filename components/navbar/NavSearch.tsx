'use client'
import { Input } from '../ui/input'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { useState, useEffect } from 'react'

function NavSearch() {
  const searchParams = useSearchParams()
  const { replace } = useRouter()
  // controlled input - for copy / paste
  const [search, setSearch] = useState(
    searchParams.get('search')?.toString() || ''
  )
  const handleSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    console.log(params.toString())
    console.log(params)
    replace(`/products?${params.toString()}`)
  }, 300)

  // used to clear the form as we navigate to other pages
  useEffect(() => {
    if (!searchParams.get('search')) {
      setSearch('')
    }
  }, [searchParams.get('search')])
  return (
    <Input
      type='search'
      placeholder='search product...'
      className='max-w-xs dark:bg-muted '
      onChange={(e) => {
        setSearch(e.target.value)
        handleSearch(e.target.value)
      }}
      // or from url
      value={search}
    />
  )
}
export default NavSearch
