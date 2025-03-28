'use server'
import db from '@/utils/db'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  imageSchema,
  productSchema,
  reviewSchema,
  validateWithZodSchema,
} from '@/utils/schemas'
import { deleteImage, uploadImage } from './supabase'
import { revalidatePath } from 'next/cache'

// const getAuthUser = async () => {
//   const user = await currentUser()
//   if (!user) {
//     throw new Error('You must be logged in to access this route')
//   }
//   return user
// }

const getAuthUser = async () => {
  const user = await currentUser()
  // if no usere redirect
  if (!user) redirect('/')
  return user
}

// middleware but this is an extra check
const getAdminUser = async () => {
  const user = await getAuthUser()
  if (user.id !== process.env.ADMIN_USER_ID) redirect('/')
  return user
}

// we return the message
const renderError = (error: unknown): { message: string } => {
  console.log(error)
  return {
    message: error instanceof Error ? error.message : 'An error occurred',
  }
}

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

export const createProductAction = async (
  prevState: any,
  formData: FormData
): Promise<{ message: string }> => {
  const user = await getAuthUser()
  // if (!user) redirect('/')

  try {
    const rawData = Object.fromEntries(formData)
    const file = formData.get('image') as File
    const validatedFields = validateWithZodSchema(productSchema, rawData)
    const validatedFile = validateWithZodSchema(imageSchema, { image: file })
    console.log('VALIDATED-FIELDS', validatedFields)
    console.log('FILE-VALIDATION-->', validatedFile)
    const fullPath = await uploadImage(validatedFile.image)
    // // we use safe parse and itterate over the array
    // if (!validatedFields.success) {
    //   const errors = validatedFields.error.errors.map((error) => error.message)
    //   console.log('ERRORS-->', validatedFields.error.errors)
    //   console.log('MAPPED==>', errors)
    //   // test with an array of people and pull out names
    //   throw new Error(errors.join(','))
    // }

    await db.product.create({
      data: {
        ...validatedFields,
        image: fullPath,
        clerkId: user.id,
      },
    })

    // return { message: 'product created' }
    // we return a object with a message and value
    // error is unKnown so we have to check
  } catch (error) {
    return renderError(error)
  }
  redirect('/admin/products')
}

// get admin user is extra check
export const fetchAdminProducts = async () => {
  await getAdminUser()
  const products = await db.product.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
  return products
}

// to pass info to our action we can use
// :-- bind method
// :-- hidden input

export const deleteProductAction = async (prevState: { productId: string }) => {
  const { productId } = prevState
  console.log('PREV-STATE:--->', prevState)

  await getAdminUser()

  try {
    const product = await db.product.delete({
      where: {
        id: productId,
      },
    })
    await deleteImage(product.image)
    revalidatePath('/admin/products')
    return { message: 'product removed' }
  } catch (error) {
    return renderError(error)
  }
}

export const fetchAdminProductDetails = async (productId: string) => {
  await getAdminUser()
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
  })
  if (!product) redirect('/admin/products')
  return product
}

export const updateProductAction = async (
  prevState: any,
  formData: FormData
) => {
  await getAdminUser()
  try {
    const productId = formData.get('id') as string
    const rawData = Object.fromEntries(formData)

    // validate all fields in the update
    const validatedFields = validateWithZodSchema(productSchema, rawData)

    await db.product.update({
      where: {
        id: productId,
      },
      data: {
        ...validatedFields,
      },
    })
    revalidatePath(`/admin/products/${productId}/edit`)
    return { message: 'Product updated successfully' }
  } catch (error) {
    return renderError(error)
  }
}

export const updateProductImageAction = async (
  prevState: any,
  formData: FormData
) => {
  await getAuthUser()
  try {
    const image = formData.get('image') as File
    const productId = formData.get('id') as string
    const oldImageUrl = formData.get('url') as string
    console.log('OLD IMAGE--->', oldImageUrl)
    const validatedFile = validateWithZodSchema(imageSchema, { image })
    const fullPath = await uploadImage(validatedFile.image)

    await deleteImage(oldImageUrl)
    await db.product.update({
      where: {
        id: productId,
      },
      data: {
        image: fullPath,
      },
    })
    revalidatePath(`/admin/products/${productId}/edit`)
    return { message: 'Product Image updated successfully' }
  } catch (error) {
    return renderError(error)
  }
}

// is the product in the favorives or not
export const fetchFavoriteId = async ({ productId }: { productId: string }) => {
  const user = await getAuthUser()
  console.log('PRODUCT ID:__>', productId)
  const favorite = await db.favorite.findFirst({
    where: {
      productId,
      clerkId: user.id,
    },
    // for response only select and return id
    select: {
      id: true,
    },
  })
  return favorite?.id || null
}

export const toggleFavoriteAction = async (prevState: {
  productId: string
  favoriteId: string | null
  pathname: string
}) => {
  const user = await getAuthUser()
  const { productId, favoriteId, pathname } = prevState
  try {
    if (favoriteId) {
      await db.favorite.delete({
        where: {
          id: favoriteId,
        },
      })
    } else {
      await db.favorite.create({
        data: {
          productId,
          clerkId: user.id,
        },
      })
    }
    revalidatePath(pathname)
    return { message: favoriteId ? 'Removed from Faves' : 'Added to Faves' }
  } catch (error) {
    return renderError(error)
  }
}

export const fetchUserFavorites = async () => {
  const user = await getAuthUser()
  const favorites = await db.favorite.findMany({
    where: {
      clerkId: user.id,
    },
    // we have the relationship - query favorites
    // and get the actual product
    // as we have connected the models we can:
    include: {
      product: true,
    },
  })
  return favorites
}

export const createReviewAction = async (
  prevState: any,
  formData: FormData
) => {
  const user = await getAuthUser()
  try {
    const rawData = Object.fromEntries(formData)

    const validatedFields = validateWithZodSchema(reviewSchema, rawData)

    await db.review.create({
      data: {
        ...validatedFields,
        clerkId: user.id,
      },
    })
    revalidatePath(`/products/${validatedFields.productId}`)
    return { message: 'Review submitted successfully' }
  } catch (error) {
    return renderError(error)
  }
}

export const fetchProductReviews = async (productId: string) => {
  const reviews = await db.review.findMany({
    where: {
      productId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  return reviews
}
export const fetchProductRating = async (productId: string) => {
  const result = await db.review.groupBy({
    by: ['productId'],
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
    where: {
      productId,
    },
  })

  // empty array if no reviews
  // set default values
  return {
    rating: result[0]?._avg.rating?.toFixed(1) ?? 0,
    count: result[0]?._count.rating ?? 0,
  }
}
export const fetchProductReviewsByUser = async () => {
  const user = await getAuthUser()
  const reviews = await db.review.findMany({
    where: {
      clerkId: user.id,
    },
    // select the fields
    select: {
      id: true,
      rating: true,
      comment: true,
      product: {
        select: {
          image: true,
          name: true,
        },
      },
    },
  })
  return reviews
}
// bind uses the prevState
export const deleteReviewAction = async (prevState: { reviewId: string }) => {
  const { reviewId } = prevState
  const user = await getAuthUser()

  try {
    await db.review.delete({
      where: {
        id: reviewId,
        clerkId: user.id,
      },
    })

    revalidatePath('/reviews')
    return { message: 'Review deleted successfully' }
  } catch (error) {
    return renderError(error)
  }
}

export const findExistingReview = async (userId: string, productId: string) => {
  return db.review.findFirst({
    where: {
      clerkId: userId,
      productId,
    },
  })
}

export const fetchCartItems = async () => {
  const { userId } = auth()

  const cart = await db.cart.findFirst({
    where: {
      clerkId: userId ?? '',
    },
    select: {
      numItemsInCart: true,
    },
  })
  return cart?.numItemsInCart || 0
}

const fetchProduct = async (productId: string) => {
  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
  })

  if (!product) {
    throw new Error('Product not found')
  }
  return product
}

export const fetchOrCreateCart = async () => {}

const updateOrCreateCartItem = async () => {}

export const updateCart = async () => {}

export const addToCartAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser()
  try {
    const productId = formData.get('productId') as string
    const amount = Number(formData.get('amount'))
    await fetchProduct(productId)
    // const cart = await fetchOrCreateCart({ userId: user.id })
    // await updateOrCreateCartItem({ productId, cartId: cart.id, amount })
    // await updateCart(cart)
  } catch (error) {
    return renderError(error)
  }
  redirect('/cart')
}

export const removeCartItemAction = async () => {}

export const updateCartItemAction = async () => {}
