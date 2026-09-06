import UIKit
import Capacitor

// 앱 타겟에 직접 넣은 플러그인은 저절로 등록되지 않는다.
//
// capacitor.config.json의 packageClassList는 npm 패키지로 설치한 플러그인용이고
// `cap sync`가 매번 다시 쓴다 — 거기에 손으로 넣어봐야 다음 sync에 사라진다.
// 등록이 안 되면 shouldOverrideLoad도 호출되지 않고, JS에서 부르는
// Capacitor.Plugins.AppleSignIn도 존재하지 않는다. 둘 다 오류 없이 조용히
// 아무 일도 일어나지 않아서, Apple 로그인이 인터셉터를 건너뛰고 사파리로
// 새던 원인이 여기였던 것으로 보인다.
//
// 그래서 등록을 코드로 못박는다. 스토리보드의 루트 뷰 컨트롤러가 이 클래스다.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
        bridge?.registerPluginInstance(AppleAuthInterceptorPlugin())
        bridge?.registerPluginInstance(GoogleAuthInterceptorPlugin())
    }
}
