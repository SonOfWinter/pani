const format = 'pani-backup'
const version = 1
const iterations = 600_000
const maxPlaintext = 4 * 1024 * 1024
export const maxEnvelopeLength = Math.ceil((maxPlaintext + 16) / 3) * 4 + 512

interface Header {
  format: typeof format
  version: typeof version
  kdf: 'PBKDF2-SHA-256'
  iterations: typeof iterations
  algorithm: 'AES-GCM-256'
  salt: string
  iv: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

function base64(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return btoa(binary)
}

function bytes(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== 'string' || value.length > Math.ceil(maximum / 3) * 4) {
    throw new Error('Format de sauvegarde invalide.')
  }
  const result = Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  if (result.length < minimum || result.length > maximum || base64(result) !== value) {
    throw new Error('Format de sauvegarde invalide.')
  }
  return result
}

function createHeader(salt: Uint8Array, iv: Uint8Array): Header {
  return {
    format,
    version,
    kdf: 'PBKDF2-SHA-256',
    iterations,
    algorithm: 'AES-GCM-256',
    salt: base64(salt),
    iv: base64(iv),
  }
}

async function keyFor(phrase: string, salt: Uint8Array<ArrayBuffer>, usage: KeyUsage) {
  if (!phrase.trim() || phrase.length > 1024) throw new Error('Phrase de récupération invalide.')
  const input = await crypto.subtle.importKey('raw', encoder.encode(phrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    input,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  )
}

export async function encryptBackup(payload: unknown, phrase: string) {
  const source = encoder.encode(JSON.stringify(payload))
  if (source.length > maxPlaintext) throw new Error('La liste est trop volumineuse pour cette sauvegarde.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const header = createHeader(salt, iv)
  const key = await keyFor(phrase, salt, 'encrypt')
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify(header)) },
    key,
    source,
  )
  return JSON.stringify({ ...header, ciphertext: base64(new Uint8Array(encrypted)) })
}

function parseEnvelope(text: string) {
  if (text.length > maxEnvelopeLength) throw new Error('La sauvegarde est trop volumineuse.')
  const data: unknown = JSON.parse(text)
  if (typeof data !== 'object' || !data || Array.isArray(data)) throw new Error('Format de sauvegarde invalide.')
  const value = data as Record<string, unknown>
  if (Object.keys(value).length !== 8 || value.format !== format || value.version !== version ||
      value.kdf !== 'PBKDF2-SHA-256' || value.algorithm !== 'AES-GCM-256' ||
      value.iterations !== iterations) {
    throw new Error('Format de sauvegarde non pris en charge.')
  }
  const salt = bytes(value.salt, 16, 16)
  const iv = bytes(value.iv, 12, 12)
  const ciphertext = bytes(value.ciphertext, 16, maxPlaintext + 16)
  return { salt, iv, ciphertext, header: createHeader(salt, iv) }
}

export async function decryptBackup(text: string, phrase: string): Promise<unknown> {
  let parsed: ReturnType<typeof parseEnvelope>
  try {
    parsed = parseEnvelope(text)
  } catch {
    throw new Error('Ce format de sauvegarde est invalide ou non pris en charge.')
  }
  const { salt, iv, header, ciphertext } = parsed
  const key = await keyFor(phrase, salt, 'decrypt')
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify(header)) },
      key,
      ciphertext,
    )
    return JSON.parse(decoder.decode(decrypted)) as unknown
  } catch {
    throw new Error('Phrase incorrecte ou sauvegarde endommagée.')
  }
}
