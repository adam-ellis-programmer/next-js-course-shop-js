import db from '@/utils/db'
import { redirect } from 'next/navigation'

export const fetchFeaturedProducts = async () => {
  const products = await db.product.findMany({
    where: {
      featured: true,
    },
    // select: {
    //   name: true,
    // },
  })
  return products
}
// extra check = cannot be undefined
export const fetchAllProducts = ({ search = '' }: { search: string }) => {
  return db.product.findMany({
    where: {
      // look in two places
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export const fetchSingleProduct = async (productId: string) => {
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
  })
  if (!product) {
    // if we cannot find then we redirect to products
    redirect('/products')
  }
  return product
}
