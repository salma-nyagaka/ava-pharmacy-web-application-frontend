import { useEffect, useState } from 'react'
import { categoryData } from '../data/categories'
import { fetchNavCategories, NavCategory } from '../services/productService'

export function useCategories(): NavCategory[] {
  const [categories, setCategories] = useState<NavCategory[]>(() =>
    categoryData.map((c) => ({
      id: 0,
      name: c.name,
      slug: c.slug,
      path: c.path,
      subcategories: c.subcategories,
    }))
  )

  useEffect(() => {
    fetchNavCategories().then((data) => {
      if (data.length > 0) setCategories(data)
    })
  }, [])

  return categories
}
