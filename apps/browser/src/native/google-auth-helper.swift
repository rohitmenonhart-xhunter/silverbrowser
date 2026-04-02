import Cocoa
import WebKit

// Tiny macOS app: opens Google sign-in in a real WKWebView (Safari engine)
// Google trusts WebKit. After sign-in, dumps cookies to stdout as JSON.

class AuthWindowDelegate: NSObject, NSWindowDelegate {
    func windowWillClose(_ notification: Notification) {
        NSApplication.shared.terminate(nil)
    }
}

class AuthViewController: NSObject, WKNavigationDelegate {
    var webView: WKWebView!
    var window: NSWindow!
    var targetURL: String
    var returnURL: String
    
    init(targetURL: String, returnURL: String) {
        self.targetURL = targetURL
        self.returnURL = returnURL
        super.init()
    }
    
    func start() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = WKWebsiteDataStore.default()
        
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 460, height: 640), configuration: config)
        webView.navigationDelegate = self
        webView.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
        
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 460, height: 640),
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Sign in with Google"
        window.contentView = webView
        window.center()
        window.delegate = AuthWindowDelegate()
        window.makeKeyAndOrderFront(nil)
        
        if let url = URL(string: targetURL) {
            webView.load(URLRequest(url: url))
        }
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Check if we've been redirected back (sign-in complete)
        guard let url = webView.url?.absoluteString else { return }
        
        // If we're no longer on accounts.google.com, sign-in succeeded
        if !url.contains("accounts.google.com") && url != targetURL {
            // Extract all cookies
            webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
                var cookieList: [[String: String]] = []
                for cookie in cookies {
                    if cookie.domain.contains("google") || cookie.domain.contains(self.getDomain(from: self.returnURL)) {
                        cookieList.append([
                            "name": cookie.name,
                            "value": cookie.value,
                            "domain": cookie.domain,
                            "path": cookie.path,
                            "secure": cookie.isSecure ? "true" : "false",
                            "httpOnly": cookie.isHTTPOnly ? "true" : "false",
                        ])
                    }
                }
                
                // Output cookies as JSON to stdout
                if let data = try? JSONSerialization.data(withJSONObject: cookieList),
                   let json = String(data: data, encoding: .utf8) {
                    print("__COOKIES__\(json)__END__")
                    fflush(stdout)
                }
                
                // Close after brief delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    NSApplication.shared.terminate(nil)
                }
            }
        }
    }
    
    func getDomain(from urlString: String) -> String {
        if let url = URL(string: urlString) {
            return url.host ?? ""
        }
        return ""
    }
}

// Main
let app = NSApplication.shared
app.setActivationPolicy(.regular)

let args = CommandLine.arguments
let targetURL = args.count > 1 ? args[1] : "https://accounts.google.com/ServiceLogin"
let returnURL = args.count > 2 ? args[2] : "https://www.google.com/"

let controller = AuthViewController(targetURL: targetURL, returnURL: returnURL)
controller.start()

app.activate(ignoringOtherApps: true)
app.run()
