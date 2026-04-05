const MD5_SHIFTS = [
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
] as const

const MD5_CONSTANTS = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0)

function leftRotate(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}

function toHexLE(value: number): string {
  return [
    value & 0xFF,
    (value >>> 8) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 24) & 0xFF,
  ]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

function appendMd5Padding(input: Uint8Array): Uint8Array {
  const bitLength = input.length * 8
  const paddedLength = (((input.length + 8) >>> 6) + 1) * 64
  const output = new Uint8Array(paddedLength)

  output.set(input)
  output[input.length] = 0x80

  const lowBits = bitLength >>> 0
  const highBits = Math.floor(bitLength / 0x100000000) >>> 0
  const tail = paddedLength - 8

  output[tail] = lowBits & 0xFF
  output[tail + 1] = (lowBits >>> 8) & 0xFF
  output[tail + 2] = (lowBits >>> 16) & 0xFF
  output[tail + 3] = (lowBits >>> 24) & 0xFF
  output[tail + 4] = highBits & 0xFF
  output[tail + 5] = (highBits >>> 8) & 0xFF
  output[tail + 6] = (highBits >>> 16) & 0xFF
  output[tail + 7] = (highBits >>> 24) & 0xFF

  return output
}

export function md5Hex(input: string): string {
  const bytes = appendMd5Padding(new TextEncoder().encode(input))

  let a0 = 0x67452301
  let b0 = 0xEFCDAB89
  let c0 = 0x98BADCFE
  let d0 = 0x10325476

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Uint32Array(16)

    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4
      words[index] = (
        bytes[base]
        | (bytes[base + 1] << 8)
        | (bytes[base + 2] << 16)
        | (bytes[base + 3] << 24)
      ) >>> 0
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f = 0
      let g = 0

      if (index < 16) {
        f = (b & c) | (~b & d)
        g = index
      }
      else if (index < 32) {
        f = (d & b) | (~d & c)
        g = (5 * index + 1) % 16
      }
      else if (index < 48) {
        f = b ^ c ^ d
        g = (3 * index + 5) % 16
      }
      else {
        f = c ^ (b | ~d)
        g = (7 * index) % 16
      }

      const temp = d
      d = c
      c = b

      const sum = (a + f + MD5_CONSTANTS[index]! + words[g]!) >>> 0
      b = (b + leftRotate(sum, MD5_SHIFTS[index]!)) >>> 0
      a = temp
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return `${toHexLE(a0)}${toHexLE(b0)}${toHexLE(c0)}${toHexLE(d0)}`
}
