import {
  FavouriteItem,
  addFavourite,
  getFavouriteCount,
  isFavourite,
  loadFavourites,
  removeFavourite,
  subscribeFavourites,
  toggleFavourite,
} from '../data/favourites'
import { toApiResult } from './mockApi'

export const favouritesService = {
  list: async () => toApiResult(loadFavourites()),
  add: async (item: FavouriteItem) => toApiResult(addFavourite(item)),
  remove: async (id: number) => toApiResult(removeFavourite(id)),
  toggle: async (item: FavouriteItem) => toApiResult(toggleFavourite(item)),
  isFavourite: (id: number) => isFavourite(id),
  count: async () => toApiResult(getFavouriteCount()),
  subscribe: (listener: () => void) => subscribeFavourites(listener),
}
