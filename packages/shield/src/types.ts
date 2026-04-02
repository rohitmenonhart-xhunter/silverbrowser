export interface ShieldStatus {
  enabled: boolean
  dohEnabled: boolean    // DNS-over-HTTPS
  proxyEnabled: boolean  // SOCKS5 proxy
  ip: string             // Current visible IP
  location: string       // Country/city
  latency: number        // ms
}
