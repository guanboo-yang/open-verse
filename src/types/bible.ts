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
