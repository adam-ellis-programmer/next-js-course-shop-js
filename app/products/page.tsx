// no query params when we first go to the products page so we set the default value
import ProductsContainer from '@/components/products/ProductsContainer'


// prettier-ignore
async function ProductsPage({searchParams}: {searchParams: { layout?: string; search?: string }}) {
  
  const layout = searchParams.layout || 'grid'
  const search = searchParams.search || '' // empty string as when we search, it will not work with undefined
  return (
    <>
      <ProductsContainer layout={layout} search={search} />
    </>
  )
}
export default ProductsPage
// 