import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit

// Apple 로그인을 웹 OAuth가 아니라 시스템 시트로 처리한다.
//
// 웹 방식은 appleid.apple.com이 웹뷰 안에서의 로그인을 막기 때문에 반드시
// 브라우저를 한 번 거쳐야 했다. 그 이동을 ASWebAuthenticationSession으로
// 가로채도록 해뒀지만, 인터셉터가 걸리지 않고 사파리로 새는 사례가 실기기에서
// 확인됐다. 그러면 돌아온 인증 코드를 아무도 받지 않아 로그인 화면만 반복된다
// — 신규 가입자와 App Store 심사원이 겪은 게 정확히 이 증상이다.
// (DB에는 auth.users 행만 생기고 세션이 0인 상태로 남는다.)
//
// 여기서는 브라우저도, 커스텀 스킴도, PKCE 왕복도 없다. identity token만
// 받아서 웹으로 넘기고, 웹은 supabase.auth.signInWithIdToken에 그대로 넣는다.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var currentNonce: String?

    @objc func signIn(_ call: CAPPluginCall) {
        // nonce는 원문을 웹으로 돌려주고 Apple에는 해시만 보낸다. Supabase가
        // 토큰 안의 해시와 원문을 대조해 토큰 재사용을 막는다. 원문을 잃어버리면
        // 검증이 불가능해서 로그인이 성립하지 않는다.
        let nonce = Self.randomNonce()
        currentNonce = nonce
        pendingCall = call

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)

        DispatchQueue.main.async {
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    // 32바이트를 뽑아 64글자 표에 매핑한다. 64는 256의 약수라 나머지 연산으로도
    // 치우침이 생기지 않는다.
    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-.")
        var bytes = [UInt8](repeating: 0, count: length)
        guard SecRandomCopyBytes(kSecRandomDefault, length, &bytes) == errSecSuccess else {
            return UUID().uuidString.replacingOccurrences(of: "-", with: "")
        }
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall else { return }
        pendingCall = nil

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8),
              let nonce = currentNonce else {
            call.reject("Apple이 인증 토큰을 주지 않았어요")
            return
        }
        currentNonce = nil

        // 이름과 이메일은 최초 인증 때 딱 한 번만 온다. 여기서 안 받아두면
        // 다시는 받을 수 없어서, 프로필 이름이 영영 비게 된다.
        var fullName = ""
        if let name = credential.fullName {
            fullName = [name.familyName, name.givenName]
                .compactMap { $0 }
                .joined(separator: " ")
                .trimmingCharacters(in: .whitespaces)
        }

        call.resolve([
            "idToken": idToken,
            "nonce": nonce,
            "fullName": fullName,
            "email": credential.email ?? "",
        ])
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        currentNonce = nil

        // 취소는 실패가 아니다. 웹에서 오류 문구를 띄우지 않도록 코드로 구분한다.
        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("사용자가 취소했어요", "CANCELED")
            return
        }
        call.reject(error.localizedDescription)
    }
}
