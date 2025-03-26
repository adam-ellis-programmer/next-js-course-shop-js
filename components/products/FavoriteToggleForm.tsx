'use client'

import { usePathname } from 'next/navigation'
import FormContainer from '../form/FormContainer'
import { toggleFavoriteAction } from '@/utils/actions'
import { CardSubmitButton } from '../form/Buttons'

type FavoriteToggleFormProps = {
  productId: string
  favoriteId: string | null
}

function FavoriteToggleForm({
  productId,
  favoriteId,
}: FavoriteToggleFormProps) {
  const pathname = usePathname()

  // bind to the action
  const toggleAction = toggleFavoriteAction.bind(null, {
    productId,
    favoriteId,
    pathname,
  })
  return (
    <FormContainer action={toggleAction}>
      {/* can be string or */}
      <CardSubmitButton isFavorite={favoriteId ? true : false} />
    </FormContainer>
  )
}
export default FavoriteToggleForm
