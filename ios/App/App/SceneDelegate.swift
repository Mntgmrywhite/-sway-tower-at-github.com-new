import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = GameViewController()
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

/// The game's root view. The status bar and home indicator are hidden (SystemBars in
/// capacitor.config.ts); the bottom edge also defers to the game, so a tap near the bottom drops
/// a block instead of pulling up the app switcher (a second swipe still goes home).
class GameViewController: CAPBridgeViewController {
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .bottom }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // The game's own plugin (NativePlugin.swift): the review prompt, the store page, Game
        // Center and the share sheet.
        bridge?.registerPluginInstance(NativePlugin())
        restoreSaves()
    }

    /// iOS may purge a web view's localStorage when space runs low. The page mirrors every save
    /// to Preferences (src/storage.ts), so before the page loads, put back any save localStorage
    /// lost: the game then reads it at start-up as usual.
    private func restoreSaves() {
        let group = "CapacitorStorage." // where @capacitor/preferences keeps its keys
        var saves: [String: String] = [:]
        for (key, value) in UserDefaults.standard.dictionaryRepresentation() where key.hasPrefix(group + "sway-stack:") {
            if let value = value as? String { saves[String(key.dropFirst(group.count))] = value }
        }
        guard !saves.isEmpty,
              let data = try? JSONSerialization.data(withJSONObject: saves),
              let json = String(data: data, encoding: .utf8) else { return }
        let source = "(function (s) { try { for (var k in s) if (localStorage.getItem(k) === null) localStorage.setItem(k, s[k]); } catch (e) {} })(\(json));"
        webView?.configuration.userContentController.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
}
