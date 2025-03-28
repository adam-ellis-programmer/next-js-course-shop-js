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

// check if there is a product (used for reliable price)
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

const includeProductClause = {
  cartItems: {
    include: {
      product: true,
    },
  },
}
/**
 *
 */
export const fetchOrCreateCart = async ({
  userId,
  errorOnFailure = false,
}: {
  userId: string
  errorOnFailure?: boolean
}) => {
  let cart = await db.cart.findFirst({
    where: {
      clerkId: userId,
    },
    include: includeProductClause,
  })

  // errorOnFailure stops the creation of a new cart
  // ** defensive programming technique **
  // errorOnFailure used in delete cart funciton
  if (!cart && errorOnFailure) {
    throw new Error('Cart not found')
  }

  // if no cart then create one
  if (!cart) {
    cart = await db.cart.create({
      data: {
        clerkId: userId,
      },
      include: includeProductClause,
    })
  }

  return cart
}

// *****

const updateOrCreateCartItem = async ({
  productId,
  cartId,
  amount,
}: {
  productId: string
  cartId: string
  amount: number
}) => {
  let cartItem = await db.cartItem.findFirst({
    // match both
    where: {
      productId,
      cartId,
    },
  })

  // check and update
  if (cartItem) {
    cartItem = await db.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        // whatever amount + new amout
        amount: cartItem.amount + amount,
      },
    })
  } else {
    cartItem = await db.cartItem.create({
      data: { amount, productId, cartId },
    })
  }
}

// always go back to the database for the data
// not some value from the f/e as more secure
// if we update the price in the d/b we get the most up to date price
// match the cart model
import { Cart } from '@prisma/client'

// just iterating over the items LEFT in the cart
// *** PRISMA RETURNS THE UPDATED ITEM AS THE LAST ONE ***
export const updateCart = async (cart: Cart) => {
  const cartItems = await db.cartItem.findMany({
    where: {
      cartId: cart.id,
    },
    include: {
      product: true, // Include the related product
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  let numItemsInCart = 0
  let cartTotal = 0

  for (const item of cartItems) {
    numItemsInCart += item.amount
    cartTotal += item.amount * item.product.price
  }

  const tax = cart.taxRate * cartTotal
  // if above zero else zero
  const shipping = cartTotal ? cart.shipping : 0
  const orderTotal = cartTotal + tax + shipping

  const currentCart = await db.cart.update({
    where: {
      id: cart.id,
    },

    data: {
      numItemsInCart,
      cartTotal,
      tax,
      orderTotal,
    },
    include: includeProductClause,
  })
  // return currentCart
  // ** bug fix **
  return { currentCart, cartItems }
}

/**
 * each user has one cart
 * after the purchase we delete the whole cart
 * we check if there is a cart or we create a new one from scratch
 */
export const addToCartAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser()
  try {
    const productId = formData.get('productId') as string
    const amount = Number(formData.get('amount'))
    // fetch (check) product to use price from the database
    await fetchProduct(productId)
    // 1: fetch cart
    const cart = await fetchOrCreateCart({ userId: user.id })
    // 2: update that cart
    await updateOrCreateCartItem({ productId, cartId: cart.id, amount })
    // 3:
    await updateCart(cart)
  } catch (error) {
    return renderError(error)
  }
  redirect('/cart')
}

export const removeCartItemAction = async (
  prevState: any,
  formData: FormData
) => {
  const user = await getAuthUser()
  try {
    const cartItemId = formData.get('id') as string

    const cart = await fetchOrCreateCart({
      userId: user.id,
      // used a a safe guard to not create a new cart
      errorOnFailure: true,
    })

    await db.cartItem.delete({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    })

    // call update cart to update the values for the server to show in the dom
    // updateCart: --> item now removed from the cart
    await updateCart(cart)
    revalidatePath('/cart')
    return { message: 'Item removed from cart' }
  } catch (error) {
    return renderError(error)
  }
}

// not called in the Form container
export const updateCartItemAction = async ({
  amount,
  cartItemId,
}: {
  amount: number
  cartItemId: string
}) => {
  const user = await getAuthUser()

  try {
    const cart = await fetchOrCreateCart({
      userId: user.id,
      // extra check so we do not create a new cart (edge case)
      errorOnFailure: true,
    })

    await db.cartItem.update({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      data: {
        amount,
      },
    })
    // jsut updates the latest values
    await updateCart(cart)
    revalidatePath('/cart')
    return { message: 'cart updated' }
  } catch (error) {
    return renderError(error)
  }
}

export const createOrderAction = async (prevState: any, formData: FormData) => {
  return { message: 'order created' }
}
