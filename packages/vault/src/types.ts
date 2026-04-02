export interface SavedCredential {
  id: string
  domain: string
  username: string
  password: string  // encrypted
  url: string
  createdAt: number
  lastUsed: number
}

export interface SafeFile {
  id: string
  name: string      // original filename (encrypted in storage)
  mimeType: string
  size: number
  createdAt: number
  // actual content stored as separate encrypted file
}
