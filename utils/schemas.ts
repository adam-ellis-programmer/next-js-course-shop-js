import { z, ZodSchema } from 'zod'

// second argument is the message
export const productSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'name must be at least 2 characters.',
    })
    .max(100, {
      message: 'name must be less than 100 characters.',
    }),
  company: z.string(),
  featured: z.coerce.boolean(),

  price: z.coerce.number().int().min(0, {
    message: 'price must be a positive number.',
  }),

  description: z.string().refine(
    (description) => {
      const wordCount = description.split(' ').length
      return wordCount >= 10 && wordCount <= 1000
    },
    // falsy triggers the error
    {
      message: 'description must be between 10 and 1000 words.',
    }
  ),
})

// if the data obj is three strings and a boolean
// then the <T> will safley return the same data
// T we do not know what the schema is going to be
export function validateWithZodSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
  // T returning the Type
): T {
  const result = schema.safeParse(data)
  //
  if (!result.success) {
    const errors = result.error.errors.map((error) => error.message)
    throw new Error(errors.join(', '))
  }
  console.log('RESULT')
  return result.data
}
  
// check what z.object fucntionality does
export const imageSchema = z.object({
  image: validateImageFile(),
})

// if this returns false then it runs the error
function validateImageFile() {
  const maxUploadSize = 1024 * 1024 // calcs in bytes
  const acceptedFileTypes = ['image/']
  return z
    .instanceof(File)
    .refine((file) => {
      return !file || file.size <= maxUploadSize
    }, `File size must be less than 1 MB`)
    .refine((file) => {
      return (
        !file || acceptedFileTypes.some((type) => file.type.startsWith(type))
      )
    }, 'File must be an image')
}
