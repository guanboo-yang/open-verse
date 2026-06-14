export interface Note {
  n: number
  pos: number
}

export interface Verse {
  verse: number
  text: string
  segments?: string[]
  notes?: Note[]
}

export interface Chapter {
  chapterNo: number
  verses: Verse[]
}

export interface Book {
  bookNo: number
  name: string
  chapters: Chapter[]
}

export interface Bible {
  name: string
  lang: string
  source: string
  books: Book[]
}

export interface OutlineAnchor {
  chapter: number
  verse?: number
  segment?: number
}

export interface OutlineEntry {
  level: number
  marker: string
  title: string
  range?: string
  /** A 續 continuation heading repeated at a chapter top. */
  continued?: boolean
  anchor: OutlineAnchor
}

export interface BookOutline {
  bookNo: number
  name: string
  outline: OutlineEntry[]
}

export interface Outline {
  name: string
  lang: string
  books: BookOutline[]
}
