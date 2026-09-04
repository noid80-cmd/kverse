import UIKit
import Capacitor
import PreferencesPlugin
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // CapacitorBridge.registerPlugins()는 콜드 스타트 시 loadView() 안에서
        // 한 번만 NSClassFromString("PreferencesPlugin")으로 플러그인을 찾는다.
        // 이 시점에 SPM으로 별도 링크된 PreferencesPlugin 모듈이 dyld에 아직
        // 바인딩되지 않으면 등록에 실패해 "Preferences plugin is not implemented"
        // 에러가 앱 세션 내내 복구되지 않는다. 뷰 컨트롤러가 로드되기 전에
        // 클래스를 미리 참조해 dyld가 먼저 로드하도록 강제한다.
        _ = PreferencesPlugin.self
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // OAuth 콜백이 밖에서 들어오면 여기서 받아 웹뷰로 넘긴다. 아래 주석 참고.
        if handleAuthCallback(url) { return true }

        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // kpick://auth-callback?code=... 을 받아 웹뷰의 /auth/callback 으로 넘긴다.
    //
    // 정상 경로에서는 여기까지 오지 않는다. GoogleAuthInterceptorPlugin /
    // AppleAuthInterceptorPlugin이 로그인 이동을 ASWebAuthenticationSession으로
    // 가로채고, 그 세션이 kpick 스킴을 직접 잡아서 앱으로 돌려주기 때문이다.
    //
    // 그런데 애플 로그인에서 인터셉터가 걸리지 않고 사파리로 넘어가는 사례가
    // 실기기에서 확인됐다(1.0.3, "'Krookie'에서 이 페이지를 열겠습니까?" 대화상자가
    // 뜨는데, ASWebAuthenticationSession이라면 그 대화상자 자체가 안 뜬다).
    // 그 경우 사파리가 받은 인증 코드가 앱으로 들어와도 아무도 받지 않아서
    // 로그인 화면으로 되돌아간다.
    //
    // 인터셉터가 왜 안 걸리는지와 별개로, 코드가 앱에 도착하기만 하면 로그인은
    // 성립한다. code_verifier가 웹뷰 저장소에 그대로 남아 있기 때문이다.
    // 그래서 원인을 못 좁힌 상태에서도 통하는 복구 경로를 둔다.
    private func handleAuthCallback(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "kpick" else { return false }
        let isAuthCallback = (url.host == "auth-callback")
            || url.absoluteString.contains("auth-callback")
        guard isAuthCallback else { return false }

        var components = URLComponents()
        components.scheme = "https"
        components.host = "kpick.app"
        components.path = "/auth/callback"
        components.query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.query
        guard let finalURL = components.url else { return false }

        guard let webView = findBridgeWebView() else { return false }
        DispatchQueue.main.async {
            webView.load(URLRequest(url: finalURL))
        }
        return true
    }

    // 루트가 항상 CAPBridgeViewController인 건 아니라 한 겹 안까지 찾아본다.
    private func findBridgeWebView() -> WKWebView? {
        guard let root = window?.rootViewController else { return nil }
        if let bridgeVC = root as? CAPBridgeViewController { return bridgeVC.bridge?.webView }
        for child in root.children {
            if let bridgeVC = child as? CAPBridgeViewController { return bridgeVC.bridge?.webView }
        }
        if let presented = root.presentedViewController as? CAPBridgeViewController {
            return presented.bridge?.webView
        }
        return nil
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // APNs 등록 결과를 Capacitor로 넘긴다. 이게 없으면 FirebaseMessaging이
    // 기기 토큰을 영영 못 받아 getToken()이 멈춘 것처럼 보인다.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
