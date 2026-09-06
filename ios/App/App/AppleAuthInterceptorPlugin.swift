import Foundation
import Capacitor
import AuthenticationServices
import WebKit

// GoogleAuthInterceptorPlugin과 동일한 이유로 필요함 — appleid.apple.com도
// kpick.app이 아닌 top-level 이동이라 기본 정책이 Safari로 던져버린다.
// Apple 로그인만 ASWebAuthenticationSession으로 가로채 처리하고, 완료되면
// kpick://auth-callback 콜백을 https://kpick.app/auth/callback 로 바꿔서
// 앱의 WKWebView에 로드해 기존 /auth/callback 페이지가 이어받게 한다.
// (Apple Guideline 4.8 대응 — Sign in with Apple 추가)
@objc(AppleAuthInterceptorPlugin)
public class AppleAuthInterceptorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleAuthInterceptorPlugin"
    public let jsName = "AppleAuthInterceptor"
    public let pluginMethods: [CAPPluginMethod] = []

    private static let callbackScheme = "kpick"

    private var authSession: ASWebAuthenticationSession?

    public override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        let isTopLevel = navigationAction.targetFrame == nil || navigationAction.targetFrame?.isMainFrame == true
        guard isTopLevel,
              let url = navigationAction.request.url,
              Self.isAppleOAuthAuthorizeRequest(url) else {
            return nil
        }

        startAuthSession(with: url)
        return true
    }

    // Supabase의 signInWithOAuth가 만드는 첫 이동은 appleid.apple.com이 아니라
    // "<project>.supabase.co/auth/v1/authorize?provider=apple&..."이다.
    private static func isAppleOAuthAuthorizeRequest(_ url: URL) -> Bool {
        guard let host = url.host else { return false }
        if host == "appleid.apple.com" { return true }
        guard host == "supabase.co" || host.hasSuffix(".supabase.co") else { return false }
        let queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        return queryItems.contains { $0.name == "provider" && $0.value == "apple" }
    }

    private func startAuthSession(with url: URL) {
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.callbackScheme) { [weak self] callbackURL, error in
            guard let self = self else { return }
            if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                return
            }
            guard let callbackURL = callbackURL else {
                // 조용히 돌아가면 웹뷰는 로그인 화면에 "로그인 중..." 상태로 영원히
                // 멈춘다 — 보는 사람 눈에는 로그인이 그냥 작동하지 않는 앱이다.
                // 원인을 콜백 페이지로 넘겨 화면에 띄운다.
                let reason = error?.localizedDescription ?? "unknown error"
                CAPLog.print("⚡️  AppleAuthInterceptor: no callback URL (\(reason))")
                self.loadCallback(query: "error=native_auth_session&error_description=\(Self.escape(reason))", fragment: nil)
                return
            }
            self.forwardToWebView(callbackURL)
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        authSession = session

        DispatchQueue.main.async {
            session.start()
        }
    }

    private func forwardToWebView(_ callbackURL: URL) {
        let parts = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
        // 실패는 쿼리(?error=)로 올 때도 있고 해시(#error=)로 올 때도 있다.
        // 해시를 버리면 콜백 페이지가 단서 없이 "세션이 안 만들어졌다"고만 말한다.
        loadCallback(query: parts?.query, fragment: parts?.fragment)
    }

    private func loadCallback(query: String?, fragment: String?) {
        var components = URLComponents()
        components.scheme = "https"
        components.host = "kpick.app"
        components.path = "/auth/callback"
        components.query = query
        components.fragment = fragment

        guard let finalURL = components.url else { return }
        DispatchQueue.main.async { [weak self] in
            self?.bridge?.webView?.load(URLRequest(url: finalURL))
        }
    }

    private static func escape(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "unknown"
    }
}

extension AppleAuthInterceptorPlugin: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
