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

/// In landscape, holds the app inside the side safe areas (the notch). In portrait the app
/// stays full-bleed; a status column down one edge (iPhone Duo) reaches the web as
/// env(safe-area-inset-right), and the web keeps only its top row clear of it.
/// The strips beside the app take the page's own background.
final class SafeSidesViewController: UIViewController {
    private let bridge: CAPBridgeViewController
    private var background: NSKeyValueObservation?
    private var full: [NSLayoutConstraint] = []
    private var safe: [NSLayoutConstraint] = []

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
        ])
        full = [app.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                app.trailingAnchor.constraint(equalTo: view.trailingAnchor)]
        safe = [app.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
                app.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)]
        NSLayoutConstraint.activate(full)
        bridge.didMove(toParent: self)
        background = bridge.webView?.observe(\.underPageBackgroundColor, options: [.initial, .new]) { [weak self] webView, _ in
            self?.view.backgroundColor = webView.underPageBackgroundColor
        }
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        let landscape = view.bounds.width > view.bounds.height
        if landscape != safe.first!.isActive {
            NSLayoutConstraint.deactivate(landscape ? full : safe)
            NSLayoutConstraint.activate(landscape ? safe : full)
        }
    }

    override var childForStatusBarStyle: UIViewController? { bridge }
    override var childForStatusBarHidden: UIViewController? { bridge }
    override var childForHomeIndicatorAutoHidden: UIViewController? { bridge }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { bridge.supportedInterfaceOrientations }
}
