import Foundation
import Capacitor
import AuthenticationServices
import WebKit

// Capacitor의 기본 정책(WebViewDelegationHandler.decidePolicyFor)은 앱의 서버 도메인이
// 아닌 top-level 이동을 전부 UIApplication.shared.open()으로 시스템 Safari에 던진다.
// accounts.google.com은 kpick.app이 아니므로 그 규칙에 걸려 로그인 시도할 때마다
// Safari가 열렸다 — Google도 임베디드 WKWebView에서의 로그인을 막기 때문에(disallowed_useragent)
// 원래도 WKWebView 안에서는 정상 동작하지 않는다.
//
// CAPPlugin.shouldOverrideLoad(_:)는 Capacitor가 공식 제공하는 네비게이션 가로채기
// 훅으로, 여기서 true를 반환하면 Safari로 던지기 전에 우리가 먼저 가로챌 수 있다.
// Google 로그인 단계만 ASWebAuthenticationSession(시스템이 공식 지원하는 인증 전용
// 브라우저)으로 처리하고, 완료되면 kpick://auth-callback 콜백을 그대로
// https://kpick.app/auth/callback 로 바꿔서 앱의 WKWebView에 로드해 기존
// /auth/callback 페이지의 exchangeCodeForSession 로직이 이어받게 한다.
@objc(GoogleAuthInterceptorPlugin)
public class GoogleAuthInterceptorPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleAuthInterceptorPlugin"
    public let jsName = "GoogleAuthInterceptor"
    public let pluginMethods: [CAPPluginMethod] = []

    private static let callbackScheme = "kpick"

    private var authSession: ASWebAuthenticationSession?

    public override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        let isTopLevel = navigationAction.targetFrame == nil || navigationAction.targetFrame?.isMainFrame == true
        guard isTopLevel,
              let url = navigationAction.request.url,
              Self.isGoogleOAuthAuthorizeRequest(url) else {
            return nil
        }

        startAuthSession(with: url)
        return true
    }

    // Supabase의 signInWithOAuth가 만드는 첫 이동은 accounts.google.com이 아니라
    // "<project>.supabase.co/auth/v1/authorize?provider=google&..."이다(Supabase가
    // 서버에서 Google로 다시 리다이렉트). 같은 supabase.co 도메인을 카카오 등 다른
    // provider도 함께 쓰므로, provider=google 쿼리로 구글 로그인만 정확히 골라낸다.
    private static func isGoogleOAuthAuthorizeRequest(_ url: URL) -> Bool {
        guard let host = url.host else { return false }
        if host == "accounts.google.com" { return true }
        guard host == "supabase.co" || host.hasSuffix(".supabase.co") else { return false }
        let queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        return queryItems.contains { $0.name == "provider" && $0.value == "google" }
    }

    private func startAuthSession(with url: URL) {
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.callbackScheme) { [weak self] callbackURL, error in
            guard let self = self else { return }
            if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                return
            }
            guard let callbackURL = callbackURL else {
                CAPLog.print("⚡️  GoogleAuthInterceptor: no callback URL (\(error?.localizedDescription ?? "unknown error"))")
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

    // 콜백(kpick://auth-callback?code=...)의 쿼리를 그대로 https://kpick.app/auth/callback
    // 로 옮겨서 웹쪽 /auth/callback 페이지가 지금까지 하던 처리(exchangeCodeForSession)를
    // 그대로 이어받게 한다. code 외에 role 등 다른 쿼리 파라미터가 있어도 통째로 전달된다.
    private func forwardToWebView(_ callbackURL: URL) {
        var components = URLComponents()
        components.scheme = "https"
        components.host = "kpick.app"
        components.path = "/auth/callback"
        components.query = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.query

        guard let finalURL = components.url else { return }
        DispatchQueue.main.async { [weak self] in
            self?.bridge?.webView?.load(URLRequest(url: finalURL))
        }
    }
}

extension GoogleAuthInterceptorPlugin: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
