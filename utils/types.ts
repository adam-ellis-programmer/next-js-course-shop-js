export type actionFunction = (
  prevState: any,
  formData: FormData
  // return promis as we are communicating with the database
) => Promise<{ message: string }>

export type CartItem = {
  productId: string
  image: string
  title: string
  price: string
  amount: number
  company: string
}

export type CartState = {
  cartItems: CartItem[]
  numItemsInCart: number
  cartTotal: number
  shipping: number
  tax: number
  orderTotal: number
}
