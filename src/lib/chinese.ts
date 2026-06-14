const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** Convert 0-199 to traditional Chinese numerals (Bible-style: 一, 十, 十一, 二十, 一百一十九). */
export function toChineseNumber(n: number): string {
  if (n < 0 || n > 199 || !Number.isInteger(n)) return String(n)
  if (n < 10) return DIGITS[n]
  if (n < 20) return n === 10 ? '十' : '十' + DIGITS[n - 10]
  if (n < 100) {
    const tens = Math.floor(n / 10)
    const ones = n % 10
    return DIGITS[tens] + '十' + (ones === 0 ? '' : DIGITS[ones])
  }
  const remainder = n - 100
  if (remainder === 0) return '一百'
  if (remainder < 10) return '一百零' + DIGITS[remainder]
  if (remainder < 20) return remainder === 10 ? '一百一十' : '一百一十' + DIGITS[remainder - 10]
  const tens = Math.floor(remainder / 10)
  const ones = remainder % 10
  return '一百' + DIGITS[tens] + '十' + (ones === 0 ? '' : DIGITS[ones])
}

/** Positional Chinese digits (compact ref labels): 21 → 二一, 119 → 一一九. */
export function toChineseDigits(n: number): string {
  return String(n)
    .split('')
    .map((d) => DIGITS[Number(d)])
    .join('')
}

/** Bible chapter unit — 詩篇用「篇」，其他用「章」. */
export function chapterUnit(bookNo: number): string {
  return bookNo === 19 ? '篇' : '章'
}
