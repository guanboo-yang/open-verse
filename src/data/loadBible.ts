import { useEffect, useState } from 'react'
import type { Bible, Chapter } from '../types/bible'

let cached: Bible | null = null
let pending: Promise<Bible> | null = null

export function useBible(): { data: Bible | null; error: string | null } {
  const [data, setData] = useState<Bible | null>(cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cached) return
    if (!pending) {
      pending = fetch(`${import.meta.env.BASE_URL}verse.json`).then((r) => {
        if (!r.ok) throw new Error(`verse.json ${r.status}`)
        return r.json() as Promise<Bible>
      })
    }
    pending
      .then((d) => {
        cached = d
        setData(d)
      })
      .catch((e) => setError(String(e)))
  }, [])

  return { data, error }
}

export function findChapter(
  bible: Bible | null,
  bookNo: number,
  chapterNo: number,
): Chapter | null {
  if (!bible) return null
  const book = bible.books.find((b) => b.bookNo === bookNo)
  if (!book) return null
  return book.chapters.find((c) => c.chapterNo === chapterNo) ?? null
}
