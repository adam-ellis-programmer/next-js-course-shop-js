'use server'
import db from '@/utils/db'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  imageSchema,
  productSchema,
  validateWithZodSchema,
} from '@/utils/schemas'
import { uploadImage } from './supabase'

const getAuthUser = async () => {
  const user = await currentUser()
  if (!user) {
    throw new Error('You must be logged in to access this route')
  }
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
