import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SafeSidesViewController(JournalViewController())
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The bridge, with Flyleaf's one local plugin registered on it.
class JournalViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrintPlugin())
    }
}

/// window.print() does nothing in WKWebView, so the printed journal asks the
/// system print sheet for the page on screen (src/native/device.ts printPage).
/// The sheet carries Save to Files as PDF, and the page's @media print rules apply.
@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "Print"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    @objc func print(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else { return call.reject("No page to print") }
            let info = UIPrintInfo(dictionary: nil)
            info.jobName = call.getString("name") ?? "Flyleaf"
            info.outputType = .general
            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()
            controller.present(animated: true) { _, _, error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }
}

/// Holds the app inside the screen's side safe areas (a status column down one edge,
/// or the notch in landscape). Top and bottom stay full-bleed: the web pads those itself
/// with env(safe-area-inset-*). The strips beside the app take the page's own background.
final class SafeSidesViewController: UIViewController {
    private let bridge: CAPBridgeViewController
    private var background: NSKeyValueObservation?

    init(_ bridge: CAPBridgeViewController) {
        self.bridge = bridge
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        addChild(bridge)
        let app: UIView = bridge.view
        app.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(app)
        NSLayoutConstraint.activate([
            app.topAnchor.constraint(equalTo: view.topAnchor),
            app.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            app.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            app.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
        ])
        bridge.didMove(toParent: self)
        background = bridge.webView?.observe(\.underPageBackgroundColor, options: [.initial, .new]) { [weak self] webView, _ in
            self?.view.backgroundColor = webView.underPageBackgroundColor
        }
    }

    override var childForStatusBarStyle: UIViewController? { bridge }
    override var childForStatusBarHidden: UIViewController? { bridge }
    override var childForHomeIndicatorAutoHidden: UIViewController? { bridge }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { bridge.supportedInterfaceOrientations }
}
